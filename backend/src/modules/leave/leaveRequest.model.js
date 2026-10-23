import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const { ObjectId } = mongoose.Schema.Types;
export const LEAVE_TYPES = ["Casual", "Sick", "Medical", "Duty", "Other"];

const leaveSchema = new mongoose.Schema(
  {
    applicantId: { type: ObjectId, ref: "User", required: true, index: true },
    applicantName: { type: String, required: true },
    applicantRole: { type: String, required: true },
    school: { type: String, index: true },
    type: { type: String, enum: LEAVE_TYPES, required: true },
    fromDate: { type: String, required: true }, // YYYY-MM-DD
    toDate: { type: String, required: true },
    days: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ["pending", "approved", "rejected", "cancelled"], default: "pending", index: true },
    decidedBy: { type: ObjectId, ref: "User" },
    decidedByName: { type: String },
    decisionNote: { type: String, trim: true, maxlength: 300 },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);
leaveSchema.plugin(idPlugin);

export const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model("LeaveRequest", leaveSchema);
