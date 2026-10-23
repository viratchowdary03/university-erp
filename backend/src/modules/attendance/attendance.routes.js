import { Router } from "express";
import * as ctrl from "./attendance.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM } from "../../utils/permissions.js";
import { markSchema } from "./attendance.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.ATTENDANCE));

router.get("/me", ctrl.mine); // student
router.get("/overview", ctrl.overview); // faculty: own subjects
router.get("/session", ctrl.session); // faculty: roster for one subject
router.post("/mark", validate(markSchema), ctrl.mark); // faculty
router.get("/report", ctrl.report); // head of school and full-access roles

export default router;
