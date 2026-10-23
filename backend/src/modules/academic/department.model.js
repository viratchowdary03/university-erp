import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

// A school of the university (School of Engineering, School of Nursing, ...) with its programs
const schoolSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    programs: [{ type: String, trim: true }],
  },
  { timestamps: true }
);
schoolSchema.plugin(idPlugin);

export const School = mongoose.models.School || mongoose.model("School", schoolSchema);
