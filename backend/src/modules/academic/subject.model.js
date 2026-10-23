import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const subjectSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    school: { type: String, required: true, index: true }, // school code
    type: { type: String, enum: ["Theory", "Lab"], default: "Theory" },
    credits: { type: Number, min: 0, max: 12, default: 3 },
    semester: { type: Number, min: 1, max: 10, default: 3 },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", default: null }, // null = no teacher yet
  },
  { timestamps: true }
);
subjectSchema.plugin(idPlugin);

export const Subject = mongoose.models.Subject || mongoose.model("Subject", subjectSchema);
