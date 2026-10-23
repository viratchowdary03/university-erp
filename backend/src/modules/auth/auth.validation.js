import { z } from "zod";
import {
  ROLE_VALUES, SCHOOL_CODES, FACULTY_DESIGNATIONS, ADMIN_OFFICES,
} from "../../utils/constants.js";

const email = z.string().trim().toLowerCase().email("Enter a valid email address");

export const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long")
  .regex(/[A-Z]/, "Password needs an uppercase letter")
  .regex(/[a-z]/, "Password needs a lowercase letter")
  .regex(/[0-9]/, "Password needs a number");

// ---------- reusable field rules ----------
const text = (label, max = 100) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);
const phone = z.string().trim().regex(/^[0-9+\-\s]{10,15}$/, "Enter a valid phone number");
const experienceYears = z.coerce.number({ invalid_type_error: "Enter the years of experience" })
  .int("Use whole years").min(0, "Cannot be negative").max(60, "That looks too high");
const school = z.enum(SCHOOL_CODES, { message: "Select your school" });
const pastDate = z
  .string({ required_error: "Date of birth is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .refine((d) => new Date(d) < new Date(), "Date of birth must be in the past");

// ---------- details required for each role ----------
const roleDetails = {
  super_admin: {
    employeeId: text("Employee ID", 30),
    designation: text("Designation"),
    reason: text("Reason for requesting this access", 300),
  },
  registrar: {
    employeeId: text("Employee ID", 30),
    designation: text("Designation"),
    qualification: text("Qualification"),
    experienceYears,
  },
  admin: {
    employeeId: text("Employee ID", 30),
    designation: text("Designation"),
    officeName: z.enum(ADMIN_OFFICES, { message: "Select your office" }),
    experienceYears,
  },
  hod: {
    employeeId: text("Employee ID", 30),
    school,
    department: text("Department or program"),
    qualification: text("Qualification"),
    specialization: text("Specialization"),
    experienceYears,
  },
  faculty: {
    employeeId: text("Employee ID", 30),
    school,
    department: text("Department or program"),
    designation: z.enum(FACULTY_DESIGNATIONS, { message: "Select your designation" }),
    qualification: text("Qualification"),
    specialization: text("Specialization"),
    experienceYears,
  },
  student: {
    enrollmentNo: z.string().trim().max(30).optional(),
    gender: z.enum(["M", "F"], { message: "Select your gender" }),
    school,
    department: text("Program"),
    year: z.coerce.number({ invalid_type_error: "Select your year" }).int().min(1).max(5),
    dateOfBirth: pastDate,
    guardianName: text("Guardian name"),
    guardianPhone: phone,
  },
  accountant: {
    employeeId: text("Employee ID", 30),
    qualification: text("Qualification"),
    experienceYears,
  },
  librarian: {
    employeeId: text("Employee ID", 30),
    qualification: text("Qualification"),
    experienceYears,
  },
};

const common = {
  name: z.string().trim().min(2, "Enter your full name").max(100),
  email,
  phone: phone.optional().or(z.literal("").transform(() => undefined)),
  password: passwordRule,
};

// Anyone can ask for any role. The account stays inactive until an approver says yes.
export const registerSchema = z.discriminatedUnion(
  "role",
  ROLE_VALUES.map((role) =>
    z.object({ role: z.literal(role, { message: "Choose a valid role" }), ...common, ...roleDetails[role] })
  )
);

export const verifyOtpSchema = z.object({
  email,
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const resendOtpSchema = z.object({ email });

export const loginSchema = z.object({
  email,
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordRule,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  email,
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
  newPassword: passwordRule,
});
