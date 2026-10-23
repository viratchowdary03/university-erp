import { PERM, can, canManage } from "../../config/permissions";
import { getSchool } from "../../config/schools";
import { visibleSchool } from "../../utils/access";
import { faculty, students, subjects, persist } from "../../utils/demoData";

const pad = (n, width = 2) => String(n).padStart(width, "0");

function assertManager(user) {
  if (!canManage(user?.role, PERM.FACULTY)) throw new Error("You are not allowed to change faculty records");
}

function assertEmailFree(email, exceptId) {
  const taken = [...students, ...faculty].some(
    (p) => p.email.toLowerCase() === email.toLowerCase() && p.id !== exceptId
  );
  if (taken) throw new Error("Someone with this email already exists");
}

// Gives this teacher exactly the chosen subjects of their school. A subject that was taught by someone
// else moves to this teacher; one that is un-ticked becomes unassigned.
function assignSubjects(facultyId, schoolCode, codes) {
  const schoolSubjects = subjects.filter((s) => s.school === schoolCode);
  const valid = new Set(schoolSubjects.map((s) => s.code));
  if (codes.some((c) => !valid.has(c))) throw new Error("A chosen subject does not belong to this school");
  schoolSubjects.forEach((s) => {
    if (codes.includes(s.code)) s.facultyId = facultyId;
    else if (s.facultyId === facultyId) s.facultyId = null;
  });
}

export function listFaculty(user) {
  if (!can(user?.role, PERM.FACULTY)) return [];
  const scope = visibleSchool(user);
  return faculty
    .filter((f) => scope === null || f.school === scope)
    .map((f) => ({ ...f, subjects: subjects.filter((s) => s.facultyId === f.id) }));
}

export function createFaculty(user, values) {
  assertManager(user);
  const school = getSchool(values.school);
  if (!school) throw new Error("Choose a valid school");
  if (!school.programs.includes(values.department)) throw new Error("That program does not belong to this school");
  const email = values.email.trim().toLowerCase();
  assertEmailFree(email);

  const n = Math.max(0, ...faculty.filter((f) => f.school === school.code).map((f) => Number(f.id.split("-")[2]))) + 1;
  const person = {
    id: `F-${school.code}-${n}`,
    employeeId: `VCUF${school.code}${pad(n)}`,
    name: values.name.trim(),
    gender: values.gender,
    email,
    phone: values.phone.trim(),
    school: school.code,
    designation: values.designation,
    qualification: values.qualification.trim(),
    department: values.department,
    experienceYears: Number(values.experienceYears),
    isHod: false,
    subjectCodes: [],
  };
  faculty.push(person);
  assignSubjects(person.id, school.code, values.subjectCodes || []);
  persist();
  return person;
}

export function updateFaculty(user, id, values) {
  assertManager(user);
  const person = faculty.find((f) => f.id === id);
  if (!person) throw new Error("Faculty member not found");
  if (!getSchool(person.school).programs.includes(values.department)) {
    throw new Error("That program does not belong to this school");
  }
  const email = values.email.trim().toLowerCase();
  assertEmailFree(email, id);

  Object.assign(person, {
    name: values.name.trim(),
    gender: values.gender,
    email,
    phone: values.phone.trim(),
    designation: values.designation,
    qualification: values.qualification.trim(),
    department: values.department,
    experienceYears: Number(values.experienceYears),
  });
  assignSubjects(id, person.school, values.subjectCodes || []);
  persist();
  return person;
}

export function deleteFaculty(user, id) {
  assertManager(user);
  const index = faculty.findIndex((f) => f.id === id);
  if (index === -1) throw new Error("Faculty member not found");
  if (faculty[index].isHod) throw new Error("This person is the head of their school. Appoint another head first");
  subjects.filter((s) => s.facultyId === id).forEach((s) => { s.facultyId = null; });
  faculty.splice(index, 1);
  persist();
}
