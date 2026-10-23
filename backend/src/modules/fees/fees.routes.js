import { Router } from "express";
import * as ctrl from "./fees.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM, canManage } from "../../utils/permissions.js";
import { ApiError } from "../../utils/ApiError.js";
import { structureSchema, collectSchema } from "./fees.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.FEES));

// Students only look at their own fees; the accountant and full-access roles manage everything
const staffOnly = (req, res, next) =>
  canManage(req.user.role, PERM.FEES) ? next() : next(new ApiError(403, "You do not have permission to do this"));

router.get("/me", ctrl.mine);
router.get("/payments/:id/receipt", ctrl.receipt);

router.get("/structures", staffOnly, ctrl.structures);
router.post("/structures", staffOnly, validate(structureSchema), ctrl.createStructure);
router.put("/structures/:id", staffOnly, validate(structureSchema), ctrl.updateStructure);
router.delete("/structures/:id", staffOnly, ctrl.removeStructure);

router.get("/students", staffOnly, ctrl.students);
router.get("/students/:id", staffOnly, ctrl.studentFees);
router.get("/payments", staffOnly, ctrl.payments);
router.post("/payments", staffOnly, validate(collectSchema), ctrl.collect);

export default router;
