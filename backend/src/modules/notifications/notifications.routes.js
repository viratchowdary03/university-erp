import { Router } from "express";
import * as ctrl from "./notifications.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();
router.use(authenticate); // every signed-in person has their own notifications

router.get("/", ctrl.list);
router.get("/unread-count", ctrl.unread);
router.patch("/read-all", ctrl.readAll);
router.patch("/:id/read", ctrl.read);
router.delete("/:id", ctrl.remove);

export default router;
