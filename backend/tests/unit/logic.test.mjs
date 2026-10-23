import test from "node:test";
import assert from "node:assert/strict";
import { gradeFor, subjectResult, gradePointAverage } from "../../src/utils/gpaCalculator.js";
import { buildPdf } from "../../src/utils/generatePdf.js";
import { escapeRegex, parsePaging, pagedResult } from "../../src/utils/pagination.js";
import { canManage, hasPermission, PERM, ROLE_PERMISSIONS } from "../../src/utils/permissions.js";
import { applySchema } from "../../src/modules/admissions/admissions.validation.js";
import { structureSchema, collectSchema } from "../../src/modules/fees/fees.validation.js";
import { applySchema as leaveSchema } from "../../src/modules/leave/leave.validation.js";
import { quizSchema } from "../../src/modules/lms/lms.validation.js";
import { marksSchema } from "../../src/modules/exams/exams.validation.js";
import { resetPasswordSchema } from "../../src/modules/auth/auth.validation.js";

test("grade bands", () => {
  assert.equal(gradeFor(95).grade, "O");
  assert.equal(gradeFor(80).points, 9);
  assert.equal(gradeFor(40).grade, "C");
  assert.equal(gradeFor(39.9).grade, "F");
  assert.equal(gradeFor(NaN).grade, "F");
});

test("subject result adds up several exams and counts absent as zero", () => {
  const r = subjectResult([{ marks: 18, maxMarks: 20 }, { marks: null, maxMarks: 20 }, { marks: 70, maxMarks: 100 }]);
  assert.equal(r.obtained, 88);
  assert.equal(r.max, 140);
  assert.equal(r.percentage, 62.9);
  assert.equal(r.grade, "B+");
  assert.equal(r.passed, true);
  assert.equal(subjectResult([{ marks: 10, maxMarks: 50 }]).passed, false);
});

test("grade point average is weighted by credits", () => {
  assert.equal(gradePointAverage([{ points: 10, credits: 4 }, { points: 6, credits: 2 }]), 8.67);
  assert.equal(gradePointAverage([]), null);
});

