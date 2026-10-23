import { SCHOOLS } from "../../config/schools";
import { PERM, can } from "../../config/permissions";
import { subjects, faculty, students } from "../../utils/demoData";

export function getSchoolOverview(user) {
  if (!can(user?.role, PERM.ACADEMIC)) return [];
  return SCHOOLS.map((school) => ({
    ...school,
    subjectCount: subjects.filter((s) => s.school === school.code).length,
    facultyCount: faculty.filter((f) => f.school === school.code).length,
    studentCount: students.filter((s) => s.school === school.code).length,
    hod: faculty.find((f) => f.school === school.code && f.isHod),
  }));
}

export function listPrograms(user) {
  return getSchoolOverview(user).flatMap((school) =>
    school.programs.map((program) => ({
      id: `${school.code}-${program}`,
      program,
      school: school.code,
      schoolName: school.name,
      students: students.filter((s) => s.school === school.code && s.program === program).length,
    }))
  );
}

export function listSubjects(user) {
  if (!can(user?.role, PERM.ACADEMIC)) return [];
  return subjects.map((s) => ({
    ...s,
    schoolName: SCHOOLS.find((x) => x.code === s.school)?.name,
    facultyName: faculty.find((f) => f.id === s.facultyId)?.name,
  }));
}
