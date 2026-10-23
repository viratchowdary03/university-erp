import crypto from "crypto";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import { Student } from "../students/student.model.js";
import { FeeStructure } from "../fees/feeStructure.model.js";
import { FeePayment } from "../fees/feePayment.model.js";
import { recordPayment } from "../fees/fees.service.js";
import { Payment } from "./payment.model.js";

// The "sandbox" gateway only pretends to take money, so it is available in development only.
// To take real payments, add a provider here (create the order with the gateway, verify its signature
// in confirm()) and set PAYMENT_PROVIDER. Until then production answers with 501.
const provider = () => process.env.PAYMENT_PROVIDER || (env.nodeEnv === "production" ? "" : "sandbox");

export const gatewayInfo = () => ({ provider: provider() || null, sandbox: provider() === "sandbox" });

function requireGateway() {
  if (provider() !== "sandbox") throw new ApiError(501, "Online payment is not set up yet. Please pay at the accounts office");
}

async function mineOrFail(user) {
  if (user.role !== ROLES.STUDENT) throw new ApiError(403, "Only students can pay fees online");
  const student = await Student.findOne({ userId: user._id });
  if (!student) throw new ApiError(404, "Your student record has not been created yet");
  return student;
}

export async function createOrder(user, { structureId, amount }) {
  requireGateway();
  const student = await mineOrFail(user);
  const structure = await FeeStructure.findById(structureId);
  if (!structure || structure.school !== student.school || (structure.program && structure.program !== student.program)) {
    throw new ApiError(400, "This fee does not apply to you");
  }
  const paid = await FeePayment.aggregate([{ $match: { studentId: student._id, structureId: structure._id } }, { $group: { _id: null, n: { $sum: "$amount" } } }]);
  const balance = structure.total - (paid[0]?.n || 0);
  if (balance <= 0) throw new ApiError(409, "This fee is already fully paid");
  const toPay = amount ?? balance;
  if (toPay > balance) throw new ApiError(400, `The amount is more than the balance of ₹${balance}`);
  return Payment.create({
    orderId: `ORD${Date.now()}${crypto.randomInt(100, 999)}`,
    studentId: student._id, structureId: structure._id, amount: toPay, provider: provider(),
  });
}

async function ownOrder(user, orderId) {
  const student = await mineOrFail(user);
  const order = await Payment.findOne({ orderId, studentId: student._id });
  if (!order) throw new ApiError(404, "Payment not found");
  return order;
}

// Sandbox checkout: the student picks a method and whether it should succeed
export async function confirm(user, orderId, { method, outcome }) {
  requireGateway();
  const order = await ownOrder(user, orderId);
  if (order.status !== "created") throw new ApiError(409, "This payment is already completed");
  order.method = method;
  if (outcome === "failure") {
    order.status = "failed";
    order.failureReason = "Payment declined in the sandbox";
    await order.save();
    return order;
  }
  const payment = await recordPayment({
    studentId: order.studentId, structureId: order.structureId, amount: order.amount,
    mode: "Online", reference: order.orderId, note: `Online (${method})`,
  });
  order.status = "paid";
  order.receiptNo = payment.receiptNo;
  await order.save();
  return order;
}

export async function getOrder(user, orderId) {
  const order = await ownOrder(user, orderId);
  const structure = await FeeStructure.findById(order.structureId).select("title");
  return { ...order.toJSON(), feeTitle: structure?.title };
}

export async function myPayments(user) {
  const student = await mineOrFail(user);
  return (await Payment.find({ studentId: student._id }).sort({ createdAt: -1 }).limit(50)).map((p) => p.toJSON());
}
