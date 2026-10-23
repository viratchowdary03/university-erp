import { Router } from "express";
import * as ctrl from "./reports.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { PERM } from "../../utils/permissions.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.REPORTS));

router.get("/", ctrl.types);
router.get("/:type", ctrl.build);

export default router;
