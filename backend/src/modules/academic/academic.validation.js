import { z } from "zod";
import { requiredText } from "../../utils/validators.js";

export const subjectSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,12}$/, "Use 3-12 letters or digits for the code"),
  name: requiredText("Subject name", 100),
  type: z.enum(["Theory", "Lab"], { message: "Choose Theory or Lab" }),
  credits: z.coerce.number().int().min(0).max(12),
  semester: z.coerce.number().int().min(1).max(10),
  facultyId: z.string().regex(/^[a-f0-9]{24}$/i, "Choose a faculty member").nullable().optional().or(z.literal("").transform(() => null)),
});
export const createSubjectSchema = subjectSchema.extend({ school: z.string().trim().toUpperCase().min(2).max(5) });
export const programSchema = z.object({ program: requiredText("Program name", 100) });
