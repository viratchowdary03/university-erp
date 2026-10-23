import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const { ObjectId } = mongoose.Schema.Types;

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: { type: ObjectId, ref: "Assignment", required: true },
    studentId: { type: ObjectId, ref: "Student", required: true },
    text: { type: String, trim: true, maxlength: 5000 },
    link: { type: String, trim: true, maxlength: 500 },
    late: { type: Boolean, default: false },
    marks: { type: Number, min: 0, default: null },
    feedback: { type: String, trim: true, maxlength: 1000 },
    gradedBy: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
submissionSchema.plugin(idPlugin);

export const Submission = mongoose.models.Submission || mongoose.model("Submission", submissionSchema);
