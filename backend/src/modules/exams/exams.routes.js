import { Router } from "express";
import * as ctrl from "./exams.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM, canManage } from "../../utils/permissions.js";
import { ApiError } from "../../utils/ApiError.js";
import { examSchema, marksSchema, publishSchema } from "./exams.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.EXAMS));

// Students may only look; the roles in MANAGE_ROLES (permissions.js) change things
const staffOnly = (req, res, next) =>
  canManage(req.user.role, PERM.EXAMS) ? next() : next(new ApiError(403, "You do not have permission to do this"));

router.get("/", ctrl.list);
router.post("/", staffOnly, validate(examSchema), ctrl.create);
router.put("/:id", staffOnly, validate(examSchema), ctrl.update);
router.delete("/:id", staffOnly, ctrl.remove);
router.get("/:id/marks", staffOnly, ctrl.markSheet);
router.put("/:id/marks", staffOnly, validate(marksSchema), ctrl.saveMarks);
router.patch("/:id/publish", staffOnly, validate(publishSchema), ctrl.publish);

export default router;
