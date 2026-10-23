import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const { ObjectId } = mongoose.Schema.Types;

// A student's bed. A student has at most one, and a bed has at most one student.
const allocationSchema = new mongoose.Schema(
  {
    studentId: { type: ObjectId, ref: "Student", required: true, unique: true },
    hostelId: { type: ObjectId, ref: "Hostel", required: true },
    room: { type: String, required: true, match: /^\d{3}$/ },
    bed: { type: String, enum: ["A", "B", "C"], required: true },
    mess: { type: String, enum: ["Veg", "Non-Veg"], required: true },
    feeStatus: { type: String, enum: ["Paid", "Partial", "Pending"], default: "Pending" },
    checkIn: { type: String, required: true }, // YYYY-MM-DD
  },
  { timestamps: true }
);
allocationSchema.index({ hostelId: 1, room: 1, bed: 1 }, { unique: true });
allocationSchema.plugin(idPlugin);

export const Allocation = mongoose.models.Allocation || mongoose.model("Allocation", allocationSchema);
