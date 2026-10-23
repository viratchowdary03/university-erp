import { Router } from "express";
import * as ctrl from "./leave.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM } from "../../utils/permissions.js";
import { applySchema, decisionSchema } from "./leave.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.LEAVE));

router.post("/", validate(applySchema), ctrl.apply);
router.get("/mine", ctrl.mine);
router.patch("/:id/cancel", ctrl.cancel);
router.get("/requests", ctrl.requests);
router.patch("/:id/decision", validate(decisionSchema), ctrl.decide);

export default router;
