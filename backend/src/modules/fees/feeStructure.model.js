import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

// What a group of students owes for a period, e.g. "Semester 3 fee" for B.Tech Computer Science
const feeStructureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    school: { type: String, required: true, index: true },
    program: { type: String, trim: true, default: "" }, // empty = every program of the school
    components: [{ _id: false, name: { type: String, required: true, trim: true }, amount: { type: Number, required: true, min: 0 } }],
    total: { type: Number, required: true, min: 0 },
    dueDate: { type: String, required: true }, // YYYY-MM-DD
  },
  { timestamps: true }
);
feeStructureSchema.plugin(idPlugin);

export const FeeStructure = mongoose.models.FeeStructure || mongoose.model("FeeStructure", feeStructureSchema);
