import { z } from "zod";
import { STAFF_ROLES, SCHOOL_CODES, ROLES } from "../../utils/constants.js";
import { passwordRule } from "../auth/auth.validation.js";

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: passwordRule,
  role: z.enum([...STAFF_ROLES, ROLES.STUDENT], { message: "Choose a valid role" }),
  school: z.enum(SCHOOL_CODES).optional(),
  department: z.string().trim().max(120).optional(),
});

export const statusSchema = z.object({ status: z.enum(["active", "suspended"], { message: "Choose active or suspended" }) });
