import { Router } from "express";
import * as ctrl from "./academic.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM } from "../../utils/permissions.js";
import { subjectSchema, createSubjectSchema, programSchema } from "./academic.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.ACADEMIC));

router.get("/", ctrl.overview);
router.post("/subjects", validate(createSubjectSchema), ctrl.createSubject);
router.put("/subjects/:id", validate(subjectSchema), ctrl.updateSubject);
router.delete("/subjects/:id", ctrl.removeSubject);
router.post("/schools/:code/programs", validate(programSchema), ctrl.addProgram);
router.delete("/schools/:code/programs", validate(programSchema), ctrl.removeProgram);

export default router;
