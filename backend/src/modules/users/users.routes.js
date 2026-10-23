import { Router } from "express";
import * as ctrl from "./users.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM } from "../../utils/permissions.js";
import { createUserSchema, statusSchema } from "./users.validation.js";

const router = Router();

router.use(authenticate, requirePermission(PERM.USERS));

router.get("/", ctrl.list);
router.get("/pending", ctrl.listPending);
router.patch("/:id/status", validate(statusSchema), ctrl.setStatus);
router.patch("/:id/approve", ctrl.approve);
router.patch("/:id/reject", ctrl.reject);
router.post("/", validate(createUserSchema), ctrl.createUser);

export default router;
