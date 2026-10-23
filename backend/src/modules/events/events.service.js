import { ApiError } from "../../utils/ApiError.js";
import { PERM } from "../../utils/permissions.js";
import { assertManager } from "../../utils/access.js";
import { hasFullAccess } from "../../utils/permissions.js";
import { Event } from "./event.model.js";
import { EventRegistration } from "./eventRegistration.model.js";

const todayIso = () => new Date().toISOString().slice(0, 10);

// Everyone sees events of every school and events open to their own school
const visibleFilter = (user) => (hasFullAccess(user.role) ? {} : { school: { $in: ["", user.school || "__none__"] } });

async function present(user, events) {
  const [counts, mine] = await Promise.all([
    EventRegistration.aggregate([{ $match: { eventId: { $in: events.map((e) => e._id) } } }, { $group: { _id: "$eventId", n: { $sum: 1 } } }]),
    EventRegistration.find({ eventId: { $in: events.map((e) => e._id) }, userId: user._id }).select("eventId"),
  ]);
  const countBy = new Map(counts.map((c) => [String(c._id), c.n]));
  const mineSet = new Set(mine.map((m) => String(m.eventId)));
  return events.map((e) => {
    const registered = countBy.get(String(e._id)) || 0;
    return { ...e.toJSON(), registered, registeredByMe: mineSet.has(String(e._id)), full: e.capacity > 0 && registered >= e.capacity, past: e.date < todayIso() };
  });
}

export async function listEvents(user) {
  return present(user, await Event.find(visibleFilter(user)).sort({ date: 1 }).limit(300));
}

export async function getEvent(user, id) {
  const event = await Event.findOne({ _id: id, ...visibleFilter(user) });
  if (!event) throw new ApiError(404, "Event not found");
  return (await present(user, [event]))[0];
}

export async function createEvent(user, values) {
  assertManager(user, PERM.EVENTS);
  return Event.create({ ...values, school: values.school || "", createdBy: user._id });
}

export async function updateEvent(user, id, values) {
  assertManager(user, PERM.EVENTS);
  const event = await Event.findById(id);
  if (!event) throw new ApiError(404, "Event not found");
  const registered = await EventRegistration.countDocuments({ eventId: event._id });
  if (values.capacity > 0 && values.capacity < registered) throw new ApiError(409, `${registered} people have already registered`);
  Object.assign(event, { ...values, school: values.school || "" });
  await event.save();
  return event;
}

export async function deleteEvent(user, id) {
  assertManager(user, PERM.EVENTS);
  const event = await Event.findById(id);
  if (!event) throw new ApiError(404, "Event not found");
  await Promise.all([EventRegistration.deleteMany({ eventId: event._id }), event.deleteOne()]);
}

export async function register(user, id) {
  const event = await Event.findOne({ _id: id, ...visibleFilter(user) });
  if (!event) throw new ApiError(404, "Event not found");
  if (event.date < todayIso()) throw new ApiError(409, "This event is over");
  if (event.capacity > 0 && (await EventRegistration.countDocuments({ eventId: event._id })) >= event.capacity) {
    throw new ApiError(409, "This event is full");
  }
  try {
    await EventRegistration.create({ eventId: event._id, userId: user._id, name: user.name, role: user.role });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, "You are already registered");
    throw err;
  }
}

export async function unregister(user, id) {
  const gone = await EventRegistration.findOneAndDelete({ eventId: id, userId: user._id });
  if (!gone) throw new ApiError(404, "You are not registered for this event");
}

export async function listRegistrations(user, id) {
  assertManager(user, PERM.EVENTS);
  return (await EventRegistration.find({ eventId: id }).sort({ createdAt: 1 })).map((r) => r.toJSON());
}
