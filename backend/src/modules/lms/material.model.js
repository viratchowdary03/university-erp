import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const materialSchema = new mongoose.Schema(
  {
    courseCode: { type: String, required: true, index: true },
    school: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    kind: { type: String, enum: ["Link", "Video", "Notes"], default: "Link" },
    url: { type: String, trim: true, maxlength: 500 }, // a web address (files are shared as links)
    description: { type: String, trim: true, maxlength: 1000 },
    unit: { type: Number, min: 0, default: 0 },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    postedByName: { type: String },
  },
  { timestamps: true }
);
materialSchema.plugin(idPlugin);

export const Material = mongoose.models.Material || mongoose.model("Material", materialSchema);
