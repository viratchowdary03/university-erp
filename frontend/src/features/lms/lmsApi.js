import { PERM, can } from "../../config/permissions";
import { visibleSchool } from "../../utils/access";
import { courses, faculty, students, getProgress, daysFromNow } from "../../utils/demoData";

export function listCourses(user, requestedSchool) {
  if (!can(user?.role, PERM.LMS)) return { school: "", courses: [] };
  const scope = visibleSchool(user);
  const school = scope === null ? requestedSchool || "" : scope; // "" means every school
  const list = courses
    .filter((c) => !school || c.school === school)
    .map((c) => ({
      ...c,
      facultyName: faculty.find((f) => f.id === c.facultyId)?.name,
      enrolled: students.filter((s) => s.school === c.school).length,
      teaching: user.id === c.facultyId,
      progress: user.role === "student" ? getProgress(user.id, c.code) : null,
    }));
  return { school, courses: list };
}

// Assignments due soon for a student, nearest first
export function listUpcomingAssignments(user, limit = 4) {
  if (user?.role !== "student") return [];
  return courses
    .filter((c) => c.school === user.school)
    .flatMap((c) => c.assignments.map((a) => ({ ...a, course: c.name, due: daysFromNow(a.dueInDays) })))
    .sort((a, b) => a.due - b.due)
    .slice(0, limit);
}
