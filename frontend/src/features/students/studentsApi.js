import { PERM, can, canManage } from "../../config/permissions";
import { getSchool } from "../../config/schools";
import { visibleSchool } from "../../utils/access";
import {
  students, faculty, residents, subjects, attendanceStore, hostels, getResident,
  persist, BATCH, SEMESTER,
} from "../../utils/demoData";
import { getStudentAttendance } from "../attendance/attendanceApi";

// In demo mode these functions play the part of the server. The permission checks here are the
// ones the real backend must repeat, because the pages only hide buttons.

const pad = (n, width = 3) => String(n).padStart(width, "0");

function assertManager(user) {
  if (!canManage(user?.role, PERM.STUDENTS)) throw new Error("You are not allowed to change student records");
}

function assertEmailFree(email, exceptId) {
  const taken = [...students, ...faculty].some(
    (p) => p.email.toLowerCase() === email.toLowerCase() && p.id !== exceptId
  );
  if (taken) throw new Error("Someone with this email already exists");
}

function assertProgram(school, program) {
  if (!school) throw new Error("Choose a valid school");
  if (!school.programs.includes(program)) throw new Error("That program does not belong to this school");
}

const hostelName = (studentId) => {
  const r = getResident(studentId);
  return r ? hostels.find((h) => h.id === r.hostelId)?.name : null;
};

// Students this person is allowed to see
export function listStudents(user) {
  if (!can(user?.role, PERM.STUDENTS)) return [];
  const scope = visibleSchool(user);
  return students
    .filter((s) => scope === null || s.school === scope)
    .map((s) => ({ ...s, attendance: getStudentAttendance(s.id).overall, hostel: hostelName(s.id) }));
}

export function getStudentDetails(user, id) {
  const student = listStudents(user).find((s) => s.id === id);
  if (!student) return null;
  return { ...student, attendanceRows: getStudentAttendance(id).rows, room: getResident(id) || null };
}

export function createStudent(user, values) {
  assertManager(user);
  const school = getSchool(values.school);
  assertProgram(school, values.program);
  const email = values.email.trim().toLowerCase();
  assertEmailFree(email);

  const n = Math.max(0, ...students.filter((s) => s.school === school.code).map((s) => Number(s.id.split("-")[2]))) + 1;
  const student = {
    id: `S-${school.code}-${n}`,
    enrollmentNo: `VCU25${school.code}${pad(n)}`,
    name: values.name.trim(),
    gender: values.gender,
    email,
    phone: values.phone.trim(),
    school: school.code,
    program: values.program,
    year: 2,
    semester: SEMESTER,
    section: values.section,
    batch: BATCH,
    dateOfBirth: values.dateOfBirth,
    guardianName: values.guardianName.trim(),
    guardianPhone: values.guardianPhone.trim(),
    city: values.city.trim(),
    cgpa: null, // results are entered later
    hostelResident: false,
  };
  students.push(student);
  // No classes have been held for a new student yet
  subjects
    .filter((s) => s.school === school.code)
    .forEach((sub) => {
      attendanceStore[`${student.id}|${sub.code}`] = { held: 0, attended: 0 };
    });
  persist();
  return student;
}

// The school and enrollment number are fixed once a student exists
export function updateStudent(user, id, values) {
  assertManager(user);
  const student = students.find((s) => s.id === id);
  if (!student) throw new Error("Student not found");
  assertProgram(getSchool(student.school), values.program);
  const email = values.email.trim().toLowerCase();
  assertEmailFree(email, id);

  Object.assign(student, {
    name: values.name.trim(),
    gender: values.gender,
    email,
    phone: values.phone.trim(),
    program: values.program,
    section: values.section,
    dateOfBirth: values.dateOfBirth,
    guardianName: values.guardianName.trim(),
    guardianPhone: values.guardianPhone.trim(),
    city: values.city.trim(),
  });
  persist();
  return student;
}

export function deleteStudent(user, id) {
  assertManager(user);
  const index = students.findIndex((s) => s.id === id);
  if (index === -1) throw new Error("Student not found");
  students.splice(index, 1);
  const room = residents.findIndex((r) => r.studentId === id);
  if (room !== -1) residents.splice(room, 1);
  Object.keys(attendanceStore)
    .filter((k) => k.startsWith(`${id}|`))
    .forEach((k) => delete attendanceStore[k]);
  persist();
}
