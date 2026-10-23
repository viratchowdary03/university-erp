import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

export const APPLICATION_STATUSES = ["submitted", "under_review", "shortlisted", "approved", "rejected", "enrolled"];

const applicationSchema = new mongoose.Schema(
  {
    applicationNo: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["M", "F"], required: true },
    dateOfBirth: { type: String, required: true },
    school: { type: String, required: true, index: true },
    program: { type: String, required: true, trim: true },
    previousSchool: { type: String, trim: true },
    percentage: { type: Number, min: 0, max: 100, required: true }, // marks in the last qualification
    guardianName: { type: String, trim: true },
    guardianPhone: { type: String, trim: true },
    city: { type: String, trim: true },
    statement: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: APPLICATION_STATUSES, default: "submitted", index: true },
    remarks: { type: String, trim: true, maxlength: 500 },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    decidedAt: { type: Date },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  },
  { timestamps: true }
);
applicationSchema.plugin(idPlugin);

export const Application = mongoose.models.Application || mongoose.model("Application", applicationSchema);
