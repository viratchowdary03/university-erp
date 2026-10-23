import { z } from "zod";
import { SCHOOL_CODES } from "../../utils/constants.js";
import { requiredText, emailRule, phoneRule, inThePast } from "../../utils/validators.js";

const fields = {
  name: requiredText("Full name"),
  email: emailRule,
  phone: phoneRule,
  gender: z.enum(["M", "F"], { message: "Select gender" }),
  dateOfBirth: inThePast("Date of birth"),
  program: requiredText("Program"),
  section: z.enum(["A", "B"], { message: "Select section" }),
  city: requiredText("City"),
  guardianName: requiredText("Guardian name"),
  guardianPhone: phoneRule,
};

export const createStudentSchema = z.object({ ...fields, school: z.enum(SCHOOL_CODES, { message: "Select a school" }) });
// The school cannot change after a student exists, so it is ignored when updating
export const updateStudentSchema = z.object(fields);
