import { Router } from "express";
import * as ctrl from "./auth.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { authLimiter } from "../../middleware/rateLimit.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  registerSchema, verifyOtpSchema, resendOtpSchema, loginSchema, changePasswordSchema,
  forgotPasswordSchema, resetPasswordSchema,
} from "./auth.validation.js";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), ctrl.register);
router.post("/verify-otp", authLimiter, validate(verifyOtpSchema), ctrl.verifyOtp);
router.post("/resend-otp", authLimiter, validate(resendOtpSchema), ctrl.resendOtp);
router.post("/login", authLimiter, validate(loginSchema), ctrl.login);

router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post("/reset-password", authLimiter, validate(resetPasswordSchema), ctrl.resetPassword);

router.get("/me", authenticate, ctrl.me);
router.post("/change-password", authenticate, validate(changePasswordSchema), ctrl.changePassword);

export default router;
