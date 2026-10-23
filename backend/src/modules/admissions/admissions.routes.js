import { Router } from "express";
import * as ctrl from "./admissions.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { authLimiter } from "../../middleware/rateLimit.middleware.js";
import { PERM } from "../../utils/permissions.js";
import { applySchema, statusLookupSchema, decisionSchema } from "./admissions.validation.js";

const router = Router();

// Public: the application form and the status check (rate limited, no login)
router.get("/options", ctrl.options);
router.post("/apply", authLimiter, validate(applySchema), ctrl.apply);
router.post("/status", authLimiter, validate(statusLookupSchema), ctrl.status);

// Staff
router.use(authenticate, requirePermission(PERM.ADMISSIONS));
router.get("/", ctrl.list);
router.patch("/:id/decision", validate(decisionSchema), ctrl.decide);
router.post("/:id/enroll", ctrl.enroll);
router.delete("/:id", ctrl.remove);

export default router;
