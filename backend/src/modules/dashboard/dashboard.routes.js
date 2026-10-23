import { Router } from "express";
import * as ctrl from "./dashboard.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();
router.use(authenticate);

router.get("/admin", ctrl.admin);
router.get("/faculty", ctrl.faculty);
router.get("/student", ctrl.student);
router.get("/accountant", ctrl.accountant);
router.get("/librarian", ctrl.librarian);

export default router;
