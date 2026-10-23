import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const { ObjectId } = mongoose.Schema.Types;

const registrationSchema = new mongoose.Schema(
  {
    eventId: { type: ObjectId, ref: "Event", required: true },
    userId: { type: ObjectId, ref: "User", required: true },
    name: { type: String },
    role: { type: String },
  },
  { timestamps: true }
);
registrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });
registrationSchema.plugin(idPlugin);

export const EventRegistration = mongoose.models.EventRegistration || mongoose.model("EventRegistration", registrationSchema);
