import { ApiError } from "../../utils/ApiError.js";
import { ROLES, PASS_MARK } from "../../utils/constants.js";
import { PERM, hasPermission } from "../../utils/permissions.js";
import { visibleSchool } from "../../utils/access.js";
import { percent, todayKey } from "../../utils/helpers.js";
import { Student } from "../students/student.model.js";
import { Faculty } from "../faculty/faculty.model.js";
import { Subject } from "../academic/subject.model.js";
import { AttendanceSummary, AttendanceSession } from "./attendance.model.js";

const sum = (list, key) => list.reduce((n, r) => n + r[key], 0);

// Overall attendance percentage for many students at once: Map(studentId -> percent)
export async function overallByStudent(studentIds) {
  const totals = await AttendanceSummary.aggregate([
    { $match: { studentId: { $in: studentIds } } },
    { $group: { _id: "$studentId", held: { $sum: "$held" }, attended: { $sum: "$attended" } } },
  ]);
  const map = new Map(studentIds.map((id) => [String(id), 100]));
  totals.forEach((t) => map.set(String(t._id), percent(t.attended, t.held)));
  return map;
}

// One student's attendance in every subject of their school
export async function rowsFor(student) {
  const [subjects, summaries] = await Promise.all([
    Subject.find({ school: student.school }).sort({ code: 1 }),
    AttendanceSummary.find({ studentId: student._id }),
  ]);
  const byCode = new Map(summaries.map((s) => [s.subjectCode, s]));
  const rows = subjects.map((sub) => {
    const { held = 0, attended = 0 } = byCode.get(sub.code) || {};
    return { code: sub.code, name: sub.name, held, attended, percent: percent(attended, held) };
  });
  return { rows, overall: percent(sum(rows, "attended"), sum(rows, "held")) };
}

export async function getMyAttendance(user) {
  if (user.role !== ROLES.STUDENT) throw new ApiError(403, "Only students have a personal attendance page");
  const student = await Student.findOne({ userId: user._id });
  if (!student) return { rows: [], overall: 100 };
  return rowsFor(student);
}

async function getTeacher(user) {
  if (user.role !== ROLES.FACULTY) return null;
  return Faculty.findOne({ userId: user._id });
}

async function markableSubjects(user) {
  const teacher = await getTeacher(user);
  if (!teacher) return [];
  return Subject.find({ school: teacher.school, facultyId: teacher._id }).sort({ code: 1 });
}

export async function getSchoolReport(schoolCode) {
  const [subjects, roster] = await Promise.all([
    Subject.find({ school: schoolCode }).sort({ code: 1 }),
    Student.find({ school: schoolCode }).sort({ enrollmentNo: 1 }),
  ]);
  const summaries = await AttendanceSummary.find({ studentId: { $in: roster.map((s) => s._id) } });

  const subjectRows = subjects.map((sub) => {
    const recs = summaries.filter((s) => s.subjectCode === sub.code);
    return { code: sub.code, name: sub.name, average: percent(sum(recs, "attended"), sum(recs, "held")) };
  });

  const shortage = [];
  for (const student of roster) {
    const mine = summaries.filter((s) => String(s.studentId) === String(student._id));
    const rows = subjects.map((sub) => {
      const { held = 0, attended = 0 } = mine.find((m) => m.subjectCode === sub.code) || {};
      return { code: sub.code, name: sub.name, held, attended, percent: percent(attended, held) };
    });
    const overall = percent(sum(rows, "attended"), sum(rows, "held"));
    if (overall < PASS_MARK) shortage.push({ student: student.toJSON(), overall, rows });
  }
  shortage.sort((a, b) => a.overall - b.overall);

  const average = subjectRows.length ? Math.round(sum(subjectRows, "average") / subjectRows.length) : 0;
  return { school: schoolCode, subjectRows, shortage, average, studentCount: roster.length };
}

// Teacher's subjects with the class average of each
export async function getMarkOverview(user) {
  const subjects = await markableSubjects(user);
  if (subjects.length === 0) return { subjects: [], averages: [] };
  const report = await getSchoolReport(subjects[0].school);
  return {
    subjects: subjects.map((s) => s.toJSON()),
    averages: report.subjectRows.filter((r) => subjects.some((s) => s.code === r.code)),
  };
}

export async function getMarkingSession(user, subjectCode) {
  const subjects = await markableSubjects(user);
  const subject = subjects.find((s) => s.code === subjectCode);
  if (!subject) return { roster: [], marked: false };
  const [roster, session] = await Promise.all([
    Student.find({ school: subject.school }).sort({ enrollmentNo: 1 }),
    AttendanceSession.exists({ subjectCode, date: todayKey() }),
  ]);
  return { roster: roster.map((s) => s.toJSON()), marked: Boolean(session) };
}

// Saves today's sheet once. The unique index on (subject, date) stops a second save, even from two
// browsers at the same moment.
export async function markAttendance(user, subjectCode, presentIds) {
  const subjects = await markableSubjects(user);
  const subject = subjects.find((s) => s.code === subjectCode);
  if (!subject) throw new ApiError(403, "You can only mark attendance for your own subjects");

  const roster = await Student.find({ school: subject.school });
  const rosterIds = new Set(roster.map((s) => String(s._id)));
  if (presentIds.some((id) => !rosterIds.has(String(id)))) {
    throw new ApiError(400, "A student in the list does not belong to this school");
  }
  const present = new Set(presentIds.map(String));

  try {
    await AttendanceSession.create({
      subjectCode,
      date: todayKey(),
      school: subject.school,
      markedBy: user._id,
      presentIds: roster.filter((s) => present.has(String(s._id))).map((s) => s._id),
      absentIds: roster.filter((s) => !present.has(String(s._id))).map((s) => s._id),
    });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, "Attendance for this subject is already saved for today");
    throw err;
  }

  try {
    await AttendanceSummary.bulkWrite(
      roster.map((st) => ({
        updateOne: {
          filter: { studentId: st._id, subjectCode },
          update: { $inc: { held: 1, attended: present.has(String(st._id)) ? 1 : 0 } },
          upsert: true,
        },
      }))
    );
  } catch (err) {
    // Without a transaction, undo the lock so the teacher can try again
    await AttendanceSession.deleteOne({ subjectCode, date: todayKey() });
    throw err;
  }
  return { present: present.size, absent: roster.length - present.size };
}

export function resolveReportSchool(user, requested) {
  if (!hasPermission(user.role, PERM.ATTENDANCE)) throw new ApiError(403, "You do not have access to attendance");
  const scope = visibleSchool(user);
  return scope === null ? requested || "ENG" : scope;
}

