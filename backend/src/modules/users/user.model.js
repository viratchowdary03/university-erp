import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLE_VALUES, ROLES, ACCOUNT_STATUS, ACCOUNT_STATUS_VALUES } from "../../utils/constants.js";

// Extra details collected at registration. Which fields are filled depends on the role.
const profileSchema = new mongoose.Schema(
  {
    employeeId: { type: String, trim: true },
    designation: { type: String, trim: true },
    qualification: { type: String, trim: true },
    specialization: { type: String, trim: true },
    experienceYears: { type: Number, min: 0, max: 60 },
    officeName: { type: String, trim: true },
    reason: { type: String, trim: true, maxlength: 300 }, // why a super admin account is requested
    enrollmentNo: { type: String, trim: true },
    gender: { type: String, enum: ["M", "F"] },
    year: { type: Number, min: 1, max: 5 },
    guardianName: { type: String, trim: true },
    guardianPhone: { type: String, trim: true },
    dateOfBirth: { type: String, trim: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLE_VALUES, default: ROLES.STUDENT },
    school: { type: String, trim: true }, // school code, e.g. "ENG"
    department: { type: String, trim: true }, // program or department name
    profile: { type: profileSchema, default: () => ({}) },
    status: { type: String, enum: ACCOUNT_STATUS_VALUES, default: ACCOUNT_STATUS.PENDING_VERIFICATION },
    isEmailVerified: { type: Boolean, default: false },

    // Who approved or rejected the account, and when
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    decidedAt: { type: Date },

    // One-time code used to verify the email (stored hashed, never in plain text)
    otpHash: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    otpLastSentAt: { type: Date, select: false },

    // One-time code for "forgot password" (hashed, like the verification code)
    resetHash: { type: String, select: false },
    resetExpiresAt: { type: Date, select: false },
    resetAttempts: { type: Number, default: 0, select: false },
    resetLastSentAt: { type: Date, select: false },

    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toSafeJSON = function () {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    school: this.school,
    department: this.department,
    status: this.status,
    profile: this.profile?.toObject ? this.profile.toObject() : this.profile,
  };
};

export const User = mongoose.models.User || mongoose.model("User", userSchema);
