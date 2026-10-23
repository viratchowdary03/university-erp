import { ApiError } from "../../utils/ApiError.js";
import { ACCOUNT_STATUS, ROLES } from "../../utils/constants.js";
import { approvableRoles, canApprove } from "../../utils/permissions.js";
import { sendAccountDecisionEmail } from "../../utils/sendEmail.js";
import { User } from "./user.model.js";
import { escapeRegex } from "../../utils/pagination.js";
import { createFromRegistration as createStudentRecord } from "../students/students.service.js";
import { createFromRegistration as createFacultyRecord } from "../faculty/faculty.service.js";

// Who may create which role directly (without a registration request)
const CREATABLE = {
  [ROLES.SUPER_ADMIN]: [
    ROLES.REGISTRAR, ROLES.ADMIN, ROLES.HOD, ROLES.FACULTY, ROLES.ACCOUNTANT, ROLES.LIBRARIAN, ROLES.STUDENT,
  ],
  [ROLES.REGISTRAR]: [ROLES.HOD, ROLES.FACULTY, ROLES.ACCOUNTANT, ROLES.LIBRARIAN, ROLES.STUDENT],
  [ROLES.ADMIN]: [ROLES.HOD, ROLES.FACULTY, ROLES.ACCOUNTANT, ROLES.LIBRARIAN, ROLES.STUDENT],
};

// Only the requests this person is allowed to decide on
export const listPending = (actor) =>
  User.find({ status: ACCOUNT_STATUS.PENDING_APPROVAL, role: { $in: approvableRoles(actor.role) } })
    .sort({ createdAt: 1 })
    .limit(200);

async function getDecidable(actor, id) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");
  if (user.status !== ACCOUNT_STATUS.PENDING_APPROVAL) {
    throw new ApiError(400, "This account is not waiting for approval");
  }
  if (!canApprove(actor.role, user.role)) {
    throw new ApiError(403, "Only a Super Admin can decide on this role");
  }
  return user;
}

// A failed email must not undo the decision
const notify = (user, approved) =>
  sendAccountDecisionEmail({ to: user.email, name: user.name, approved }).catch((err) =>
    console.error("Could not send the decision email:", err.message)
  );

// An approved student, faculty member or head of school also gets their academic record
async function createRecord(user) {
  if (user.role === ROLES.STUDENT) await createStudentRecord(user);
  if (user.role === ROLES.FACULTY) await createFacultyRecord(user, { asHod: false });
  if (user.role === ROLES.HOD) await createFacultyRecord(user, { asHod: true });
}

async function decide(actor, id, approved) {
  const user = await getDecidable(actor, id);
  if (approved) await createRecord(user); // if this fails (e.g. a clashing ID) the request stays pending
  user.status = approved ? ACCOUNT_STATUS.ACTIVE : ACCOUNT_STATUS.SUSPENDED;
  user.decidedBy = actor._id;
  user.decidedAt = new Date();
  await user.save();
  await notify(user, approved);
  return user;
}

export const approve = (actor, id) => decide(actor, id, true);
export const reject = (actor, id) => decide(actor, id, false);

export async function createUser(actor, data) {
  const allowed = CREATABLE[actor.role] || [];
  if (!allowed.includes(data.role)) {
    throw new ApiError(403, "You are not allowed to create that type of account");
  }
  if (await User.exists({ email: data.email })) {
    throw new ApiError(409, "An account with this email already exists");
  }
  return User.create({
    ...data,
    isEmailVerified: true,
    status: ACCOUNT_STATUS.ACTIVE,
    decidedBy: actor._id,
    decidedAt: new Date(),
  });
}

// Everyone with an account, for the admin's "All users" list
export async function listUsers(actor, query) {
  const filter = { isEmailVerified: true };
  if (query.role) filter.role = String(query.role);
  if (query.status) filter.status = String(query.status);
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(300);
  return users.map((u) => ({ ...u.toSafeJSON(), lastLoginAt: u.lastLoginAt }));
}

// Suspend or re-activate an account. Nobody can change their own, and only a Super Admin can touch
// the top roles (otherwise an admin could lock the Super Admin out).
export async function setStatus(actor, id, status) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");
  if (String(user._id) === String(actor._id)) throw new ApiError(400, "You cannot change your own account");
  if (!user.isEmailVerified || ![ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.SUSPENDED].includes(user.status)) {
    throw new ApiError(400, "Only approved accounts can be suspended or re-activated");
  }
  const top = [ROLES.SUPER_ADMIN, ROLES.REGISTRAR, ROLES.ADMIN];
  if (top.includes(user.role) && actor.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, "Only a Super Admin can change this account");
  }
  user.status = status;
  await user.save();
  return user;
}
