import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

// Slows down password guessing and OTP spam
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === "production" ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again in a few minutes." },
});
