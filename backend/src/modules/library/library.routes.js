import { Router } from "express";
import * as ctrl from "./library.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERM, canManage } from "../../utils/permissions.js";
import { ApiError } from "../../utils/ApiError.js";
import { bookSchema, issueSchema } from "./library.validation.js";

const router = Router();
router.use(authenticate, requirePermission(PERM.LIBRARY));

const staffOnly = (req, res, next) =>
  canManage(req.user.role, PERM.LIBRARY) ? next() : next(new ApiError(403, "You do not have permission to do this"));

router.get("/books", ctrl.books);
router.get("/me", ctrl.mine);

router.get("/summary", staffOnly, ctrl.summary);
router.post("/books", staffOnly, validate(bookSchema), ctrl.createBook);
router.put("/books/:id", staffOnly, validate(bookSchema), ctrl.updateBook);
router.delete("/books/:id", staffOnly, ctrl.removeBook);
router.get("/issues", staffOnly, ctrl.issues);
router.post("/issues", staffOnly, validate(issueSchema), ctrl.issue);
router.post("/issues/:id/return", staffOnly, ctrl.giveBack);
router.post("/issues/:id/renew", staffOnly, ctrl.renew);

export default router;
