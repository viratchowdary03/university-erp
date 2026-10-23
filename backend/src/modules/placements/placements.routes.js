import { Router } from "express";
import * as ctrl from "./placements.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM, canManage } from "../../utils/permissions.js";
import { ApiError } from "../../utils/ApiError.js";
import { companySchema, jobSchema, applicationStatusSchema } from "./placements.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.PLACEMENTS));

const staffOnly = (req, res, next) =>
  canManage(req.user.role, PERM.PLACEMENTS) ? next() : next(new ApiError(403, "You do not have permission to do this"));

router.get("/jobs", ctrl.jobs);
router.get("/applications/mine", ctrl.mine);
router.post("/jobs/:id/apply", ctrl.apply);

router.get("/stats", staffOnly, ctrl.stats);
router.get("/companies", staffOnly, ctrl.companies);
router.post("/companies", staffOnly, validate(companySchema), ctrl.createCompany);
router.put("/companies/:id", staffOnly, validate(companySchema), ctrl.updateCompany);
router.delete("/companies/:id", staffOnly, ctrl.removeCompany);
router.post("/jobs", staffOnly, validate(jobSchema), ctrl.createJob);
router.put("/jobs/:id", staffOnly, validate(jobSchema), ctrl.updateJob);
router.delete("/jobs/:id", staffOnly, ctrl.removeJob);
router.get("/jobs/:id/applications", staffOnly, ctrl.applicants);
router.patch("/applications/:id", staffOnly, validate(applicationStatusSchema), ctrl.setStatus);

export default router;
