import api from "../../api/axios";
import { FULL_ACCESS_ROLES } from "../../config/permissions";
import { addDemoRequest } from "../settings/settingsApi";

const MOCK = import.meta.env.VITE_MOCK_AUTH === "true";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Demo mode (no backend): any registration works and the code is always 123456
export const DEMO_OTP = "123456";

const approverFor = (role) =>
  FULL_ACCESS_ROLES.includes(role) ? "a Super Admin" : "the Super Admin, Registrar or Admin";

export async function registerUser(payload) {
  if (MOCK) {
    await delay(800);
    addDemoRequest(payload);
    sessionStorage.setItem("demo-register-role", payload.role);
    return { email: payload.email };
  }
  const { data } = await api.post("/auth/register", payload);
  return data.data;
}

export async function verifyOtp({ email, otp }) {
  if (MOCK) {
    await delay(600);
    if (otp !== DEMO_OTP) throw new Error("Incorrect code");
    const role = sessionStorage.getItem("demo-register-role");
    return {
      status: "pending_approval",
      message: `Email verified. Your request is waiting for approval by ${approverFor(role)}`,
    };
  }
  const { data } = await api.post("/auth/verify-otp", { email, otp });
  return { ...data.data, message: data.message };
}

export async function resendOtp(email) {
  if (MOCK) {
    await delay(500);
    return;
  }
  await api.post("/auth/resend-otp", { email });
}

export async function forgotPassword(email) {
  if (MOCK) {
    await delay(700);
    return { message: "Reset code sent (demo mode). Use 123456." };
  }
  const { data } = await api.post("/auth/forgot-password", { email });
  return data;
}

export async function resetPassword({ email, otp, newPassword }) {
  if (MOCK) {
    await delay(700);
    return { message: "Password reset (demo mode)." };
  }
  const { data } = await api.post("/auth/reset-password", { email, otp, newPassword });
  return data;
}

export async function changePassword({ currentPassword, newPassword }) {
  if (MOCK) {
    await delay(700);
    return { message: "Password changed (demo mode)." };
  }
  const { data } = await api.post("/auth/change-password", { currentPassword, newPassword });
  return data;
}
