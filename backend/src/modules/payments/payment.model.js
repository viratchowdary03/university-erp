import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const { ObjectId } = mongoose.Schema.Types;

// An online payment attempt. It becomes a fee payment (and a receipt) only when it succeeds.
const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    studentId: { type: ObjectId, ref: "Student", required: true, index: true },
    structureId: { type: ObjectId, ref: "FeeStructure", required: true },
    amount: { type: Number, required: true, min: 1 },
    provider: { type: String, required: true },
    status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
    method: { type: String, trim: true },
    receiptNo: { type: String },
    failureReason: { type: String, trim: true },
  },
  { timestamps: true }
);
paymentSchema.plugin(idPlugin);

export const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
