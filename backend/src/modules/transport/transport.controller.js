import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./transport.service.js";

export const overview = asyncHandler(async (req, res) => ok(res, await svc.getOverview()));
export const mine = asyncHandler(async (req, res) => ok(res, await svc.getMyTransport(req.user)));
export const createVehicle = asyncHandler(async (req, res) => ok(res, (await svc.createVehicle(req.user, req.body)).toJSON(), "Vehicle added", 201));
export const updateVehicle = asyncHandler(async (req, res) => ok(res, (await svc.updateVehicle(req.user, req.params.id, req.body)).toJSON(), "Vehicle updated"));
export const removeVehicle = asyncHandler(async (req, res) => {
  await svc.deleteVehicle(req.user, req.params.id);
  ok(res, null, "Vehicle deleted");
});
export const createRoute = asyncHandler(async (req, res) => ok(res, (await svc.createRoute(req.user, req.body)).toJSON(), "Route added", 201));
export const updateRoute = asyncHandler(async (req, res) => ok(res, (await svc.updateRoute(req.user, req.params.id, req.body)).toJSON(), "Route updated"));
export const removeRoute = asyncHandler(async (req, res) => {
  await svc.deleteRoute(req.user, req.params.id);
  ok(res, null, "Route deleted");
});
export const allocatable = asyncHandler(async (req, res) => ok(res, await svc.listAllocatable(req.user)));
export const allocate = asyncHandler(async (req, res) => ok(res, (await svc.allocate(req.user, req.body)).toJSON(), "Seat assigned", 201));
export const release = asyncHandler(async (req, res) => {
  await svc.release(req.user, req.params.studentId);
  ok(res, null, "Seat released");
});
