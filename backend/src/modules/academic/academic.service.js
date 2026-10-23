import { PERM, hasPermission } from "../../utils/permissions.js";
import { ApiError } from "../../utils/ApiError.js";
import { School } from "./department.model.js";
import { Subject } from "./subject.model.js";
import { Faculty } from "../faculty/faculty.model.js";
import { Student } from "../students/student.model.js";
import { Course } from "../lms/course.model.js";
import { TimetableSlot } from "../timetable/timetable.model.js";
import { AttendanceSummary } from "../attendance/attendance.model.js";
import { assertManager } from "../../utils/access.js";

const countBy = async (Model, field) => {
  const rows = await Model.aggregate([{ $group: { _id: field, n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [JSON.stringify(r._id), r.n]));
};

export async function getAcademic(user) {
  if (!hasPermission(user.role, PERM.ACADEMIC)) throw new ApiError(403, "You do not have access to academic setup");
  const [schools, subjects, people, hods, bySchool, bySubjects, byFaculty, byProgram] = await Promise.all([
    School.find().sort({ code: 1 }),
    Subject.find().sort({ code: 1 }),
    Faculty.find().select("name"),
    Faculty.find({ isHod: true }),
    countBy(Student, "$school"),
    countBy(Subject, "$school"),
    countBy(Faculty, "$school"),
    countBy(Student, { school: "$school", program: "$program" }),
  ]);
  const facultyName = new Map(people.map((f) => [String(f._id), f.name]));
  const schoolName = new Map(schools.map((s) => [s.code, s.name]));

  return {
    schools: schools.map((s) => ({
      ...s.toJSON(),
      subjectCount: bySubjects.get(JSON.stringify(s.code)) || 0,
      facultyCount: byFaculty.get(JSON.stringify(s.code)) || 0,
      studentCount: bySchool.get(JSON.stringify(s.code)) || 0,
      hod: hods.find((h) => h.school === s.code)?.toJSON(),
    })),
    programs: schools.flatMap((s) =>
      s.programs.map((program) => ({
        id: `${s.code}-${program}`,
        program,
        school: s.code,
        schoolName: s.name,
        students: byProgram.get(JSON.stringify({ school: s.code, program })) || 0,
      }))
    ),
    subjects: subjects.map((s) => ({
      ...s.toJSON(),
      schoolName: schoolName.get(s.school),
      facultyName: s.facultyId ? facultyName.get(String(s.facultyId)) : undefined,
    })),
  };
}

async function assertTeacher(school, facultyId) {
  if (!facultyId) return;
  const teacher = await Faculty.findById(facultyId);
  if (!teacher || teacher.school !== school) throw new ApiError(400, "That teacher does not belong to this school");
}

// A new subject also gets an LMS course and an empty attendance record for every student of the school
export async function createSubject(user, values) {
  assertManager(user, PERM.ACADEMIC);
  if (!(await School.exists({ code: values.school }))) throw new ApiError(400, "Choose a valid school");
  await assertTeacher(values.school, values.facultyId);
  const subject = await Subject.create({ ...values, facultyId: values.facultyId || null });
  await Course.create({ code: subject.code, name: subject.name, school: subject.school, type: subject.type, credits: subject.credits });
  const students = await Student.find({ school: subject.school }).select("_id");
  if (students.length) {
    await AttendanceSummary.insertMany(students.map((s) => ({ studentId: s._id, subjectCode: subject.code, held: 0, attended: 0 })));
  }
  return subject;
}

// The code and school are fixed once a subject exists, because attendance and exams point at them
export async function updateSubject(user, id, values) {
  assertManager(user, PERM.ACADEMIC);
  const subject = await Subject.findById(id);
  if (!subject) throw new ApiError(404, "Subject not found");
  await assertTeacher(subject.school, values.facultyId);
  const { name, type, credits, semester } = values;
  Object.assign(subject, { name, type, credits, semester, facultyId: values.facultyId || null });
  await subject.save();
  await Course.updateOne({ code: subject.code }, { name, type, credits });
  return subject;
}

export async function deleteSubject(user, id) {
  assertManager(user, PERM.ACADEMIC);
  const subject = await Subject.findById(id);
  if (!subject) throw new ApiError(404, "Subject not found");
  const held = await AttendanceSummary.exists({ subjectCode: subject.code, held: { $gt: 0 } });
  if (held) throw new ApiError(409, "Classes have already been held for this subject, so it cannot be deleted");
  if (await TimetableSlot.exists({ school: subject.school, subjectCode: subject.code })) {
    throw new ApiError(409, "This subject is in the timetable. Remove it from the timetable first");
  }
  await Promise.all([
    AttendanceSummary.deleteMany({ subjectCode: subject.code }),
    Course.deleteOne({ code: subject.code }),
    subject.deleteOne(),
  ]);
}

export async function addProgram(user, code, program) {
  assertManager(user, PERM.ACADEMIC);
  const school = await School.findOne({ code: code.toUpperCase() });
  if (!school) throw new ApiError(404, "School not found");
  if (school.programs.includes(program)) throw new ApiError(409, "This program already exists");
  school.programs.push(program);
  await school.save();
  return school;
}

export async function removeProgram(user, code, program) {
  assertManager(user, PERM.ACADEMIC);
  const school = await School.findOne({ code: code.toUpperCase() });
  if (!school || !school.programs.includes(program)) throw new ApiError(404, "Program not found");
  const [students, teachers] = await Promise.all([
    Student.countDocuments({ school: school.code, program }),
    Faculty.countDocuments({ school: school.code, department: program }),
  ]);
  if (students || teachers) throw new ApiError(409, "Students or faculty still belong to this program");
  school.programs = school.programs.filter((p) => p !== program);
  await school.save();
  return school;
}
