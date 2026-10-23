import { Router } from "express";
import * as ctrl from "./lms.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM, canManage } from "../../utils/permissions.js";
import { ApiError } from "../../utils/ApiError.js";
import { materialSchema, assignmentSchema, submitSchema, gradeSchema, quizSchema, attemptSchema } from "./lms.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.LMS));

router.get("/courses", ctrl.courses);
router.get("/courses/:code", ctrl.course);
router.get("/assignments/upcoming", ctrl.upcoming);

// Students may read, submit and attempt. Adding and grading is for teaching roles; the service then checks
// that this person teaches THIS course (the teacher of the subject, the head of school, admins).
const teachingRoles = (req, res, next) =>
  canManage(req.user.role, PERM.LMS) ? next() : next(new ApiError(403, "You do not have permission to do this"));

router.post("/courses/:code/materials", teachingRoles, validate(materialSchema), ctrl.addMaterial);
router.delete("/materials/:id", teachingRoles, ctrl.removeMaterial);

router.post("/courses/:code/assignments", teachingRoles, validate(assignmentSchema), ctrl.addAssignment);
router.delete("/assignments/:id", teachingRoles, ctrl.removeAssignment);
router.post("/assignments/:id/submit", validate(submitSchema), ctrl.submit);
router.get("/assignments/:id/submissions", teachingRoles, ctrl.submissions);
router.patch("/submissions/:id/grade", teachingRoles, validate(gradeSchema), ctrl.grade);

router.post("/courses/:code/quizzes", teachingRoles, validate(quizSchema), ctrl.addQuiz);
router.delete("/quizzes/:id", teachingRoles, ctrl.removeQuiz);
router.get("/quizzes/:id", ctrl.quiz);
router.post("/quizzes/:id/attempt", validate(attemptSchema), ctrl.attempt);
router.get("/quizzes/:id/attempts", teachingRoles, ctrl.attempts);

export default router;
