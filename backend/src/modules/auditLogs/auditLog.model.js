import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  userName: { type: String, trim: true },
  role: { type: String },
  method: { type: String, required: true },
  path: { type: String, required: true },
  module: { type: String, index: true },
  statusCode: { type: Number },
  ip: { type: String },
  // old entries delete themselves after 180 days
  createdAt: { type: Date, default: Date.now, index: { expireAfterSeconds: 60 * 60 * 24 * 180 } },
});
auditLogSchema.plugin(idPlugin);

export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
