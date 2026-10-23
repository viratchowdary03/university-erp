import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import { sendPdf } from "../../utils/generatePdf.js";
import { env } from "../../config/env.js";
import * as svc from "./results.service.js";

export const mine = asyncHandler(async (req, res) => ok(res, await svc.getMyResult(req.user)));
export const forStudent = asyncHandler(async (req, res) => ok(res, await svc.getStudentResult(req.user, req.params.id)));
export const summary = asyncHandler(async (req, res) => ok(res, await svc.getSchoolSummary(req.user, req.query.school)));

// Marksheet as a PDF, for the student themself or for staff
export const marksheet = asyncHandler(async (req, res) => {
  const data = req.params.id ? await svc.getStudentResult(req.user, req.params.id) : await svc.getMyResult(req.user);
  const { student } = data;
  const blocks = [
    { text: env.university, size: 18, bold: true, align: "center", gap: 2 },
    { text: "Statement of Marks", size: 13, align: "center", gap: 10 },
    { rule: true },
    { text: `Name: ${student.name}`, bold: true, gap: 2 },
    { text: `Enrollment No: ${student.enrollmentNo}`, gap: 2 },
    { text: `Program: ${student.program}   Batch: ${student.batch || "-"}`, gap: 10 },
  ];
  for (const sem of data.semesters) {
    blocks.push({ rule: true, gap: 6 }, { text: `Semester ${sem.semester}   SGPA: ${sem.sgpa ?? "-"}`, bold: true, gap: 4 });
    blocks.push({ cells: ["Code", "Subject", "Marks", "%", "Grade", "Result"], cols: [50, 110, 340, 400, 440, 490], bold: true, size: 10 });
    sem.subjects.forEach((s) => blocks.push({
      cells: [s.code, s.name.slice(0, 38), `${s.obtained}/${s.max}`, s.percentage, s.grade, s.passed ? "Pass" : "Fail"],
      cols: [50, 110, 340, 400, 440, 490], size: 10,
    }));
  }
  blocks.push({ rule: true, gap: 8 }, { text: `CGPA: ${data.cgpa ?? "-"}     Backlogs: ${data.backlogs}`, bold: true });
  blocks.push({ text: "This is a computer-generated statement.", size: 9, gap: 0 });
  sendPdf(res, `marksheet-${student.enrollmentNo}.pdf`, blocks);
});
