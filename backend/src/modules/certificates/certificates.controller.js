import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import { sendPdf } from "../../utils/generatePdf.js";
import { env } from "../../config/env.js";
import * as svc from "./certificates.service.js";

export const request = asyncHandler(async (req, res) => ok(res, (await svc.request(req.user, req.body)).toJSON(), "Request sent", 201));
export const mine = asyncHandler(async (req, res) => ok(res, await svc.listMine(req.user)));
export const all = asyncHandler(async (req, res) => ok(res, await svc.listAll(req.user, req.query)));
export const decide = asyncHandler(async (req, res) => ok(res, (await svc.decide(req.user, req.params.id, req.body)).toJSON(), "Decision saved"));
export const issue = asyncHandler(async (req, res) => ok(res, (await svc.issue(req.user, req.params.id)).toJSON(), "Certificate issued"));

export const pdf = asyncHandler(async (req, res) => {
  const { req: cert, student } = await svc.getForPdf(req.user, req.params.id);
  const date = new Date(cert.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const statement = {
    "Bonafide Certificate": `is a bonafide student of this university, enrolled in ${student.program} (${student.school}), Batch ${student.batch || "-"}.`,
    "Character Certificate": `has been a student of ${student.program} at this university and, to the best of our knowledge, bears a good moral character.`,
    Transcript: `is a student of ${student.program}. The official transcript of academic record is issued on request of the student.`,
    "Transfer Certificate": `was a student of ${student.program} at this university and is permitted to transfer to another institution.`,
    "No Objection Certificate": `is a student of ${student.program}. The university has no objection to the purpose stated below.`,
    "Migration Certificate": `was a student of ${student.program} at this university and is permitted to migrate to another university.`,
  }[cert.type];
  sendPdf(res, `${cert.requestNo}.pdf`, [
    { text: env.university, size: 20, bold: true, align: "center", gap: 2 },
    { text: cert.type.toUpperCase(), size: 14, bold: true, align: "center", gap: 14 },
    { rule: true },
    { text: `Certificate No: ${cert.certificateNo}`, size: 10, gap: 2 },
    { text: `Date: ${date}`, size: 10, gap: 24 },
    { text: `This is to certify that ${student.name} (Enrollment No. ${student.enrollmentNo}) ${statement}`, size: 12, gap: 14 },
    { text: `Purpose: ${cert.purpose}`, size: 12, gap: 60 },
    { text: "Registrar", bold: true, size: 12, gap: 2 },
    { text: env.university, size: 10 },
  ]);
});
