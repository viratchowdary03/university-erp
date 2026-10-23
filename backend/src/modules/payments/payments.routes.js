import { Router } from "express";
import * as ctrl from "./payments.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM } from "../../utils/permissions.js";
import { orderSchema, confirmSchema } from "./payments.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.FEES));

router.get("/gateway", ctrl.info);
router.get("/", ctrl.mine);
router.post("/orders", validate(orderSchema), ctrl.create);
router.get("/orders/:orderId", ctrl.get);
router.post("/orders/:orderId/confirm", validate(confirmSchema), ctrl.confirm);

export default router;
