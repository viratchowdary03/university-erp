import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const assignmentSchema = new mongoose.Schema(
  {
    courseCode: { type: String, required: true, index: true },
    school: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000 },
    dueDate: { type: Date, required: true },
    marks: { type: Number, required: true, min: 1, max: 1000 },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
assignmentSchema.plugin(idPlugin);

export const Assignment = mongoose.models.Assignment || mongoose.model("Assignment", assignmentSchema);
