import { z } from "zod";
import { SCHOOL_CODES, FACULTY_DESIGNATIONS } from "../../utils/constants.js";
import { requiredText, emailRule, phoneRule } from "../../utils/validators.js";

const fields = {
  name: requiredText("Full name"),
  email: emailRule,
  phone: phoneRule,
  gender: z.enum(["M", "F"], { message: "Select gender" }),
  department: requiredText("Program or department"),
  designation: z.enum(FACULTY_DESIGNATIONS, { message: "Select a designation" }),
  qualification: requiredText("Qualification"),
  experienceYears: z.coerce.number({ invalid_type_error: "Enter the years of experience" }).int().min(0).max(60),
  subjectCodes: z.array(z.string().max(20)).max(20).default([]),
};

export const createFacultySchema = z.object({ ...fields, school: z.enum(SCHOOL_CODES, { message: "Select a school" }) });
export const updateFacultySchema = z.object(fields);
