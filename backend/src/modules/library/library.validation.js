import { z } from "zod";
import { requiredText, objectId } from "../../utils/validators.js";

export const bookSchema = z.object({
  title: requiredText("Title", 200),
  author: requiredText("Author", 120),
  isbn: z.string().trim().max(20).optional().or(z.literal("")),
  category: requiredText("Category", 60),
  publisher: z.string().trim().max(100).optional().or(z.literal("")),
  year: z.coerce.number().int().min(1000).max(3000).optional().or(z.literal("").transform(() => undefined)),
  shelf: z.string().trim().max(30).optional().or(z.literal("")),
  copies: z.coerce.number().int().min(1, "At least 1 copy").max(500),
});

export const issueSchema = z.object({
  bookId: objectId("Book"),
  // an enrollment number or an email address
  member: requiredText("Student", 80),
});

