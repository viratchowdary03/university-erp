import { z } from "zod";
import { ROLE_VALUES, SCHOOL_CODES } from "../../utils/constants.js";
import { requiredText, isoDate } from "../../utils/validators.js";

export const noticeSchema = z.object({
  title: requiredText("Title", 150),
  body: requiredText("Message", 3000),
  audience: z.array(z.enum(ROLE_VALUES)).max(8).default([]),
  school: z.enum(SCHOOL_CODES).optional().or(z.literal("")),
  priority: z.enum(["normal", "important", "urgent"]).default("normal"),
  pinned: z.boolean().default(false),
  expiresAt: isoDate("Expiry date").optional().or(z.literal("")),
});
