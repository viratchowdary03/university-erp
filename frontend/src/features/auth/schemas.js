import { z } from "zod";
import { ROLES } from "../../config/roles";
import { ROLE_FIELDS } from "../../config/roleFields";

const MOCK = import.meta.env.VITE_MOCK_AUTH === "true";
const PHONE_RE = /^[0-9+\-\s]{10,15}$/;

const emailRule = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address");

const strongPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[0-9]/, "Add a number");

export const passwordRules = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "One number", test: (v) => /[0-9]/.test(v) },
];

// In demo mode email/password are optional; the role (and school) are chosen from dropdowns.
export const loginSchema = MOCK
  ? z.object({
      role: z.enum(Object.values(ROLES)),
      school: z.string().optional(),
      email: z.string().trim().optional(),
      password: z.string().optional(),
    })
  : z.object({
      email: emailRule,
      password: z.string().min(1, "Password is required"),
    });

// ---------- registration: the questions depend on the chosen role ----------
function ruleFor(field) {
  const { label, kind } = field;
  let rule;
  switch (kind) {
    case "number":
      // An empty box must not count as 0
      rule = z.preprocess(
        (v) => (v === "" || v == null ? undefined : v),
        z.coerce
          .number({ invalid_type_error: `Enter ${label.toLowerCase()}`, required_error: `Enter ${label.toLowerCase()}` })
          .int("Use whole numbers")
          .min(field.min ?? 0, `Cannot be less than ${field.min ?? 0}`)
          .max(field.max ?? 100, "That looks too high")
      );
      break;
    case "tel":
      rule = z.string().trim().regex(PHONE_RE, "Enter a valid phone number");
      break;
    case "date":
      rule = z
        .string()
        .min(1, `${label} is required`)
        .refine((d) => new Date(d) < new Date(), `${label} must be in the past`);
      break;
    case "school":
      rule = z.string().min(1, "Select your school");
      break;
    case "program":
    case "select":
      rule = z.string().min(1, `Select ${label.toLowerCase()}`);
      break;
    default:
      rule = z.string().trim().min(1, `${label} is required`).max(field.max ?? 100);
  }
  return field.required === false ? rule.optional().or(z.literal("")) : rule;
}

export function buildRegisterSchema(role) {
  const shape = {
    role: z.enum(Object.values(ROLES), { message: "Choose a role" }),
    name: z.string().trim().min(2, "Enter your full name"),
    email: emailRule,
    phone: z.string().trim().regex(PHONE_RE, "Enter a valid phone number").or(z.literal("")),
    password: strongPassword,
    confirmPassword: z.string().min(1, "Confirm your password"),
  };
  (ROLE_FIELDS[role] || []).forEach((field) => {
    shape[field.name] = ruleFor(field);
  });
  return z.object(shape).refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
}

export const otpSchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const forgotPasswordSchema = z.object({ email: emailRule });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: strongPassword,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current one",
  });
