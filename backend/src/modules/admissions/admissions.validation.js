import { z } from "zod";
import { SCHOOL_CODES } from "../../utils/constants.js";
import { requiredText, emailRule, phoneRule, inThePast } from "../../utils/validators.js";
import { APPLICATION_STATUSES } from "./application.model.js";

export const applySchema = z.object({
  name: requiredText("Full name"),
  email: emailRule,
  phone: phoneRule,
  gender: z.enum(["M", "F"], { message: "Select gender" }),
  dateOfBirth: inThePast("Date of birth"),
  school: z.enum(SCHOOL_CODES, { message: "Select a school" }),
  program: requiredText("Program"),
  previousSchool: requiredText("Previous school or college", 150),
  percentage: z.coerce.number({ invalid_type_error: "Enter your percentage" }).min(0).max(100),
  guardianName: requiredText("Guardian name"),
  guardianPhone: phoneRule,
  city: requiredText("City"),
  statement: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const statusLookupSchema = z.object({
  applicationNo: requiredText("Application number", 30),
  email: emailRule,
});

export const decisionSchema = z.object({
  status: z.enum(APPLICATION_STATUSES.filter((s) => s !== "submitted" && s !== "enrolled"), { message: "Choose a valid status" }),
  remarks: z.string().trim().max(500).optional().or(z.literal("")),
});