test("pdf writer produces a well-formed file with correct byte offsets", () => {
  const pdf = buildPdf([{ text: "Receipt ₹500 (test) \\ ok", size: 14 }, ...Array.from({ length: 120 }, (_, i) => ({ text: `Line ${i}` }))]);
  const text = pdf.toString("latin1");
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.ok(text.trimEnd().endsWith("%%EOF"));
  assert.match(text, /\/Count [2-9]/); // long content flows onto more pages
  const startxref = Number(text.match(/startxref\n(\d+)/)[1]);
  assert.equal(text.slice(startxref, startxref + 4), "xref");
  // every xref entry must point at "N 0 obj"
  const entries = [...text.slice(startxref).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
  entries.forEach((offset, i) => assert.ok(text.slice(offset).startsWith(`${i + 1} 0 obj`), `object ${i + 1}`));
});

test("search text is escaped before it becomes a regular expression", () => {
  assert.equal(new RegExp(escapeRegex("a.b(c)+")).test("a.b(c)+"), true);
  assert.equal(new RegExp(escapeRegex("a.b")).test("axb"), false);
});

test("paging is clamped", () => {
  assert.deepEqual(parsePaging({ page: "-3", limit: "9999" }, { maxLimit: 50 }), { page: 1, limit: 50, skip: 0 });
  assert.equal(pagedResult([], 41, { page: 1, limit: 20 }).pages, 3);
});

test("who may manage what", () => {
  assert.equal(canManage("accountant", PERM.FEES), true);
  assert.equal(canManage("accountant", PERM.LIBRARY), false);
  assert.equal(canManage("librarian", PERM.LIBRARY), true);
  assert.equal(canManage("faculty", PERM.EXAMS), true);
  assert.equal(canManage("student", PERM.EXAMS), false);
  assert.equal(canManage("hod", PERM.STUDENTS), false);
  assert.equal(hasPermission("student", PERM.AUDIT), false);
  // every permission a role holds exists in PERM
  const known = new Set(Object.values(PERM));
  Object.values(ROLE_PERMISSIONS).forEach((list) => list.forEach((p) => assert.ok(known.has(p), p)));
});

test("admission form validation", () => {
  const good = { name: "Asha Patel", email: "asha@example.com", phone: "9876543210", gender: "F", dateOfBirth: "2007-05-04", school: "ENG", program: "B.Tech CSE", previousSchool: "City School", percentage: 88, guardianName: "R Patel", guardianPhone: "9876543211", city: "Vadodara" };
  assert.equal(applySchema.safeParse(good).success, true);
  assert.equal(applySchema.safeParse({ ...good, percentage: 120 }).success, false);
  assert.equal(applySchema.safeParse({ ...good, email: "nope" }).success, false);
  assert.equal(applySchema.safeParse({ ...good, school: "XXX" }).success, false);
});

test("fee validation", () => {
  const s = { title: "Sem 3", school: "ENG", components: [{ name: "Tuition", amount: 50000 }], dueDate: "2026-12-01" };
  assert.equal(structureSchema.safeParse(s).success, true);
  assert.equal(structureSchema.safeParse({ ...s, components: [] }).success, false);
  const p = { studentId: "64b000000000000000000001", structureId: "64b000000000000000000002", amount: 100, mode: "Cash" };
  assert.equal(collectSchema.safeParse(p).success, true);
  assert.equal(collectSchema.safeParse({ ...p, amount: 0 }).success, false);
  assert.equal(collectSchema.safeParse({ ...p, mode: "Online" }).success, false); // online goes through the gateway only
});

test("leave dates must be in order", () => {
  const l = { type: "Sick", fromDate: "2026-03-10", toDate: "2026-03-09", reason: "Fever" };
  assert.equal(leaveSchema.safeParse(l).success, false);
  assert.equal(leaveSchema.safeParse({ ...l, toDate: "2026-03-10" }).success, true);
});

test("quiz needs a valid correct answer", () => {
  const q = { title: "Quiz 1", durationMin: 10, questions: [{ text: "2+2?", options: ["3", "4"], correct: 1 }] };
  assert.equal(quizSchema.safeParse(q).success, true);
  assert.equal(quizSchema.safeParse({ ...q, questions: [{ ...q.questions[0], correct: 5 }] }).success, false);
});

test("marks entry validation", () => {
  assert.equal(marksSchema.safeParse({ entries: [] }).success, false);
  assert.equal(marksSchema.safeParse({ entries: [{ studentId: "64b000000000000000000001", marks: 12 }] }).success, true);
  assert.equal(marksSchema.safeParse({ entries: [{ studentId: "bad", marks: 12 }] }).success, false);
});

test("password reset needs a 6 digit code and a strong password", () => {
  const r = { email: "a@b.co", otp: "123456", newPassword: "Str0ng@Pass" };
  assert.equal(resetPasswordSchema.safeParse(r).success, true);
  assert.equal(resetPasswordSchema.safeParse({ ...r, otp: "12ab56" }).success, false);
  assert.equal(resetPasswordSchema.safeParse({ ...r, newPassword: "weak" }).success, false);
});

test("clickable links must be http(s)", async () => {
  const { alumniSchema } = await import("../../src/modules/alumni/alumni.validation.js");
  const a = { name: "A B", school: "ENG", graduationYear: 2020 };
  assert.equal(alumniSchema.safeParse({ ...a, linkedin: "https://linkedin.com/in/ab" }).success, true);
  assert.equal(alumniSchema.safeParse({ ...a, linkedin: "javascript:alert(1)" }).success, false);
  assert.equal(alumniSchema.safeParse({ ...a, linkedin: "" }).success, true);
});
