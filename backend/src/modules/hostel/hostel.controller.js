import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./hostel.service.js";

export const overview = asyncHandler(async (req, res) => ok(res, await svc.getHostelOverview(req.user)));
export const mine = asyncHandler(async (req, res) => ok(res, await svc.getMyHostel(req.user)));
export const allocatable = asyncHandler(async (req, res) => ok(res, await svc.listAllocatableStudents(req.user)));
export const suggest = asyncHandler(async (req, res) => ok(res, await svc.suggestBed(req.user, String(req.query.hostel || ""))));
export const allocate = asyncHandler(async (req, res) => ok(res, (await svc.allocateRoom(req.user, req.body)).toJSON(), "Room allocated", 201));
export const update = asyncHandler(async (req, res) =>
  ok(res, (await svc.updateAllocation(req.user, req.params.studentId, req.body)).toJSON(), "Room details updated"));
export const vacate = asyncHandler(async (req, res) => {
  await svc.vacateRoom(req.user, req.params.studentId);
  ok(res, null, "Room vacated");
});
