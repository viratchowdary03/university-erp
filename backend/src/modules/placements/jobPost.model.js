import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const jobPostSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["Full-time", "Internship"], default: "Full-time" },
    location: { type: String, trim: true },
    packageLpa: { type: Number, min: 0 }, // yearly package in lakh rupees (for internships: stipend per month in thousands is not used)
    openings: { type: Number, min: 1, default: 1 },
    description: { type: String, trim: true, maxlength: 2000 },
    minCgpa: { type: Number, min: 0, max: 10, default: 0 },
    schools: [{ type: String }], // empty = open to every school
    deadline: { type: String, required: true }, // YYYY-MM-DD
    status: { type: String, enum: ["open", "closed"], default: "open", index: true },
  },
  { timestamps: true }
);
jobPostSchema.plugin(idPlugin);

export const JobPost = mongoose.models.JobPost || mongoose.model("JobPost", jobPostSchema);
