import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const { ObjectId } = mongoose.Schema.Types;
export const APPLICATION_STATUSES = ["applied", "shortlisted", "interview", "selected", "rejected"];

const applicationSchema = new mongoose.Schema(
  {
    jobId: { type: ObjectId, ref: "JobPost", required: true },
    studentId: { type: ObjectId, ref: "Student", required: true, index: true },
    status: { type: String, enum: APPLICATION_STATUSES, default: "applied" },
    note: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);
applicationSchema.index({ jobId: 1, studentId: 1 }, { unique: true });
applicationSchema.plugin(idPlugin);

export const PlacementApplication = mongoose.models.PlacementApplication || mongoose.model("PlacementApplication", applicationSchema);
