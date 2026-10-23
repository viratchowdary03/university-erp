import { PERM, can } from "../../config/permissions";
import { ROLES } from "../../config/roles";
import { visibleSchool } from "../../utils/access";
import {
  students, subjects, getAttendance, percent, saveAttendance, isMarkedToday, PASS_MARK,
} from "../../utils/demoData";

// Attendance of one student in every subject of their school
export function getStudentAttendance(studentId) {
  const student = students.find((s) => s.id === studentId);
  if (!student) return { rows: [], overall: 0 };
  const rows = subjects
    .filter((s) => s.school === student.school)
    .map((s) => {
      const { held, attended } = getAttendance(studentId, s.code);
      return { code: s.code, name: s.name, held, attended, percent: percent(attended, held) };
    });
  const held = rows.reduce((n, r) => n + r.held, 0);
  const attended = rows.reduce((n, r) => n + r.attended, 0);
  return { rows, overall: percent(attended, held) };
}

// Classes the student must attend in a row to get back to the minimum
export function classesToRecover(attended, held, target = PASS_MARK) {
  const t = target / 100;
  if (held === 0 || attended / held >= t) return 0;
  return Math.ceil((t * held - attended) / (1 - t));
}

// Subjects this person may mark attendance for (faculty: only their own)
export function getMarkableSubjects(user) {
  if (user?.role !== ROLES.FACULTY) return [];
  return subjects.filter((s) => s.school === user.school && s.facultyId === user.id);
}

export function getRoster(user, subjectCode) {
  const allowed = getMarkableSubjects(user).some((s) => s.code === subjectCode);
  return allowed ? students.filter((s) => s.school === user.school) : [];
}

export const alreadyMarkedToday = (subjectCode) => isMarkedToday(subjectCode);

export function markAttendance(user, subjectCode, presentIds) {
  const roster = getRoster(user, subjectCode);
  if (roster.length === 0) throw new Error("You can only mark attendance for your own subjects");
  return saveAttendance(subjectCode, roster, presentIds);
}

// Averages per subject and the students below the minimum, for one school
export function getSchoolReport(schoolCode) {
  const subs = subjects.filter((s) => s.school === schoolCode);
  const roster = students.filter((s) => s.school === schoolCode);
  const subjectRows = subs.map((sub) => {
    const recs = roster.map((st) => getAttendance(st.id, sub.code));
    const held = recs.reduce((n, r) => n + r.held, 0);
    const attended = recs.reduce((n, r) => n + r.attended, 0);
    return { code: sub.code, name: sub.name, average: percent(attended, held) };
  });
  const shortage = roster
    .map((st) => ({ student: st, ...getStudentAttendance(st.id) }))
    .filter((r) => r.overall < PASS_MARK)
    .sort((a, b) => a.overall - b.overall);
  const average = subjectRows.length
    ? Math.round(subjectRows.reduce((n, r) => n + r.average, 0) / subjectRows.length)
    : 0;
  return { subjectRows, shortage, average, studentCount: roster.length };
}

// Which school to report on: full-access roles may choose, everyone else gets their own
export function resolveSchool(user, requested) {
  if (!can(user?.role, PERM.ATTENDANCE)) return "";
  const scope = visibleSchool(user);
  return scope === null ? requested || "ENG" : scope;
}

// Everything the "mark attendance" page needs for one subject
export function getMarkingSession(user, subjectCode) {
  return { roster: getRoster(user, subjectCode), marked: alreadyMarkedToday(subjectCode) };
}

// Teacher's subjects with the class average of each
export function getMarkOverview(user) {
  const subjectList = getMarkableSubjects(user);
  const averages = getSchoolReport(user.school).subjectRows.filter((r) => subjectList.some((s) => s.code === r.code));
  return { subjects: subjectList, averages };
}
