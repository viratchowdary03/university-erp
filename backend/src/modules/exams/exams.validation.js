import { z } from "zod";
import { requiredText, isoDate, objectId } from "../../utils/validators.js";
import { EXAM_TYPES } from "./exam.model.js";

export const examSchema = z.object({
  name: requiredText("Exam name", 100),
  type: z.enum(EXAM_TYPES, { message: "Choose an exam type" }),
  subjectCode: requiredText("Subject", 12).transform((s) => s.toUpperCase()),
  date: isoDate("Exam date"),
  startTime: z.string().trim().regex(/^\d{2}:\d{2}$/, "Use HH:MM").optional().or(z.literal("")),
  venue: z.string().trim().max(100).optional().or(z.literal("")),
  maxMarks: z.coerce.number().min(1, "At least 1").max(500),
});

export const marksSchema = z.object({
  entries: z.array(z.object({
    studentId: objectId("Student"),
    marks: z.coerce.number().min(0).nullable().optional(),
    absent: z.boolean().optional(),
  })).min(1, "Nothing to save").max(1000),
});

export const publishSchema = z.object({ published: z.boolean() });
