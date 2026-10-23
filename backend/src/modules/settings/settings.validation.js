import { z } from "zod";

export const settingsSchema = z.object({
  loanDays: z.coerce.number().int().min(1).max(120),
  finePerDay: z.coerce.number().min(0).max(1000),
  maxBooksPerStudent: z.coerce.number().int().min(1).max(20),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/, "Enter a valid phone number").optional().or(z.literal("")),
});
