import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const facultySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, sparse: true }, // set when the person has a login
    employeeId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["M", "F"] },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    school: { type: String, required: true, index: true },
    department: { type: String, trim: true }, // program the person belongs to
    designation: { type: String, trim: true },
    qualification: { type: String, trim: true },
    experienceYears: { type: Number, min: 0, max: 60, default: 0 },
    isHod: { type: Boolean, default: false },
  },
  { timestamps: true }
);
facultySchema.plugin(idPlugin);

export const Faculty = mongoose.models.Faculty || mongoose.model("Faculty", facultySchema);
