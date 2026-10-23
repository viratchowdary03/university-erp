import crypto from "crypto";
import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { ACCOUNT_STATUS } from "../../utils/constants.js";
import { signAccessToken } from "../../utils/generateToken.js";
import { sendOtpEmail, sendResetEmail } from "../../utils/sendEmail.js";
import { User } from "../users/user.model.js";

const OTP_FIELDS = "+password +otpHash +otpExpiresAt +otpAttempts +otpLastSentAt";

// A fixed hash so a login for an unknown email takes as long as a real one
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

const hashOtp = (email, otp) =>
  crypto.createHmac("sha256", env.jwtAccessSecret).update(`${email}:${otp}`).digest("hex");

const safeEqual = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const findForOtp = (email) => User.findOne({ email }).select(OTP_FIELDS);

// Creates a fresh code, stores its hash and emails the plain code once
async function issueOtp(user) {
  const now = Date.now();
  const cooldownMs = env.otp.resendCooldownSeconds * 1000;
  if (user.otpLastSentAt && now - user.otpLastSentAt.getTime() < cooldownMs) {
    const wait = Math.ceil((cooldownMs - (now - user.otpLastSentAt.getTime())) / 1000);
    throw new ApiError(429, `Please wait ${wait} seconds before requesting another code`);
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  user.otpHash = hashOtp(user.email, otp);
  user.otpExpiresAt = new Date(now + env.otp.ttlMinutes * 60 * 1000);
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date(now);
  await user.save();

  await sendOtpEmail({ to: user.email, name: user.name, otp });
}

export async function register(data) {
  const email = data.email.toLowerCase();
  let user = await findForOtp(email);

  if (user?.isEmailVerified) {
    throw new ApiError(409, "An account with this email already exists. Please sign in");
  }
  if (!user) user = new User({ email });

  // Everything except the common fields is role-specific profile information
  const { name, phone, password, role, school, department, ...profile } = data;
  delete profile.email;

  // An unverified record belongs to nobody yet, so it can be re-used for a new attempt
  user.name = name;
  user.phone = phone;
  user.password = password;
  user.role = role; // the role is only a request until an approver accepts it
  user.school = school;
  user.department = department;
  user.profile = profile;
  user.status = ACCOUNT_STATUS.PENDING_VERIFICATION;
  user.isEmailVerified = false;

  await issueOtp(user);
  return { email };
}

export async function resendOtp(email) {
  const user = await findForOtp(email.toLowerCase());
  // Same answer whether or not the account exists, so emails cannot be guessed
  if (!user || user.isEmailVerified) return;
  await issueOtp(user);
}

export async function verifyOtp(email, otp) {
  email = email.toLowerCase();
  const user = await findForOtp(email);

  if (!user || !user.otpHash) throw new ApiError(400, "Invalid or expired code");
  if (user.isEmailVerified) throw new ApiError(400, "This email is already verified. Please sign in");
  if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new ApiError(400, "This code has expired. Request a new one");
  }
  if (user.otpAttempts >= env.otp.maxAttempts) {
    throw new ApiError(429, "Too many wrong attempts. Request a new code");
  }

  if (!safeEqual(user.otpHash, hashOtp(email, otp))) {
    user.otpAttempts += 1;
    await user.save();
    throw new ApiError(400, "Incorrect code");
  }

  user.isEmailVerified = true;
  user.otpHash = undefined;
  user.otpExpiresAt = undefined;
  user.otpAttempts = 0;
  // Nobody becomes active by registering. An approver has to accept the request first.
  user.status = ACCOUNT_STATUS.PENDING_APPROVAL;
  await user.save();

  return { status: user.status, role: user.role };
}

export async function login(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !ok) throw new ApiError(401, "Invalid email or password");

  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email first. Register again to get a new code");
  }
  if (user.status === ACCOUNT_STATUS.PENDING_APPROVAL) {
    throw new ApiError(403, "Your account is waiting for approval by the university admin");
  }
  if (user.status !== ACCOUNT_STATUS.ACTIVE) {
    throw new ApiError(403, "This account is not active. Contact the university office");
  }

  user.lastLoginAt = new Date();
  await user.save();
  return { user: user.toSafeJSON(), accessToken: signAccessToken(user) };
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select("+password");
  if (!user || !(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, "Current password is incorrect");
  }
  if (currentPassword === newPassword) {
    throw new ApiError(400, "New password must be different from the current one");
  }
  user.password = newPassword;
  await user.save();
}

// ---------- forgot / reset password ----------
const RESET_FIELDS = "+password +resetHash +resetExpiresAt +resetAttempts +resetLastSentAt";

// Always answers the same way, so nobody can find out which emails have accounts
export async function forgotPassword(email) {
  email = email.toLowerCase();
  const user = await User.findOne({ email }).select(RESET_FIELDS);
  if (!user || !user.isEmailVerified || user.status === ACCOUNT_STATUS.SUSPENDED) return;

  const now = Date.now();
  const cooldownMs = env.otp.resendCooldownSeconds * 1000;
  if (user.resetLastSentAt && now - user.resetLastSentAt.getTime() < cooldownMs) return;

  const code = String(crypto.randomInt(100000, 1000000));
  user.resetHash = hashOtp(`reset:${email}`, code);
  user.resetExpiresAt = new Date(now + env.otp.ttlMinutes * 60 * 1000);
  user.resetAttempts = 0;
  user.resetLastSentAt = new Date(now);
  await user.save();
  await sendResetEmail({ to: user.email, name: user.name, otp: code });
}

export async function resetPassword(email, otp, newPassword) {
  email = email.toLowerCase();
  const user = await User.findOne({ email }).select(RESET_FIELDS);
  if (!user || !user.resetHash || !user.resetExpiresAt || user.resetExpiresAt < new Date()) {
    throw new ApiError(400, "Invalid or expired code");
  }
  if (user.resetAttempts >= env.otp.maxAttempts) throw new ApiError(429, "Too many wrong attempts. Request a new code");
  if (!safeEqual(user.resetHash, hashOtp(`reset:${email}`, otp))) {
    user.resetAttempts += 1;
    await user.save();
    throw new ApiError(400, "Incorrect code");
  }
  user.password = newPassword;
  user.resetHash = undefined;
  user.resetExpiresAt = undefined;
  user.resetAttempts = 0;
  await user.save();
}
