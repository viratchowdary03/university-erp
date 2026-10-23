import { Router } from "express";
import * as ctrl from "./auditLogs.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { PERM } from "../../utils/permissions.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.AUDIT));
router.get("/", ctrl.list);

export default router;
