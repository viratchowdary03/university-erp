import { ApiError } from "../../utils/ApiError.js";
import { Notification } from "./notification.model.js";

// Other modules call this when something happens. A failure here must never break the real action.
export async function notify(userIds, { title, message, link, type = "info" }) {
  try {
    const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean).map(String))];
    if (!ids.length) return;
    await Notification.insertMany(ids.map((userId) => ({ userId, title, message, link, type })));
  } catch (err) {
    console.error("Could not create notifications:", err.message);
  }
}

export async function listMine(user) {
  const [items, unread] = await Promise.all([
    Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50),
    Notification.countDocuments({ userId: user._id, read: false }),
  ]);
  return { items: items.map((n) => n.toJSON()), unread };
}

export const unreadCount = async (user) => ({ unread: await Notification.countDocuments({ userId: user._id, read: false }) });

export async function markRead(user, id) {
  const n = await Notification.findOneAndUpdate({ _id: id, userId: user._id }, { read: true }, { new: true });
  if (!n) throw new ApiError(404, "Notification not found");
  return n;
}

export const markAllRead = (user) => Notification.updateMany({ userId: user._id, read: false }, { read: true });

export async function remove(user, id) {
  const n = await Notification.findOneAndDelete({ _id: id, userId: user._id });
  if (!n) throw new ApiError(404, "Notification not found");
}
