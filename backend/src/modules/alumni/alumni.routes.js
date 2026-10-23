import { Router } from "express";
import * as ctrl from "./alumni.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM, canManage } from "../../utils/permissions.js";
import { ApiError } from "../../utils/ApiError.js";
import { alumniSchema } from "./alumni.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.ALUMNI));

const staffOnly = (req, res, next) =>
  canManage(req.user.role, PERM.ALUMNI) ? next() : next(new ApiError(403, "You do not have permission to do this"));

router.get("/", ctrl.list);
router.get("/:id", ctrl.get);
router.post("/", staffOnly, validate(alumniSchema), ctrl.create);
router.put("/:id", staffOnly, validate(alumniSchema), ctrl.update);
router.delete("/:id", staffOnly, ctrl.remove);

export default router;
