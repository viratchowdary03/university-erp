import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const alumniSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    school: { type: String, required: true, index: true },
    program: { type: String, trim: true },
    graduationYear: { type: Number, required: true, min: 1950, max: 2100, index: true },
    company: { type: String, trim: true },
    designation: { type: String, trim: true },
    city: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 1000 },
    mentor: { type: Boolean, default: false }, // happy to guide current students
  },
  { timestamps: true }
);
alumniSchema.plugin(idPlugin);

export const AlumniProfile = mongoose.models.AlumniProfile || mongoose.model("AlumniProfile", alumniSchema);
