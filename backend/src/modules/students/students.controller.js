import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./students.service.js";

export const list = asyncHandler(async (req, res) => ok(res, await svc.listStudents(req.user)));
export const details = asyncHandler(async (req, res) => ok(res, await svc.getStudentDetails(req.user, req.params.id)));
export const create = asyncHandler(async (req, res) => ok(res, (await svc.createStudent(req.user, req.body)).toJSON(), "Student added", 201));
export const update = asyncHandler(async (req, res) => ok(res, (await svc.updateStudent(req.user, req.params.id, req.body)).toJSON(), "Student updated"));
export const remove = asyncHandler(async (req, res) => {
  await svc.deleteStudent(req.user, req.params.id);
  ok(res, null, "Student deleted");
});
