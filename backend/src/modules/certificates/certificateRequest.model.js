import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const { ObjectId } = mongoose.Schema.Types;
export const CERTIFICATE_TYPES = ["Bonafide Certificate", "Character Certificate", "Transcript", "Transfer Certificate", "No Objection Certificate", "Migration Certificate"];

const certificateSchema = new mongoose.Schema(
  {
    requestNo: { type: String, required: true, unique: true },
    studentId: { type: ObjectId, ref: "Student", required: true, index: true },
    type: { type: String, enum: CERTIFICATE_TYPES, required: true },
    purpose: { type: String, required: true, trim: true, maxlength: 300 },
    status: { type: String, enum: ["pending", "approved", "rejected", "issued"], default: "pending", index: true },
    remarks: { type: String, trim: true, maxlength: 300 },
    certificateNo: { type: String },
    decidedBy: { type: ObjectId, ref: "User" },
    issuedAt: { type: Date },
  },
  { timestamps: true }
);
certificateSchema.plugin(idPlugin);

export const CertificateRequest = mongoose.models.CertificateRequest || mongoose.model("CertificateRequest", certificateSchema);
