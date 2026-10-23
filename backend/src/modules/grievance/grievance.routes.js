import { Router } from "express";
import * as ctrl from "./grievance.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM } from "../../utils/permissions.js";
import { ticketSchema, commentSchema, statusSchema } from "./grievance.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.GRIEVANCE));

router.get("/", ctrl.list);
router.post("/", validate(ticketSchema), ctrl.create);
router.get("/:id", ctrl.get);
router.post("/:id/comments", validate(commentSchema), ctrl.comment);
router.patch("/:id/status", validate(statusSchema), ctrl.status);

export default router;
