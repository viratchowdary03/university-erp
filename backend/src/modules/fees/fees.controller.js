import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import { sendPdf } from "../../utils/generatePdf.js";
import { env } from "../../config/env.js";
import * as svc from "./fees.service.js";

export const structures = asyncHandler(async (req, res) => ok(res, await svc.listStructures()));
export const createStructure = asyncHandler(async (req, res) => ok(res, (await svc.createStructure(req.user, req.body)).toJSON(), "Fee created", 201));
export const updateStructure = asyncHandler(async (req, res) => ok(res, (await svc.updateStructure(req.user, req.params.id, req.body)).toJSON(), "Fee updated"));
export const removeStructure = asyncHandler(async (req, res) => {
  await svc.deleteStructure(req.user, req.params.id);
  ok(res, null, "Fee deleted");
});
export const mine = asyncHandler(async (req, res) => ok(res, await svc.getMyFees(req.user)));
export const students = asyncHandler(async (req, res) => ok(res, await svc.listStudentDues(req.user, req.query)));
export const studentFees = asyncHandler(async (req, res) => ok(res, await svc.getStudentFees(req.user, req.params.id)));
export const collect = asyncHandler(async (req, res) => ok(res, (await svc.collectPayment(req.user, req.body)).toJSON(), "Payment recorded", 201));
export const payments = asyncHandler(async (req, res) => ok(res, await svc.listPayments(req.user, req.query)));

export const receipt = asyncHandler(async (req, res) => {
  const { payment, student, structure } = await svc.getReceipt(req.user, req.params.id);
  sendPdf(res, `${payment.receiptNo}.pdf`, [
    { text: env.university, size: 18, bold: true, align: "center", gap: 2 },
    { text: "Fee Receipt", size: 13, align: "center", gap: 10 },
    { rule: true },
    { text: `Receipt No: ${payment.receiptNo}`, bold: true, gap: 2 },
    { text: `Date: ${new Date(payment.paidAt).toLocaleDateString("en-IN")}`, gap: 8 },
    { text: `Student: ${student?.name}`, gap: 2 },
    { text: `Enrollment No: ${student?.enrollmentNo}`, gap: 2 },
    { text: `Program: ${student?.program}`, gap: 8 },
    { text: `Fee: ${structure?.title}`, gap: 2 },
    { text: `Mode: ${payment.mode}${payment.reference ? ` (${payment.reference})` : ""}`, gap: 8 },
    { rule: true },
    { text: `Amount paid: ₹${payment.amount}`, size: 14, bold: true },
    { text: "This is a computer-generated receipt.", size: 9 },
  ]);
});
