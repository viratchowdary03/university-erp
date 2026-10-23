import { Router } from "express";
import * as ctrl from "./settings.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM, canManage } from "../../utils/permissions.js";
import { ApiError } from "../../utils/ApiError.js";
import { settingsSchema, profileSchema } from "./settings.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.SETTINGS));

const adminOnly = (req, res, next) =>
  canManage(req.user.role, PERM.SETTINGS) ? next() : next(new ApiError(403, "You do not have permission to do this"));

router.get("/", ctrl.get);
router.put("/", adminOnly, validate(settingsSchema), ctrl.update);
router.put("/profile", validate(profileSchema), ctrl.profile);
router.get("/health", adminOnly, ctrl.health);

export default router;
