import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

export const EXAM_TYPES = ["Internal", "Midterm", "Final", "Practical"];

const examSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: EXAM_TYPES, default: "Internal" },
    subjectCode: { type: String, required: true, index: true },
    school: { type: String, required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    startTime: { type: String, trim: true }, // HH:mm
    venue: { type: String, trim: true },
    maxMarks: { type: Number, required: true, min: 1, max: 500 },
    published: { type: Boolean, default: false }, // students see marks and results only after publishing
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
examSchema.plugin(idPlugin);

export const Exam = mongoose.models.Exam || mongoose.model("Exam", examSchema);
