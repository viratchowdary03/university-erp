import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import { PERM, hasFullAccess } from "../../utils/permissions.js";
import { assertManager } from "../../utils/access.js";
import { pad } from "../../utils/helpers.js";
import { escapeRegex } from "../../utils/pagination.js";
import { School } from "../academic/department.model.js";
import { Student } from "../students/student.model.js";
import { notify } from "../notifications/notifications.service.js";
import { FeeStructure } from "./feeStructure.model.js";
import { FeePayment } from "./feePayment.model.js";

const today = () => new Date().toISOString().slice(0, 10);
const sumOf = (list) => list.reduce((n, x) => n + x, 0);

const appliesTo = (structure, student) =>
  structure.school === student.school && (!structure.program || structure.program === student.program);

// Fee heads that apply to one student, with what they paid and still owe
async function duesFor(student) {
  const [structures, payments] = await Promise.all([
    FeeStructure.find({ school: student.school }).sort({ dueDate: 1 }),
    FeePayment.find({ studentId: student._id }).sort({ paidAt: -1 }),
  ]);
  const items = structures.filter((s) => appliesTo(s, student)).map((s) => {
    const paid = sumOf(payments.filter((p) => String(p.structureId) === String(s._id)).map((p) => p.amount));
    const balance = Math.max(0, s.total - paid);
    return { ...s.toJSON(), paid, balance, overdue: balance > 0 && s.dueDate < today() };
  });
  return { items, payments, total: sumOf(items.map((i) => i.total)), paid: sumOf(items.map((i) => i.paid)), balance: sumOf(items.map((i) => i.balance)) };
}

