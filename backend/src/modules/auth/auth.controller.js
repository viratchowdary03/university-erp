import { asyncHandler } from "../../utils/asyncHandler.js";
import * as authService from "./auth.service.js";
import { FULL_ACCESS_ROLES as PRIVILEGED } from "../../utils/constants.js";

const send = (res, status, message, data = null) =>
  res.status(status).json({ success: true, message, data });

export const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  send(res, 201, "Verification code sent to your email", data);
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const data = await authService.verifyOtp(req.body.email, req.body.otp);
  const approver = PRIVILEGED.includes(data.role)
    ? "a Super Admin"
    : "the Super Admin, Registrar or Admin";
  send(res, 200, `Email verified. Your request is waiting for approval by ${approver}`, data);
});

export const resendOtp = asyncHandler(async (req, res) => {
  await authService.resendOtp(req.body.email);
  send(res, 200, "If this email is waiting for verification, a new code has been sent");
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body.email, req.body.password);
  send(res, 200, "Signed in", data);
});

export const me = asyncHandler(async (req, res) => {
  send(res, 200, "OK", { user: req.user.toSafeJSON() });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);
  send(res, 200, "Password changed successfully");
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  send(res, 200, "If an account exists for this email, a reset code has been sent");
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.email, req.body.otp, req.body.newPassword);
  send(res, 200, "Password reset. You can sign in with the new password");
});
