import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const { ObjectId } = mongoose.Schema.Types;

// Running totals for one student in one subject
const summarySchema = new mongoose.Schema({
  studentId: { type: ObjectId, ref: "Student", required: true },
  subjectCode: { type: String, required: true },
  held: { type: Number, default: 0, min: 0 },
  attended: { type: Number, default: 0, min: 0 },
});
summarySchema.index({ studentId: 1, subjectCode: 1 }, { unique: true });
summarySchema.plugin(idPlugin);

// One saved attendance sheet. The unique index is what stops a subject being saved twice in a day.
const sessionSchema = new mongoose.Schema(
  {
    subjectCode: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    school: { type: String, required: true },
    markedBy: { type: ObjectId, ref: "User", required: true },
    presentIds: [{ type: ObjectId, ref: "Student" }],
    absentIds: [{ type: ObjectId, ref: "Student" }],
  },
  { timestamps: true }
);
sessionSchema.index({ subjectCode: 1, date: 1 }, { unique: true });
sessionSchema.plugin(idPlugin);

export const AttendanceSummary = mongoose.models.AttendanceSummary || mongoose.model("AttendanceSummary", summarySchema);
export const AttendanceSession = mongoose.models.AttendanceSession || mongoose.model("AttendanceSession", sessionSchema);
