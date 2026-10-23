import { z } from "zod";

export const PHONE_RE = /^[0-9+\-\s]{10,15}$/;

export const requiredText = (label, max = 100) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);
export const emailRule = z.string().trim().toLowerCase().email("Enter a valid email address");
export const phoneRule = z.string().trim().regex(PHONE_RE, "Enter a valid phone number");
export const objectId = (label) => z.string({ required_error: `${label} is required` }).regex(/^[a-f0-9]{24}$/i, `Choose ${label.toLowerCase()}`);
export const isoDate = (label) => z.string({ required_error: `${label} is required` }).regex(/^\d{4}-\d{2}-\d{2}$/, `Enter a valid ${label.toLowerCase()}`);
export const notFuture = (label) => isoDate(label).refine((d) => new Date(d) <= new Date(), `${label} cannot be in the future`);
export const inThePast = (label) => isoDate(label).refine((d) => new Date(d) < new Date(), `${label} must be in the past`);

// A web address people may click on. Only http(s): a "javascript:" address would run code when clicked.
export const webUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^https?:\/\/[^\s]+$/i.test(v), "Enter a full web address starting with http:// or https://");
