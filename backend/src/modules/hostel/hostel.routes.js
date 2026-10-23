import { Router } from "express";
import * as ctrl from "./hostel.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM } from "../../utils/permissions.js";
import { allocateSchema, updateAllocationSchema } from "./hostel.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.HOSTEL));

router.get("/overview", ctrl.overview); // full-access roles
router.get("/me", ctrl.mine); // student
router.get("/allocatable", ctrl.allocatable);
router.get("/suggest", ctrl.suggest);
router.post("/allocations", validate(allocateSchema), ctrl.allocate);
router.put("/allocations/:studentId", validate(updateAllocationSchema), ctrl.update);
router.delete("/allocations/:studentId", ctrl.vacate);

export default router;
