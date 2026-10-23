import { z } from "zod";
import { SCHOOL_CODES } from "../../utils/constants.js";
import { requiredText, isoDate } from "../../utils/validators.js";
import { EVENT_TYPES } from "./event.model.js";

const time = z.string().trim().regex(/^\d{2}:\d{2}$/, "Use HH:MM").optional().or(z.literal(""));

export const eventSchema = z.object({
  title: requiredText("Title", 150),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  type: z.enum(EVENT_TYPES, { message: "Choose an event type" }),
  venue: requiredText("Venue", 100),
  date: isoDate("Date"),
  startTime: time,
  endTime: time,
  school: z.enum(SCHOOL_CODES).optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(0).max(100000).default(0),
});
