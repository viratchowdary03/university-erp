import { Router } from "express";
import * as ctrl from "./results.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { PERM } from "../../utils/permissions.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.RESULTS));

router.get("/me", ctrl.mine);
router.get("/me/marksheet", ctrl.marksheet);
router.get("/summary", ctrl.summary);
router.get("/student/:id", ctrl.forStudent);
router.get("/student/:id/marksheet", ctrl.marksheet);

export default router;
