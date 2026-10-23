import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, trim: true, maxlength: 500 },
    link: { type: String, trim: true }, // page to open when clicked, e.g. /fees
    type: { type: String, enum: ["info", "success", "warning"], default: "info" },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: { expireAfterSeconds: 60 * 60 * 24 * 90 } },
  }
);
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.plugin(idPlugin);

export const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
