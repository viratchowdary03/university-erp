import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./exams.service.js";

export const list = asyncHandler(async (req, res) => ok(res, await svc.listExams(req.user, req.query)));
export const create = asyncHandler(async (req, res) => ok(res, (await svc.createExam(req.user, req.body)).toJSON(), "Exam created", 201));
export const update = asyncHandler(async (req, res) => ok(res, (await svc.updateExam(req.user, req.params.id, req.body)).toJSON(), "Exam updated"));
export const remove = asyncHandler(async (req, res) => {
  await svc.deleteExam(req.user, req.params.id);
  ok(res, null, "Exam deleted");
});
export const markSheet = asyncHandler(async (req, res) => ok(res, await svc.getMarkSheet(req.user, req.params.id)));
export const saveMarks = asyncHandler(async (req, res) => ok(res, await svc.saveMarks(req.user, req.params.id, req.body.entries), "Marks saved"));
export const publish = asyncHandler(async (req, res) =>
  ok(res, (await svc.setPublished(req.user, req.params.id, req.body.published)).toJSON(), req.body.published ? "Results published" : "Results hidden"));
