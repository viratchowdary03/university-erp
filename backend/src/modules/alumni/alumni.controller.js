import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./alumni.service.js";

export const list = asyncHandler(async (req, res) => ok(res, await svc.listAlumni(req.query)));
export const get = asyncHandler(async (req, res) => ok(res, (await svc.getAlumnus(req.params.id)).toJSON()));
export const create = asyncHandler(async (req, res) => ok(res, (await svc.createAlumnus(req.user, req.body)).toJSON(), "Alumni added", 201));
export const update = asyncHandler(async (req, res) => ok(res, (await svc.updateAlumnus(req.user, req.params.id, req.body)).toJSON(), "Alumni updated"));
export const remove = asyncHandler(async (req, res) => {
  await svc.deleteAlumnus(req.user, req.params.id);
  ok(res, null, "Alumni deleted");
});
