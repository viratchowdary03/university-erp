import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

export const EVENT_TYPES = ["Seminar", "Workshop", "Cultural", "Sports", "Placement Drive", "Holiday", "Other"];

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000 },
    type: { type: String, enum: EVENT_TYPES, default: "Other" },
    venue: { type: String, trim: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    school: { type: String, default: "" }, // empty = open to every school
    capacity: { type: Number, min: 0, default: 0 }, // 0 = no limit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
eventSchema.plugin(idPlugin);

export const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);
