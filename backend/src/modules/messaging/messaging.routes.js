import { Router } from "express";
import * as ctrl from "./messaging.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM } from "../../utils/permissions.js";
import { startSchema, sendSchema } from "./messaging.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.MESSAGES));

router.get("/people", ctrl.people);
router.get("/unread-count", ctrl.unread);
router.get("/conversations", ctrl.conversations);
router.post("/conversations", validate(startSchema), ctrl.start);
router.get("/conversations/:id", ctrl.messages);
router.post("/conversations/:id/messages", validate(sendSchema), ctrl.send);

export default router;
