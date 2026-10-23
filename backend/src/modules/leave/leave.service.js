import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import { hasFullAccess } from "../../utils/permissions.js";
import { notify } from "../notifications/notifications.service.js";
import { LeaveRequest } from "./leaveRequest.model.js";

// Who may decide on whose leave: faculty -> students of their school, HOD -> faculty and students of their
// school, full-access roles -> anyone (except their own)
const DECIDES_ON = {
  [ROLES.FACULTY]: [ROLES.STUDENT],
  [ROLES.HOD]: [ROLES.STUDENT, ROLES.FACULTY],
};
const APPLICANT_ROLES = [ROLES.STUDENT, ROLES.FACULTY, ROLES.HOD];

const countDays = (from, to) => Math.round((new Date(to) - new Date(from)) / 86400000) + 1;

export async function apply(user, values) {
  if (!APPLICANT_ROLES.includes(user.role)) throw new ApiError(403, "Leave is for students, faculty and heads of school");
  const clash = await LeaveRequest.findOne({
    applicantId: user._id, status: { $in: ["pending", "approved"] },
    fromDate: { $lte: values.toDate }, toDate: { $gte: values.fromDate },
  });
  if (clash) throw new ApiError(409, "You already have a leave request for some of these dates");
  return LeaveRequest.create({
    ...values, applicantId: user._id, applicantName: user.name, applicantRole: user.role, school: user.school,
    days: countDays(values.fromDate, values.toDate),
  });
}

export async function listMine(user) {
  return (await LeaveRequest.find({ applicantId: user._id }).sort({ createdAt: -1 }).limit(100)).map((l) => l.toJSON());
}

export async function cancel(user, id) {
  const leave = await LeaveRequest.findOne({ _id: id, applicantId: user._id });
  if (!leave) throw new ApiError(404, "Leave request not found");
  if (leave.status !== "pending") throw new ApiError(409, "Only a pending request can be cancelled");
  leave.status = "cancelled";
  await leave.save();
  return leave;
}

function scopeFor(user) {
  if (hasFullAccess(user.role)) return {};
  const roles = DECIDES_ON[user.role];
  if (!roles) throw new ApiError(403, "You cannot decide on leave requests");
  return { school: user.school, applicantRole: { $in: roles } };
}

export async function listRequests(user, query) {
  const filter = { ...scopeFor(user), applicantId: { $ne: user._id } };
  if (query.status) filter.status = String(query.status);
  return (await LeaveRequest.find(filter).sort({ status: 1, createdAt: -1 }).limit(300)).map((l) => l.toJSON());
}

export async function decide(user, id, { status, note }) {
  const leave = await LeaveRequest.findOne({ _id: id, ...scopeFor(user) });
  if (!leave) throw new ApiError(404, "Leave request not found");
  if (String(leave.applicantId) === String(user._id)) throw new ApiError(403, "You cannot decide on your own leave");
  if (leave.status !== "pending") throw new ApiError(409, "This request has already been decided");
  Object.assign(leave, { status, decisionNote: note || undefined, decidedBy: user._id, decidedByName: user.name, decidedAt: new Date() });
  await leave.save();
  notify(leave.applicantId, {
    title: `Leave ${status}`, message: `${leave.fromDate} to ${leave.toDate}${note ? `: ${note}` : ""}`, link: "/leave",
    type: status === "approved" ? "success" : "warning",
  });
  return leave;
}
