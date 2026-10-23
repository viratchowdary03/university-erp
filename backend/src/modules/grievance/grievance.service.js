import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import { PERM, canManage } from "../../utils/permissions.js";
import { pad } from "../../utils/helpers.js";
import { notify } from "../notifications/notifications.service.js";
import { User } from "../users/user.model.js";
import { Ticket } from "./ticket.model.js";

// Staff who handle tickets see all of them; a head of school also sees their school's; everyone else sees their own
const handles = (user) => canManage(user.role, PERM.GRIEVANCE);
const scopeFor = (user) => {
  if (handles(user)) return {};
  if (user.role === ROLES.HOD) return { $or: [{ userId: user._id }, { school: user.school }] };
  return { userId: user._id };
};

async function nextTicketNo() {
  const prefix = `TKT${new Date().getFullYear()}-`;
  const last = await Ticket.findOne({ ticketNo: new RegExp(`^${prefix}`) }).sort({ ticketNo: -1 });
  return `${prefix}${pad(last ? Number(last.ticketNo.slice(prefix.length)) + 1 : 1, 4)}`;
}

export async function createTicket(user, values) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const ticket = await Ticket.create({ ...values, ticketNo: await nextTicketNo(), userId: user._id, name: user.name, role: user.role, school: user.school });
      const admins = await User.find({ role: { $in: [ROLES.SUPER_ADMIN, ROLES.REGISTRAR, ROLES.ADMIN] }, status: "active" }).select("_id");
      notify(admins.map((a) => a._id), { title: `New ticket ${ticket.ticketNo}`, message: ticket.subject, link: "/grievance", type: "warning" });
      return ticket;
    } catch (err) {
      if (err.code !== 11000 || attempt === 2) throw err;
    }
  }
  return null;
}

export async function listTickets(user, query) {
  const filter = { ...scopeFor(user) };
  if (query.status) filter.status = String(query.status);
  const tickets = await Ticket.find(filter).sort({ createdAt: -1 }).limit(300);
  return tickets.map((t) => {
    const { comments, ...rest } = t.toJSON();
    return { ...rest, commentCount: comments.length };
  });
}

async function loadVisible(user, id) {
  const ticket = await Ticket.findOne({ _id: id, ...scopeFor(user) });
  if (!ticket) throw new ApiError(404, "Ticket not found");
  return ticket;
}

export async function getTicket(user, id) {
  return (await loadVisible(user, id)).toJSON();
}

export async function addComment(user, id, text) {
  const ticket = await loadVisible(user, id);
  if (ticket.status === "closed") throw new ApiError(409, "This ticket is closed");
  ticket.comments.push({ userId: user._id, name: user.name, role: user.role, text });
  if (handles(user) && ticket.status === "open") ticket.status = "in_progress";
  await ticket.save();
  if (String(ticket.userId) !== String(user._id)) {
    notify(ticket.userId, { title: `Reply on ${ticket.ticketNo}`, message: text.slice(0, 120), link: "/grievance" });
  }
  return ticket;
}

// Handlers can set any status. The person who raised a ticket can only close it.
export async function setStatus(user, id, status) {
  const ticket = await loadVisible(user, id);
  const owner = String(ticket.userId) === String(user._id);
  if (!handles(user) && !(owner && status === "closed")) throw new ApiError(403, "You can only close your own ticket");
  ticket.status = status;
  await ticket.save();
  if (!owner) notify(ticket.userId, { title: `Ticket ${ticket.ticketNo} is ${status.replace("_", " ")}`, message: ticket.subject, link: "/grievance", type: status === "resolved" ? "success" : "info" });
  return ticket;
}
