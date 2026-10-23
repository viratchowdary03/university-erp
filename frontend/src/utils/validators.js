import { z } from "zod";

// Small building blocks shared by the forms
export const PHONE_RE = /^[0-9+\-\s]{10,15}$/;

export const requiredText = (label, max = 100) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

export const emailRule = z.string().trim().min(1, "Email is required").email("Enter a valid email address");
export const phoneRule = z.string().trim().regex(PHONE_RE, "Enter a valid phone number");
export const choice = (label) => z.string().min(1, `Select ${label.toLowerCase()}`);

export const pastDate = (label) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine((d) => new Date(d) < new Date(), `${label} must be in the past`);

export const notFutureDate = (label) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine((d) => new Date(d) <= new Date(), `${label} cannot be in the future`);
