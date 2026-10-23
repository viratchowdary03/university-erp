import { ApiError } from "../../utils/ApiError.js";
import { ROLES, PASS_MARK } from "../../utils/constants.js";
import { hasFullAccess } from "../../utils/permissions.js";
import { visibleSchool } from "../../utils/access.js";
import { classesToRecover, percent } from "../../utils/helpers.js";
import { Student } from "../students/student.model.js";
import { Subject } from "../academic/subject.model.js";
import { School } from "../academic/department.model.js";
import { AttendanceSummary } from "../attendance/attendance.model.js";
import { overallByStudent } from "../attendance/attendance.service.js";
import { Allocation } from "../hostel/allocation.model.js";
import { Hostel } from "../hostel/hostel.model.js";
import { FeeStructure } from "../fees/feeStructure.model.js";
import { FeePayment } from "../fees/feePayment.model.js";

const brief = (s, extra = {}) => ({ id: String(s._id), name: s.name, enrollmentNo: s.enrollmentNo, school: s.school, program: s.program, ...extra });

// Overview numbers and the students who need attention. A head of school sees their own school only.
export async function getInsights(user, requestedSchool) {
  const scope = visibleSchool(user);
  const school = scope === null ? requestedSchool || "" : scope;
  const filter = school ? { school } : {};
  const students = await Student.find(filter);
  const attendance = await overallByStudent(students.map((s) => s._id));

  const buckets = [
    { label: "Below 60%", count: 0 }, { label: "60 - 74%", count: 0 }, { label: "75 - 84%", count: 0 }, { label: "85% and above", count: 0 },
  ];
  students.forEach((s) => {
    const p = attendance.get(String(s._id));
    buckets[p < 60 ? 0 : p < PASS_MARK ? 1 : p < 85 ? 2 : 3].count += 1;
  });

  const cgpaBands = [{ label: "Below 5", count: 0 }, { label: "5 - 6.9", count: 0 }, { label: "7 - 8.4", count: 0 }, { label: "8.5+", count: 0 }];
  students.filter((s) => s.cgpa !== null && s.cgpa !== undefined).forEach((s) => { cgpaBands[s.cgpa < 5 ? 0 : s.cgpa < 7 ? 1 : s.cgpa < 8.5 ? 2 : 3].count += 1; });

  const atRisk = students
    .map((s) => ({ s, p: attendance.get(String(s._id)) }))
    .filter(({ s, p }) => p < PASS_MARK || (s.cgpa !== null && s.cgpa !== undefined && s.cgpa < 5))
    .sort((a, b) => a.p - b.p)
    .slice(0, 15)
    .map(({ s, p }) => brief(s, { attendance: p, cgpa: s.cgpa ?? null, reason: [p < PASS_MARK && "Low attendance", s.cgpa < 5 && "Low CGPA"].filter(Boolean).join(", ") }));

  const enrolled = new Map((await Student.aggregate([{ $group: { _id: "$school", n: { $sum: 1 } } }])).map((r) => [r._id, r.n]));
  const [schools, structures, paid, residents, hostels] = await Promise.all([
    School.find().sort({ code: 1 }), FeeStructure.find(school ? { school } : {}), FeePayment.aggregate([{ $group: { _id: "$studentId", n: { $sum: "$amount" } } }]), Allocation.countDocuments(), Hostel.find(),
  ]);
  const paidBy = new Map(paid.map((p) => [String(p._id), p.n]));
  const billed = students.reduce((n, s) => n + structures.filter((f) => f.school === s.school && (!f.program || f.program === s.program)).reduce((m, f) => m + f.total, 0), 0);
  const collected = students.reduce((n, s) => n + (paidBy.get(String(s._id)) || 0), 0);

  return {
    school,
    studentCount: students.length,
    averageAttendance: students.length ? Math.round([...students].reduce((n, s) => n + attendance.get(String(s._id)), 0) / students.length) : 0,
    attendanceBuckets: buckets,
    cgpaBands,
    atRisk,
    enrollmentBySchool: hasFullAccess(user.role) ? schools.map((sc) => ({ code: sc.code, name: sc.name, count: enrolled.get(sc.code) || 0 })) : undefined,
    fees: { billed, collected, rate: billed ? Math.round((Math.min(collected, billed) / billed) * 100) : 0 },
    hostel: hasFullAccess(user.role) ? { residents, capacity: hostels.reduce((n, h) => n + h.floors * h.roomsPerFloor * h.sharing, 0) } : undefined,
  };
}

// For every subject: how many classes in a row are needed to get back to 75%, or how many can still be missed
const subjectPlan = (row) => ({
  ...row,
  needed: classesToRecover(row.attended, row.held),
  canMiss: row.percent >= PASS_MARK && row.held > 0 ? Math.max(0, Math.floor(row.attended / (PASS_MARK / 100) - row.held)) : 0,
});

export async function getAttendancePrediction(user, requestedSchool) {
  if (user.role === ROLES.STUDENT) {
    const student = await Student.findOne({ userId: user._id });
    if (!student) throw new ApiError(404, "Your student record has not been created yet");
    const [subjects, summaries] = await Promise.all([Subject.find({ school: student.school }).sort({ code: 1 }), AttendanceSummary.find({ studentId: student._id })]);
    const by = new Map(summaries.map((s) => [s.subjectCode, s]));
    const rows = subjects.map((sub) => {
      const { held = 0, attended = 0 } = by.get(sub.code) || {};
      return subjectPlan({ code: sub.code, name: sub.name, held, attended, percent: percent(attended, held) });
    });
    const held = rows.reduce((n, r) => n + r.held, 0);
    const attended = rows.reduce((n, r) => n + r.attended, 0);
    return { mode: "student", target: PASS_MARK, overall: percent(attended, held), rows, overallNeeded: classesToRecover(attended, held) };
  }
  const scope = visibleSchool(user);
  const school = scope === null ? requestedSchool || "ENG" : scope;
  const students = await Student.find({ school }).sort({ enrollmentNo: 1 });
  const summaries = await AttendanceSummary.find({ studentId: { $in: students.map((s) => s._id) } });
  const rows = students.map((s) => {
    const mine = summaries.filter((x) => String(x.studentId) === String(s._id));
    const held = mine.reduce((n, r) => n + r.held, 0);
    const attended = mine.reduce((n, r) => n + r.attended, 0);
    return brief(s, { held, attended, percent: percent(attended, held), needed: classesToRecover(attended, held) });
  }).filter((r) => r.percent < 85).sort((a, b) => a.percent - b.percent);
  return { mode: "staff", target: PASS_MARK, school, rows };
}
