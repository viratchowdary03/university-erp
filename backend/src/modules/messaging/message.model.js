import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const { ObjectId } = mongoose.Schema.Types;

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: ObjectId, ref: "Conversation", required: true },
    senderId: { type: ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    readBy: [{ type: ObjectId }],
  },
  { timestamps: true }
);
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.plugin(idPlugin);

export const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
