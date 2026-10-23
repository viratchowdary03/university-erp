import { Router } from "express";
import * as ctrl from "./students.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM } from "../../utils/permissions.js";
import { createStudentSchema, updateStudentSchema } from "./students.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.STUDENTS));

router.get("/", ctrl.list);
router.get("/:id", ctrl.details);
router.post("/", validate(createStudentSchema), ctrl.create);
router.put("/:id", validate(updateStudentSchema), ctrl.update);
router.delete("/:id", ctrl.remove);

export default router;