export async function nextReceiptNo() {
  const year = new Date().getFullYear();
  const prefix = `RCT${year}-`;
  const last = await FeePayment.findOne({ receiptNo: new RegExp(`^${prefix}`) }).sort({ receiptNo: -1 });
  const n = last ? Number(last.receiptNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${pad(n, 5)}`;
}

// ---------- fee structures ----------
export const listStructures = async () => (await FeeStructure.find().sort({ school: 1, dueDate: 1 })).map((s) => s.toJSON());

async function checkStructure(values) {
  const school = await School.findOne({ code: values.school });
  if (!school) throw new ApiError(400, "Choose a valid school");
  if (values.program && !school.programs.includes(values.program)) throw new ApiError(400, "That program does not belong to this school");
  return { ...values, program: values.program || "", total: sumOf(values.components.map((c) => c.amount)) };
}

export async function createStructure(user, values) {
  assertManager(user, PERM.FEES);
  return FeeStructure.create(await checkStructure(values));
}

export async function updateStructure(user, id, values) {
  assertManager(user, PERM.FEES);
  const structure = await FeeStructure.findById(id);
  if (!structure) throw new ApiError(404, "Fee not found");
  const data = await checkStructure(values);
  const paid = await FeePayment.aggregate([{ $match: { structureId: structure._id } }, { $group: { _id: null, n: { $sum: "$amount" } } }]);
  if (paid[0] && data.total < paid[0].n) throw new ApiError(409, "The total cannot be lower than what students have already paid");
  Object.assign(structure, data);
  await structure.save();
  return structure;
}

export async function deleteStructure(user, id) {
  assertManager(user, PERM.FEES);
  const structure = await FeeStructure.findById(id);
  if (!structure) throw new ApiError(404, "Fee not found");
  if (await FeePayment.exists({ structureId: structure._id })) throw new ApiError(409, "Payments exist for this fee, so it cannot be deleted");
  await structure.deleteOne();
}

// ---------- student view ----------
export async function getMyFees(user) {
  if (user.role !== ROLES.STUDENT) throw new ApiError(403, "Only students have a personal fee page");
  const student = await Student.findOne({ userId: user._id });
  if (!student) throw new ApiError(404, "Your student record has not been created yet");
  const dues = await duesFor(student);
  return { ...dues, payments: dues.payments.map((p) => p.toJSON()) };
}

// ---------- accountant view ----------
// Every student with their total, paid and balance; filterable by school, status and search text
export async function listStudentDues(user, query) {
  const filter = {};
  if (query.school) filter.school = String(query.school);
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ name: rx }, { enrollmentNo: rx }];
  }
  const [students, structures, paid] = await Promise.all([
    Student.find(filter).sort({ school: 1, enrollmentNo: 1 }).limit(500),
    FeeStructure.find(),
    FeePayment.aggregate([{ $group: { _id: "$studentId", n: { $sum: "$amount" } } }]),
  ]);
  const paidBy = new Map(paid.map((p) => [String(p._id), p.n]));
  const rows = students.map((s) => {
    const mine = structures.filter((f) => appliesTo(f, s));
    const total = sumOf(mine.map((f) => f.total));
    const amountPaid = paidBy.get(String(s._id)) || 0;
    const balance = Math.max(0, total - amountPaid);
    const overdue = mine.some((f) => f.dueDate < today()) && balance > 0;
    return { id: String(s._id), name: s.name, enrollmentNo: s.enrollmentNo, school: s.school, program: s.program, total, paid: amountPaid, balance, status: balance === 0 && total > 0 ? "Paid" : amountPaid > 0 ? "Partial" : "Pending", overdue };
  });
  const wanted = query.status ? rows.filter((r) => r.status === query.status) : rows;
  return { rows: wanted, summary: { total: sumOf(rows.map((r) => r.total)), paid: sumOf(rows.map((r) => r.paid)), balance: sumOf(rows.map((r) => r.balance)), defaulters: rows.filter((r) => r.overdue).length } };
}

export async function getStudentFees(user, studentId) {
  assertManager(user, PERM.FEES);
  const student = await Student.findById(studentId);
  if (!student) throw new ApiError(404, "Student not found");
  const dues = await duesFor(student);
  return { student: { id: String(student._id), name: student.name, enrollmentNo: student.enrollmentNo, program: student.program, school: student.school }, ...dues, payments: dues.payments.map((p) => p.toJSON()) };
}

// Records a payment. The amount can never be more than what the student still owes for this fee.
export async function collectPayment(user, values, { mode } = {}) {
  assertManager(user, PERM.FEES);
  return recordPayment({ ...values, mode: mode || values.mode, collectedBy: user._id });
}

// Shared by the counter (collectPayment) and the online gateway
export async function recordPayment({ studentId, structureId, amount, mode, reference, note, collectedBy }) {
  const [student, structure] = await Promise.all([Student.findById(studentId), FeeStructure.findById(structureId)]);
  if (!student) throw new ApiError(404, "Student not found");
  if (!structure || !appliesTo(structure, student)) throw new ApiError(400, "This fee does not apply to this student");
  const paidRows = await FeePayment.aggregate([{ $match: { studentId: student._id, structureId: structure._id } }, { $group: { _id: null, n: { $sum: "$amount" } } }]);
  const balance = structure.total - (paidRows[0]?.n || 0);
  if (balance <= 0) throw new ApiError(409, "This fee is already fully paid");
  if (amount > balance) throw new ApiError(400, `The amount is more than the balance of ₹${balance}`);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const payment = await FeePayment.create({ receiptNo: await nextReceiptNo(), studentId, structureId, amount, mode, reference: reference || undefined, note: note || undefined, collectedBy });
      if (student.userId) notify(student.userId, { title: "Payment received", message: `₹${amount} for ${structure.title}. Receipt ${payment.receiptNo}.`, link: "/fees", type: "success" });
      return payment;
    } catch (err) {
      if (err.code !== 11000 || attempt === 2) throw err;
    }
  }
  return null;
}

export async function listPayments(user, query) {
  assertManager(user, PERM.FEES);
  const filter = {};
  if (query.studentId) filter.studentId = String(query.studentId);
  const payments = await FeePayment.find(filter).sort({ paidAt: -1 }).limit(300);
  const [students, structures] = await Promise.all([
    Student.find({ _id: { $in: payments.map((p) => p.studentId) } }).select("name enrollmentNo school"),
    FeeStructure.find({ _id: { $in: payments.map((p) => p.structureId) } }).select("title"),
  ]);
  const studentBy = new Map(students.map((s) => [String(s._id), s]));
  const structureBy = new Map(structures.map((s) => [String(s._id), s.title]));
  return payments.map((p) => ({
    ...p.toJSON(),
    studentName: studentBy.get(String(p.studentId))?.name,
    enrollmentNo: studentBy.get(String(p.studentId))?.enrollmentNo,
    feeTitle: structureBy.get(String(p.structureId)),
  }));
}

// Data for a receipt: the accountant, the student themself, never somebody else's
export async function getReceipt(user, paymentId) {
  const payment = await FeePayment.findById(paymentId);
  if (!payment) throw new ApiError(404, "Receipt not found");
  const [student, structure] = await Promise.all([Student.findById(payment.studentId), FeeStructure.findById(payment.structureId)]);
  const own = user.role === ROLES.STUDENT && student && String(student.userId) === String(user._id);
  const staff = hasFullAccess(user.role) || user.role === ROLES.ACCOUNTANT;
  if (!own && !staff) throw new ApiError(404, "Receipt not found");
  return { payment, student, structure };
}
