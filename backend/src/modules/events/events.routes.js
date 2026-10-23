import { Router } from "express";
import * as ctrl from "./events.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM, canManage } from "../../utils/permissions.js";
import { ApiError } from "../../utils/ApiError.js";
import { eventSchema } from "./events.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.EVENTS));

const staffOnly = (req, res, next) =>
  canManage(req.user.role, PERM.EVENTS) ? next() : next(new ApiError(403, "You do not have permission to do this"));

router.get("/", ctrl.list);
router.get("/:id", ctrl.get);
router.post("/:id/register", ctrl.register);
router.delete("/:id/register", ctrl.unregister);

router.post("/", staffOnly, validate(eventSchema), ctrl.create);
router.put("/:id", staffOnly, validate(eventSchema), ctrl.update);
router.delete("/:id", staffOnly, ctrl.remove);
router.get("/:id/registrations", staffOnly, ctrl.registrations);

export default router;
