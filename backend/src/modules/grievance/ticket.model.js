import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const { ObjectId } = mongoose.Schema.Types;
export const CATEGORIES = ["Academic", "Fees", "Hostel", "Library", "Transport", "IT / Portal", "Harassment", "Other"];
export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"];

const ticketSchema = new mongoose.Schema(
  {
    ticketNo: { type: String, required: true, unique: true },
    userId: { type: ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    school: { type: String, index: true },
    category: { type: String, enum: CATEGORIES, required: true },
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    status: { type: String, enum: TICKET_STATUSES, default: "open", index: true },
    comments: [{
      userId: { type: ObjectId, ref: "User" },
      name: String,
      role: String,
      text: { type: String, trim: true, maxlength: 1500 },
      at: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);
ticketSchema.plugin(idPlugin);

export const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);
