import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const { ObjectId } = mongoose.Schema.Types;

const markSchema = new mongoose.Schema(
  {
    examId: { type: ObjectId, ref: "Exam", required: true },
    studentId: { type: ObjectId, ref: "Student", required: true },
    marks: { type: Number, min: 0, default: null },
    absent: { type: Boolean, default: false },
    enteredBy: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);
markSchema.index({ examId: 1, studentId: 1 }, { unique: true });
markSchema.index({ studentId: 1 });
markSchema.plugin(idPlugin);

export const Mark = mongoose.models.Mark || mongoose.model("Mark", markSchema);
