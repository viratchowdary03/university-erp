import { ApiError } from "../../utils/ApiError.js";
import { BATCH, SEMESTER } from "../../utils/constants.js";
import { PERM, hasPermission } from "../../utils/permissions.js";
import { visibleSchool, assertManager } from "../../utils/access.js";
import { pad } from "../../utils/helpers.js";
import { Student } from "./student.model.js";
import { School } from "../academic/department.model.js";
import { Subject } from "../academic/subject.model.js";
import { Faculty } from "../faculty/faculty.model.js";
import { AttendanceSummary } from "../attendance/attendance.model.js";
import { overallByStudent, rowsFor } from "../attendance/attendance.service.js";
import { Allocation } from "../hostel/allocation.model.js";
import { Hostel } from "../hostel/hostel.model.js";
import { User } from "../users/user.model.js";

async function getSchoolOrFail(code, program) {
  const school = await School.findOne({ code });
  if (!school) throw new ApiError(400, "Choose a valid school");
  if (program && !school.programs.includes(program)) throw new ApiError(400, "That program does not belong to this school");
  return school;
}

async function assertEmailFree(email, exceptStudentId) {
  const [student, teacher] = await Promise.all([Student.findOne({ email }), Faculty.findOne({ email })]);
  if (teacher || (student && String(student._id) !== String(exceptStudentId))) {
    throw new ApiError(409, "Someone with this email already exists");
  }
}

async function nextEnrollmentNo(school) {
  const last = await Student.findOne({ school }).sort({ enrollmentNo: -1 }).select("enrollmentNo");
  const n = last ? Number(last.enrollmentNo.slice(-3)) + 1 : 1;
  return `VCU25${school}${pad(n)}`;
}

// Creates the student and starts an empty attendance record for each subject of the school
export async function insertStudent(data) {
  const subjects = await Subject.find({ school: data.school });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const student = await Student.create({
        batch: BATCH,
        semester: SEMESTER,
        year: 2,
        ...data,
        enrollmentNo: data.enrollmentNo || (await nextEnrollmentNo(data.school)),
      });
      await AttendanceSummary.insertMany(
        subjects.map((s) => ({ studentId: student._id, subjectCode: s.code, held: 0, attended: 0 }))
      );
      return student;
    } catch (err) {
      // two admins adding at once can pick the same number; take the next one
      if (err.code !== 11000 || data.enrollmentNo || attempt === 2) throw err;
    }
  }
  return null;
}

// Called when a student registration is approved
export async function createFromRegistration(user) {
  if (await Student.findOne({ userId: user._id })) return;
  // Admissions may already have created this student's record: attach the login to it
  const existing = await Student.findOne({ email: user.email, userId: null });
  if (existing) {
    existing.userId = user._id;
    await existing.save();
    return;
  }
  await assertEmailFree(user.email);
  const p = user.profile || {};
  const year = Number(p.year) || 2;
  await insertStudent({
    userId: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    gender: p.gender,
    school: user.school,
    program: user.department,
    year,
    semester: Math.min(year * 2 - 1, 10),
    section: (await Student.countDocuments({ school: user.school })) % 2 === 0 ? "A" : "B",
    dateOfBirth: p.dateOfBirth,
    guardianName: p.guardianName,
    guardianPhone: p.guardianPhone,
    enrollmentNo: p.enrollmentNo || undefined,
  });
}

export async function listStudents(user) {
  if (!hasPermission(user.role, PERM.STUDENTS)) return [];
  const scope = visibleSchool(user);
  const students = await Student.find(scope === null ? {} : { school: scope }).sort({ school: 1, enrollmentNo: 1 });
  const ids = students.map((s) => s._id);
  const [overall, allocations, hostels] = await Promise.all([
    overallByStudent(ids),
    Allocation.find({ studentId: { $in: ids } }),
    Hostel.find(),
  ]);
  const hostelName = new Map(hostels.map((h) => [String(h._id), h.name]));
  const roomOf = new Map(allocations.map((a) => [String(a.studentId), a]));

  return students.map((s) => ({
    ...s.toJSON(),
    attendance: overall.get(String(s._id)),
    hostel: roomOf.has(String(s._id)) ? hostelName.get(String(roomOf.get(String(s._id)).hostelId)) : null,
  }));
}

export async function getStudentDetails(user, id) {
  if (!hasPermission(user.role, PERM.STUDENTS)) throw new ApiError(403, "You do not have access to students");
  const student = await Student.findById(id);
  const scope = visibleSchool(user);
  if (!student || (scope !== null && student.school !== scope)) throw new ApiError(404, "Student not found");

  const [attendance, allocation] = await Promise.all([rowsFor(student), Allocation.findOne({ studentId: student._id })]);
  const hostelDoc = allocation ? await Hostel.findById(allocation.hostelId) : null;
  return {
    ...student.toJSON(),
    attendance: attendance.overall,
    attendanceRows: attendance.rows,
    hostel: hostelDoc?.name ?? null,
    room: allocation ? allocation.toJSON() : null,
  };
}

export async function createStudent(user, values) {
  assertManager(user, PERM.STUDENTS);
  await getSchoolOrFail(values.school, values.program);
  const email = values.email.trim().toLowerCase();
  await assertEmailFree(email);
  return insertStudent({ ...values, email, cgpa: null });
}

// The school and enrollment number are fixed once a student exists
export async function updateStudent(user, id, values) {
  assertManager(user, PERM.STUDENTS);
  const student = await Student.findById(id);
  if (!student) throw new ApiError(404, "Student not found");
  await getSchoolOrFail(student.school, values.program);
  const email = values.email.trim().toLowerCase();
  await assertEmailFree(email, student._id);

  const { school, enrollmentNo, ...editable } = values; // eslint-disable-line no-unused-vars
  Object.assign(student, editable, { email });
  await student.save();
  return student;
}

export async function deleteStudent(user, id) {
  assertManager(user, PERM.STUDENTS);
  const student = await Student.findById(id);
  if (!student) throw new ApiError(404, "Student not found");
  await Promise.all([
    Allocation.deleteOne({ studentId: student._id }),
    AttendanceSummary.deleteMany({ studentId: student._id }),
    // a student who had a login can no longer sign in
    student.userId ? User.updateOne({ _id: student.userId }, { status: "suspended" }) : null,
  ]);
  await student.deleteOne();
}
