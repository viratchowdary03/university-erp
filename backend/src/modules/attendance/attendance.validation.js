import { z } from "zod";
import { objectId } from "../../utils/validators.js";

export const markSchema = z.object({
  subjectCode: z.string().trim().min(1, "Choose a subject").max(20),
  presentIds: z.array(objectId("a student")).max(500),
});
