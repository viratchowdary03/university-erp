import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import { visibleSchool } from "../../utils/access.js";
import { subjectResult, gradePointAverage } from "../../utils/gpaCalculator.js";
import { Student } from "../students/student.model.js";
import { Subject } from "../academic/subject.model.js";
import { Exam } from "../exams/exam.model.js";
import { Mark } from "../exams/mark.model.js";

// Everything the results of one school need, loaded once and worked out in memory
async function loadSchool(school, studentIds) {
  const [students, subjects, exams] = await Promise.all([
    Student.find(studentIds ? { _id: { $in: studentIds } } : { school }).sort({ enrollmentNo: 1 }),
    Subject.find({ school }).sort({ semester: 1, code: 1 }),
    Exam.find({ school, published: true }).sort({ date: 1 }),
  ]);
  const marks = exams.length && students.length
    ? await Mark.find({ examId: { $in: exams.map((e) => e._id) }, studentId: { $in: students.map((s) => s._id) } })
    : [];
  return { students, subjects, exams, marks };
}

function resultFor(student, { subjects, exams, marks }) {
  const mine = new Map(marks.filter((m) => String(m.studentId) === String(student._id)).map((m) => [String(m.examId), m]));
  const semesters = new Map();

  for (const subject of subjects) {
    const subjectExams = exams.filter((e) => e.subjectCode === subject.code);
    if (!subjectExams.length) continue; // nothing published for this subject yet
    const rows = subjectExams.map((e) => {
      const m = mine.get(String(e._id));
      return { name: e.name, type: e.type, date: e.date, max: e.maxMarks, marks: m?.marks ?? null, absent: Boolean(m?.absent) };
    });
    const outcome = subjectResult(rows.map((r) => ({ marks: r.marks, maxMarks: r.max })));
    const entry = { code: subject.code, name: subject.name, credits: subject.credits, exams: rows, ...outcome };
    if (!semesters.has(subject.semester)) semesters.set(subject.semester, []);
    semesters.get(subject.semester).push(entry);
  }

  const list = [...semesters.entries()].sort((a, b) => a[0] - b[0]).map(([semester, rows]) => ({
    semester,
    subjects: rows,
    sgpa: gradePointAverage(rows),
    passed: rows.every((r) => r.passed),
  }));
  const all = list.flatMap((s) => s.subjects);
  return { semesters: list, cgpa: gradePointAverage(all), backlogs: all.filter((s) => !s.passed).length };
}

// Keeps Student.cgpa in step with what is published (called when an exam is published or hidden)
export async function refreshCgpa(school) {
  const data = await loadSchool(school);
  if (!data.students.length) return; // a school with no students has nothing to update
  await Student.bulkWrite(
    data.students.map((s) => ({
      updateOne: { filter: { _id: s._id }, update: { $set: { cgpa: resultFor(s, data).cgpa } } },
    }))
  );
}

const studentBrief = (s) => ({ id: String(s._id), name: s.name, enrollmentNo: s.enrollmentNo, program: s.program, school: s.school, semester: s.semester, batch: s.batch });

async function resultOf(student) {
  const data = await loadSchool(student.school, [student._id]);
  return { student: studentBrief(student), ...resultFor(student, data) };
}

export async function getMyResult(user) {
  if (user.role !== ROLES.STUDENT) throw new ApiError(403, "Only students have a personal result page");
  const student = await Student.findOne({ userId: user._id });
  if (!student) throw new ApiError(404, "Your student record has not been created yet");
  return resultOf(student);
}

export async function getStudentResult(user, studentId) {
  if (user.role === ROLES.STUDENT) throw new ApiError(403, "You can only see your own result");
  const student = await Student.findById(studentId);
  const scope = visibleSchool(user);
  if (!student || (scope !== null && student.school !== scope)) throw new ApiError(404, "Student not found");
  return resultOf(student);
}

// Class overview for staff: pass rate per subject, the toppers and the students with backlogs
export async function getSchoolSummary(user, requestedSchool) {
  if (user.role === ROLES.STUDENT) throw new ApiError(403, "This page is for staff");
  const scope = visibleSchool(user);
  const school = scope === null ? requestedSchool || "ENG" : scope;
  const data = await loadSchool(school);
  const results = data.students.map((s) => ({ student: s, ...resultFor(s, data) }));

  const subjectRows = data.subjects
    .filter((sub) => data.exams.some((e) => e.subjectCode === sub.code))
    .map((sub) => {
      const outcomes = results.map((r) => r.semesters.flatMap((x) => x.subjects).find((x) => x.code === sub.code)).filter(Boolean);
      const passed = outcomes.filter((o) => o.passed).length;
      const average = outcomes.length ? Math.round(outcomes.reduce((n, o) => n + o.percentage, 0) / outcomes.length) : 0;
      return { code: sub.code, name: sub.name, passPercent: outcomes.length ? Math.round((passed / outcomes.length) * 100) : 0, average };
    });

  const ranked = results.filter((r) => r.cgpa !== null).sort((a, b) => b.cgpa - a.cgpa);
  return {
    school,
    publishedExams: data.exams.length,
    subjectRows,
    toppers: ranked.slice(0, 5).map((r) => ({ ...studentBrief(r.student), cgpa: r.cgpa })),
    backlogs: results.filter((r) => r.backlogs > 0).map((r) => ({ ...studentBrief(r.student), backlogs: r.backlogs, cgpa: r.cgpa }))
      .sort((a, b) => b.backlogs - a.backlogs),
    students: ranked.length,
  };
}
