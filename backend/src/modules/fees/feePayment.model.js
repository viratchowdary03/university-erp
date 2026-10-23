import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const { ObjectId } = mongoose.Schema.Types;
export const PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Online"];

const feePaymentSchema = new mongoose.Schema(
  {
    receiptNo: { type: String, required: true, unique: true },
    studentId: { type: ObjectId, ref: "Student", required: true, index: true },
    structureId: { type: ObjectId, ref: "FeeStructure", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    mode: { type: String, enum: PAYMENT_MODES, required: true },
    reference: { type: String, trim: true }, // cheque, UPI or transaction number
    note: { type: String, trim: true, maxlength: 200 },
    collectedBy: { type: ObjectId, ref: "User" },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
feePaymentSchema.plugin(idPlugin);

export const FeePayment = mongoose.models.FeePayment || mongoose.model("FeePayment", feePaymentSchema);
