import { z } from "zod";
import { SCHOOL_CODES } from "../../utils/constants.js";
import { requiredText, emailRule, webUrl } from "../../utils/validators.js";

const optional = (max) => z.string().trim().max(max).optional().or(z.literal(""));

export const alumniSchema = z.object({
  name: requiredText("Name"),
  email: emailRule.optional().or(z.literal("")),
  school: z.enum(SCHOOL_CODES, { message: "Select a school" }),
  program: optional(100),
  graduationYear: z.coerce.number({ invalid_type_error: "Enter the year" }).int().min(1950).max(new Date().getFullYear() + 1),
  company: optional(100),
  designation: optional(100),
  city: optional(80),
  linkedin: webUrl.optional().or(z.literal("")),
  bio: optional(1000),
  mentor: z.boolean().default(false),
});
