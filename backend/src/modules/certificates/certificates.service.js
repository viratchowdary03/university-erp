import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import { PERM } from "../../utils/permissions.js";
import { assertManager } from "../../utils/access.js";
import { pad } from "../../utils/helpers.js";
import { Student } from "../students/student.model.js";
import { notify } from "../notifications/notifications.service.js";
import { CertificateRequest } from "./certificateRequest.model.js";

async function myStudent(user) {
  if (user.role !== ROLES.STUDENT) throw new ApiError(403, "Only students can request certificates");
  const student = await Student.findOne({ userId: user._id });
  if (!student) throw new ApiError(404, "Your student record has not been created yet");
  return student;
}

async function nextNo(Model, field, prefix) {
  const last = await Model.findOne({ [field]: new RegExp(`^${prefix}`) }).sort({ [field]: -1 });
  return `${prefix}${pad(last ? Number(last[field].slice(prefix.length)) + 1 : 1, 4)}`;
}

export async function request(user, values) {
  const student = await myStudent(user);
  if (await CertificateRequest.exists({ studentId: student._id, type: values.type, status: { $in: ["pending", "approved"] } })) {
    throw new ApiError(409, "You already have an open request for this certificate");
  }
  const prefix = `CRQ${new Date().getFullYear()}-`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await CertificateRequest.create({ ...values, studentId: student._id, requestNo: await nextNo(CertificateRequest, "requestNo", prefix) });
    } catch (err) {
      if (err.code !== 11000 || attempt === 2) throw err;
    }
  }
  return null;
}

export async function listMine(user) {
  const student = await myStudent(user);
  return (await CertificateRequest.find({ studentId: student._id }).sort({ createdAt: -1 })).map((c) => c.toJSON());
}

export async function listAll(user, query) {
  assertManager(user, PERM.CERTIFICATES);
  const filter = query.status ? { status: String(query.status) } : {};
  const items = await CertificateRequest.find(filter).sort({ createdAt: -1 }).limit(300);
  const students = await Student.find({ _id: { $in: items.map((i) => i.studentId) } }).select("name enrollmentNo school program");
  const by = new Map(students.map((s) => [String(s._id), s]));
  return items.map((i) => ({ ...i.toJSON(), studentName: by.get(String(i.studentId))?.name, enrollmentNo: by.get(String(i.studentId))?.enrollmentNo, school: by.get(String(i.studentId))?.school }));
}

export async function decide(user, id, { status, remarks }) {
  assertManager(user, PERM.CERTIFICATES);
  const req = await CertificateRequest.findById(id);
  if (!req) throw new ApiError(404, "Request not found");
  if (req.status !== "pending") throw new ApiError(409, "This request has already been decided");
  Object.assign(req, { status, remarks: remarks || undefined, decidedBy: user._id });
  await req.save();
  const student = await Student.findById(req.studentId);
  if (student?.userId) notify(student.userId, { title: `${req.type} ${status}`, message: remarks || "", link: "/certificates", type: status === "approved" ? "success" : "warning" });
  return req;
}

// Issuing gives the certificate its number. After this the student can download it.
export async function issue(user, id) {
  assertManager(user, PERM.CERTIFICATES);
  const req = await CertificateRequest.findById(id);
  if (!req) throw new ApiError(404, "Request not found");
  if (req.status !== "approved") throw new ApiError(409, "Approve the request before issuing it");
  const prefix = `VCU/${new Date().getFullYear()}/`;
  req.certificateNo = await nextNo(CertificateRequest, "certificateNo", prefix);
  req.status = "issued";
  req.issuedAt = new Date();
  await req.save();
  const student = await Student.findById(req.studentId);
  if (student?.userId) notify(student.userId, { title: `${req.type} issued`, message: "You can download it now.", link: "/certificates", type: "success" });
  return req;
}

export async function getForPdf(user, id) {
  const req = await CertificateRequest.findById(id);
  if (!req || req.status !== "issued") throw new ApiError(404, "Certificate not found");
  const student = await Student.findById(req.studentId);
  const own = user.role === ROLES.STUDENT && student && String(student.userId) === String(user._id);
  if (!own && user.role === ROLES.STUDENT) throw new ApiError(404, "Certificate not found");
  return { req, student };
}
