import { Router } from "express";
import * as ctrl from "./notices.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM, canManage } from "../../utils/permissions.js";
import { ApiError } from "../../utils/ApiError.js";
import { noticeSchema } from "./notices.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.NOTICES));

const staffOnly = (req, res, next) =>
  canManage(req.user.role, PERM.NOTICES) ? next() : next(new ApiError(403, "You are not allowed to post notices"));

router.get("/", ctrl.list);
router.post("/", staffOnly, validate(noticeSchema), ctrl.create);
router.put("/:id", staffOnly, validate(noticeSchema), ctrl.update);
router.delete("/:id", staffOnly, ctrl.remove);

export default router;
