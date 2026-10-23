import { z } from "zod";
import { requiredText, webUrl } from "../../utils/validators.js";

const url = webUrl;

export const materialSchema = z.object({
  title: requiredText("Title", 150),
  kind: z.enum(["Link", "Video", "Notes"]),
  url: url.optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  unit: z.coerce.number().int().min(0).max(30).default(0),
}).refine((m) => m.url || m.description, { message: "Add a link or some text", path: ["url"] });

export const assignmentSchema = z.object({
  title: requiredText("Title", 150),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Choose a due date"),
  marks: z.coerce.number().int().min(1).max(1000),
});

export const submitSchema = z.object({
  text: z.string().trim().max(5000).optional().or(z.literal("")),
  link: url.optional().or(z.literal("")),
}).refine((s) => s.text || s.link, { message: "Write an answer or add a link", path: ["text"] });

export const gradeSchema = z.object({
  marks: z.coerce.number().min(0),
  feedback: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const quizSchema = z.object({
  title: requiredText("Title", 150),
  durationMin: z.coerce.number().int().min(1).max(300),
  questions: z.array(z.object({
    text: requiredText("Question", 500),
    options: z.array(requiredText("Option", 200)).min(2, "Give at least 2 options").max(6),
    correct: z.coerce.number().int().min(0),
  }).refine((q) => q.correct < q.options.length, { message: "Pick the right answer from the options", path: ["correct"] })).min(1, "Add at least one question").max(50),
});

export const attemptSchema = z.object({ answers: z.array(z.coerce.number().int().min(-1)).min(1).max(50) });
