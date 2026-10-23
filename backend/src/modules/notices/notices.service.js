import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import { PERM, hasFullAccess, canManage } from "../../utils/permissions.js";
import { notify } from "../notifications/notifications.service.js";
import { User } from "../users/user.model.js";
import { Notice } from "./notice.model.js";

const todayIso = () => new Date().toISOString().slice(0, 10);

// A notice is visible when its audience includes your role (or is empty), it is for your school (or every
// school) and it has not expired. Full-access roles see everything.
function visibleTo(user, notice) {
  if (hasFullAccess(user.role)) return true;
  if (notice.authorId && String(notice.authorId) === String(user._id)) return true;
  if (notice.expiresAt && notice.expiresAt < todayIso()) return false;
  if (notice.audience.length && !notice.audience.includes(user.role)) return false;
  if (notice.school && notice.school !== user.school) return false;
  return true;
}

export async function listNotices(user, { limit } = {}) {
  const all = await Notice.find().sort({ pinned: -1, createdAt: -1 }).limit(300);
  const list = all.filter((n) => visibleTo(user, n)).map((n) => ({
    ...n.toJSON(),
    expired: Boolean(n.expiresAt && n.expiresAt < todayIso()),
    editable: canEdit(user, n),
  }));
  return limit ? list.slice(0, limit) : list;
}

function canEdit(user, notice) {
  if (hasFullAccess(user.role)) return true;
  return canManage(user.role, PERM.NOTICES) && String(notice.authorId) === String(user._id);
}

// Heads of school and faculty can only write to their own school
function shape(user, values) {
  const data = { ...values, school: values.school || "", expiresAt: values.expiresAt || undefined };
  if (!hasFullAccess(user.role)) {
    data.school = user.school;
    // staff of a school write to students (and colleagues), never to the accounts or library staff
    data.audience = data.audience.filter((r) => [ROLES.STUDENT, ROLES.FACULTY, ROLES.HOD].includes(r));
    if (!data.audience.length) data.audience = [ROLES.STUDENT];
  }
  return data;
}

async function audienceUserIds(notice) {
  const filter = { status: "active" };
  if (notice.audience.length) filter.role = { $in: notice.audience };
  if (notice.school) filter.school = notice.school;
  return (await User.find(filter).select("_id")).map((u) => u._id);
}

export async function createNotice(user, values) {
  if (!canManage(user.role, PERM.NOTICES)) throw new ApiError(403, "You are not allowed to post notices");
  const notice = await Notice.create({ ...shape(user, values), authorId: user._id, authorName: user.name, authorRole: user.role });
  if (notice.priority !== "normal") {
    const ids = (await audienceUserIds(notice)).filter((id) => String(id) !== String(user._id));
    notify(ids, { title: notice.title, message: notice.body.slice(0, 140), link: "/notices", type: notice.priority === "urgent" ? "warning" : "info" });
  }
  return notice;
}

export async function updateNotice(user, id, values) {
  const notice = await Notice.findById(id);
  if (!notice) throw new ApiError(404, "Notice not found");
  if (!canEdit(user, notice)) throw new ApiError(403, "You can only change your own notices");
  Object.assign(notice, shape(user, values));
  await notice.save();
  return notice;
}

export async function deleteNotice(user, id) {
  const notice = await Notice.findById(id);
  if (!notice) throw new ApiError(404, "Notice not found");
  if (!canEdit(user, notice)) throw new ApiError(403, "You can only delete your own notices");
  await notice.deleteOne();
}
