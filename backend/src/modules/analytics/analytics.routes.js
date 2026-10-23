import { Router } from "express";
import * as ctrl from "./analytics.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { PERM } from "../../utils/permissions.js";

const router = Router();
router.use(authenticate);

router.get("/insights", requirePermission(PERM.ANALYTICS), ctrl.insights);
// students see their own prediction, staff see the students who need to catch up
router.get("/attendance-prediction", requirePermission(PERM.ATTENDANCE), ctrl.prediction);

export default router;
