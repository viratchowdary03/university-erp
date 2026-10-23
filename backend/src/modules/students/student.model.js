import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const studentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, sparse: true },
    enrollmentNo: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["M", "F"] },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    school: { type: String, required: true, index: true },
    program: { type: String, trim: true },
    year: { type: Number, min: 1, max: 5, default: 2 },
    semester: { type: Number, min: 1, max: 10, default: 3 },
    section: { type: String, enum: ["A", "B"], default: "A" },
    batch: { type: String, trim: true },
    dateOfBirth: { type: String, trim: true },
    guardianName: { type: String, trim: true },
    guardianPhone: { type: String, trim: true },
    city: { type: String, trim: true },
    cgpa: { type: Number, min: 0, max: 10, default: null }, // filled in when results are entered
  },
  { timestamps: true }
);
studentSchema.plugin(idPlugin);

export const Student = mongoose.models.Student || mongoose.model("Student", studentSchema);
