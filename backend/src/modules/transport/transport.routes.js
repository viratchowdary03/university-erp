import { Router } from "express";
import * as ctrl from "./transport.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM, canManage } from "../../utils/permissions.js";
import { ApiError } from "../../utils/ApiError.js";
import { vehicleSchema, routeSchema, allocationSchema } from "./transport.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.TRANSPORT));

const staffOnly = (req, res, next) =>
  canManage(req.user.role, PERM.TRANSPORT) ? next() : next(new ApiError(403, "You do not have permission to do this"));

router.get("/me", ctrl.mine);

router.get("/overview", staffOnly, ctrl.overview);
router.post("/vehicles", staffOnly, validate(vehicleSchema), ctrl.createVehicle);
router.put("/vehicles/:id", staffOnly, validate(vehicleSchema), ctrl.updateVehicle);
router.delete("/vehicles/:id", staffOnly, ctrl.removeVehicle);
router.post("/routes", staffOnly, validate(routeSchema), ctrl.createRoute);
router.put("/routes/:id", staffOnly, validate(routeSchema), ctrl.updateRoute);
router.delete("/routes/:id", staffOnly, ctrl.removeRoute);
router.get("/allocatable", staffOnly, ctrl.allocatable);
router.post("/allocations", staffOnly, validate(allocationSchema), ctrl.allocate);
router.delete("/allocations/:studentId", staffOnly, ctrl.release);

export default router;
