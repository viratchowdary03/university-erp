import { z } from "zod";
import { requiredText } from "../../utils/validators.js";
import { CATEGORIES, TICKET_STATUSES } from "./ticket.model.js";

export const ticketSchema = z.object({
  category: z.enum(CATEGORIES, { message: "Choose a category" }),
  subject: requiredText("Subject", 150),
  description: requiredText("Description", 3000),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});
export const commentSchema = z.object({ text: requiredText("Comment", 1500) });
export const statusSchema = z.object({ status: z.enum(TICKET_STATUSES, { message: "Choose a status" }) });
