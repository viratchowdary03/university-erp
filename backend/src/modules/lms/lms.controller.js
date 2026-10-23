import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./lms.service.js";

export const courses = asyncHandler(async (req, res) => ok(res, await svc.listCourses(req.user, req.query.school)));
export const upcoming = asyncHandler(async (req, res) => ok(res, await svc.listUpcomingAssignments(req.user)));
export const course = asyncHandler(async (req, res) => ok(res, await svc.getCourse(req.user, req.params.code)));

export const addMaterial = asyncHandler(async (req, res) => ok(res, (await svc.addMaterial(req.user, req.params.code, req.body)).toJSON(), "Material added", 201));
export const removeMaterial = asyncHandler(async (req, res) => {
  await svc.deleteMaterial(req.user, req.params.id);
  ok(res, null, "Material removed");
});

export const addAssignment = asyncHandler(async (req, res) => ok(res, (await svc.addAssignment(req.user, req.params.code, req.body)).toJSON(), "Assignment posted", 201));
export const removeAssignment = asyncHandler(async (req, res) => {
  await svc.deleteAssignment(req.user, req.params.id);
  ok(res, null, "Assignment removed");
});
export const submit = asyncHandler(async (req, res) => ok(res, (await svc.submit(req.user, req.params.id, req.body)).toJSON(), "Work submitted", 201));
export const submissions = asyncHandler(async (req, res) => ok(res, await svc.listSubmissions(req.user, req.params.id)));
export const grade = asyncHandler(async (req, res) => ok(res, (await svc.gradeSubmission(req.user, req.params.id, req.body)).toJSON(), "Graded"));

export const addQuiz = asyncHandler(async (req, res) => ok(res, (await svc.addQuiz(req.user, req.params.code, req.body)).toJSON(), "Quiz created", 201));
export const removeQuiz = asyncHandler(async (req, res) => {
  await svc.deleteQuiz(req.user, req.params.id);
  ok(res, null, "Quiz removed");
});
export const quiz = asyncHandler(async (req, res) => ok(res, await svc.getQuiz(req.user, req.params.id)));
export const attempt = asyncHandler(async (req, res) => ok(res, (await svc.attemptQuiz(req.user, req.params.id, req.body.answers)).toJSON(), "Quiz submitted", 201));
export const attempts = asyncHandler(async (req, res) => ok(res, await svc.listAttempts(req.user, req.params.id)));
