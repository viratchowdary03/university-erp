import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import { escapeRegex } from "../../utils/pagination.js";
import { User } from "../users/user.model.js";
import { Conversation } from "./conversation.model.js";
import { Message } from "./message.model.js";

// Students can write to staff but not to other students; staff can write to anyone.
const canTalk = (a, b) => !(a.role === ROLES.STUDENT && b.role === ROLES.STUDENT);
const person = (u) => ({ id: String(u._id), name: u.name, role: u.role, school: u.school });

export async function searchPeople(user, q) {
  const filter = { status: "active", _id: { $ne: user._id } };
  if (user.role === ROLES.STUDENT) filter.role = { $ne: ROLES.STUDENT };
  if (q) filter.name = new RegExp(escapeRegex(q), "i");
  return (await User.find(filter).sort({ name: 1 }).limit(25)).map(person);
}

export async function startConversation(user, otherId) {
  if (String(otherId) === String(user._id)) throw new ApiError(400, "You cannot message yourself");
  const other = await User.findOne({ _id: otherId, status: "active" });
  if (!other) throw new ApiError(404, "Person not found");
  if (!canTalk(user, other)) throw new ApiError(403, "Students can message staff, not other students");
  const pair = [String(user._id), String(other._id)].sort().join(":");
  let conversation = await Conversation.findOne({ pair });
  if (!conversation) {
    try {
      conversation = await Conversation.create({ pair, participants: [user._id, other._id] });
    } catch (err) {
      if (err.code !== 11000) throw err;
      conversation = await Conversation.findOne({ pair }); // created by the other person a moment ago
    }
  }
  return conversation;
}

async function mineOrFail(user, id) {
  const conversation = await Conversation.findOne({ _id: id, participants: user._id });
  if (!conversation) throw new ApiError(404, "Conversation not found");
  return conversation;
}

export async function listConversations(user) {
  const conversations = await Conversation.find({ participants: user._id }).sort({ lastAt: -1 }).limit(100);
  const others = await User.find({ _id: { $in: conversations.flatMap((c) => c.participants).filter((id) => String(id) !== String(user._id)) } });
  const otherBy = new Map(others.map((u) => [String(u._id), u]));
  const unread = await Message.aggregate([
    { $match: { conversationId: { $in: conversations.map((c) => c._id) }, senderId: { $ne: user._id }, readBy: { $ne: user._id } } },
    { $group: { _id: "$conversationId", n: { $sum: 1 } } },
  ]);
  const unreadBy = new Map(unread.map((u) => [String(u._id), u.n]));
  return conversations.map((c) => {
    const otherId = c.participants.find((id) => String(id) !== String(user._id));
    const other = otherBy.get(String(otherId));
    return {
      id: String(c._id), with: other ? person(other) : { id: String(otherId), name: "Removed account", role: "" },
      lastMessage: c.lastMessage, lastAt: c.lastAt, mine: String(c.lastSenderId) === String(user._id), unread: unreadBy.get(String(c._id)) || 0,
    };
  });
}

export async function unreadTotal(user) {
  const mine = await Conversation.find({ participants: user._id }).select("_id");
  const n = await Message.countDocuments({ conversationId: { $in: mine.map((c) => c._id) }, senderId: { $ne: user._id }, readBy: { $ne: user._id } });
  return { unread: n };
}

// Opening a chat marks what the other person wrote as read
export async function getMessages(user, id) {
  const conversation = await mineOrFail(user, id);
  const otherId = conversation.participants.find((p) => String(p) !== String(user._id));
  const [messages, other] = await Promise.all([
    Message.find({ conversationId: conversation._id }).sort({ createdAt: -1 }).limit(200),
    User.findById(otherId),
  ]);
  await Message.updateMany({ conversationId: conversation._id, senderId: { $ne: user._id }, readBy: { $ne: user._id } }, { $addToSet: { readBy: user._id } });
  return {
    id: String(conversation._id),
    with: other ? person(other) : { id: String(otherId), name: "Removed account", role: "" },
    messages: messages.reverse().map((m) => ({ id: String(m._id), body: m.body, mine: String(m.senderId) === String(user._id), at: m.createdAt })),
  };
}

export async function sendMessage(user, id, body) {
  const conversation = await mineOrFail(user, id);
  const otherId = conversation.participants.find((p) => String(p) !== String(user._id));
  const other = await User.findOne({ _id: otherId, status: "active" });
  if (!other) throw new ApiError(409, "This person can no longer receive messages");
  const message = await Message.create({ conversationId: conversation._id, senderId: user._id, body, readBy: [user._id] });
  conversation.lastMessage = body.slice(0, 120);
  conversation.lastSenderId = user._id;
  conversation.lastAt = new Date();
  await conversation.save();
  return { id: String(message._id), body: message.body, mine: true, at: message.createdAt };
}
