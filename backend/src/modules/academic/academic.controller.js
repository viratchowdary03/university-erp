import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./academic.service.js";

export const overview = asyncHandler(async (req, res) => ok(res, await svc.getAcademic(req.user)));
export const createSubject = asyncHandler(async (req, res) => ok(res, (await svc.createSubject(req.user, req.body)).toJSON(), "Subject added", 201));
export const updateSubject = asyncHandler(async (req, res) => ok(res, (await svc.updateSubject(req.user, req.params.id, req.body)).toJSON(), "Subject updated"));
export const removeSubject = asyncHandler(async (req, res) => {
  await svc.deleteSubject(req.user, req.params.id);
  ok(res, null, "Subject deleted");
});
export const addProgram = asyncHandler(async (req, res) => ok(res, (await svc.addProgram(req.user, req.params.code, req.body.program)).toJSON(), "Program added", 201));
export const removeProgram = asyncHandler(async (req, res) => ok(res, (await svc.removeProgram(req.user, req.params.code, req.body.program)).toJSON(), "Program removed"));
