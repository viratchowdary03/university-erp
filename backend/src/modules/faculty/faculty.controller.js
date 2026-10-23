import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./faculty.service.js";

export const list = asyncHandler(async (req, res) => ok(res, await svc.listFaculty(req.user)));
export const create = asyncHandler(async (req, res) => ok(res, (await svc.createFaculty(req.user, req.body)).toJSON(), "Faculty member added", 201));
export const update = asyncHandler(async (req, res) => ok(res, (await svc.updateFaculty(req.user, req.params.id, req.body)).toJSON(), "Faculty member updated"));
export const remove = asyncHandler(async (req, res) => {
  await svc.deleteFaculty(req.user, req.params.id);
  ok(res, null, "Faculty member deleted");
});
