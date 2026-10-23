import { Router } from "express";
import { week } from "./timetable.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { PERM } from "../../utils/permissions.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.TIMETABLE));
router.get("/", week);

export default router;
