import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./events.service.js";

export const list = asyncHandler(async (req, res) => ok(res, await svc.listEvents(req.user)));
export const get = asyncHandler(async (req, res) => ok(res, await svc.getEvent(req.user, req.params.id)));
export const create = asyncHandler(async (req, res) => ok(res, (await svc.createEvent(req.user, req.body)).toJSON(), "Event created", 201));
export const update = asyncHandler(async (req, res) => ok(res, (await svc.updateEvent(req.user, req.params.id, req.body)).toJSON(), "Event updated"));
export const remove = asyncHandler(async (req, res) => {
  await svc.deleteEvent(req.user, req.params.id);
  ok(res, null, "Event deleted");
});
export const register = asyncHandler(async (req, res) => {
  await svc.register(req.user, req.params.id);
  ok(res, null, "You are registered", 201);
});
export const unregister = asyncHandler(async (req, res) => {
  await svc.unregister(req.user, req.params.id);
  ok(res, null, "Registration cancelled");
});
export const registrations = asyncHandler(async (req, res) => ok(res, await svc.listRegistrations(req.user, req.params.id)));
