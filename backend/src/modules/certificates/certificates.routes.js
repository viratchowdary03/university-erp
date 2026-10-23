import { Router } from "express";
import * as ctrl from "./certificates.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM, canManage } from "../../utils/permissions.js";
import { ApiError } from "../../utils/ApiError.js";
import { requestSchema, decisionSchema } from "./certificates.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.CERTIFICATES));

const staffOnly = (req, res, next) =>
  canManage(req.user.role, PERM.CERTIFICATES) ? next() : next(new ApiError(403, "You do not have permission to do this"));

router.post("/", validate(requestSchema), ctrl.request);
router.get("/mine", ctrl.mine);
router.get("/", staffOnly, ctrl.all);
router.patch("/:id/decision", staffOnly, validate(decisionSchema), ctrl.decide);
router.post("/:id/issue", staffOnly, ctrl.issue);
router.get("/:id/pdf", ctrl.pdf);

export default router;
