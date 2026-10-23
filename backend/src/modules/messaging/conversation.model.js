import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const { ObjectId } = mongoose.Schema.Types;

// A private chat between exactly two people. `pair` is their two ids in sorted order, so the same two
// people can never end up with two conversations.
const conversationSchema = new mongoose.Schema(
  {
    pair: { type: String, required: true, unique: true },
    participants: [{ type: ObjectId, ref: "User", index: true }],
    lastMessage: { type: String },
    lastSenderId: { type: ObjectId },
    lastAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
conversationSchema.plugin(idPlugin);

export const Conversation = mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);
