import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const courseSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true }, // same as the subject code
    name: { type: String, required: true },
    school: { type: String, required: true, index: true },
    type: { type: String, enum: ["Theory", "Lab"], default: "Theory" },
    credits: { type: Number, default: 3 },
    description: { type: String, trim: true },
    units: [{ _id: false, no: Number, title: String, lessons: Number }],
    materials: { type: Number, default: 0 },
    assignments: [{ title: String, dueDate: Date, marks: Number }],
  },
  { timestamps: true }
);
courseSchema.plugin(idPlugin);

export const Course = mongoose.models.Course || mongoose.model("Course", courseSchema);
