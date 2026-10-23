import { Router } from "express";
import * as ctrl from "./faculty.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM } from "../../utils/permissions.js";
import { createFacultySchema, updateFacultySchema } from "./faculty.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.FACULTY));

router.get("/", ctrl.list);
router.post("/", validate(createFacultySchema), ctrl.create);
router.put("/:id", validate(updateFacultySchema), ctrl.update);
router.delete("/:id", ctrl.remove);

export default router;
