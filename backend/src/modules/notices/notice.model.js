import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    body: { type: String, required: true, trim: true, maxlength: 3000 },
    audience: [{ type: String }], // roles that should see it; empty = everyone
    school: { type: String, default: "" }, // empty = every school
    priority: { type: String, enum: ["normal", "important", "urgent"], default: "normal" },
    pinned: { type: Boolean, default: false },
    expiresAt: { type: String }, // YYYY-MM-DD, hidden after this day
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String },
    authorRole: { type: String },
  },
  { timestamps: true }
);
noticeSchema.plugin(idPlugin);

export const Notice = mongoose.models.Notice || mongoose.model("Notice", noticeSchema);
