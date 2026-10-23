import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    industry: { type: String, trim: true },
    website: { type: String, trim: true },
    contactName: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);
companySchema.plugin(idPlugin);

export const Company = mongoose.models.Company || mongoose.model("Company", companySchema);
