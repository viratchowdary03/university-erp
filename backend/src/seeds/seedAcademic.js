// Fills an empty database with the university's sample data: schools, subjects, faculty, students,
// attendance, timetables, courses, hostels and room allocations.
//
//   npm run seed:sample            first time
//   npm run seed:sample -- --reset wipe the sample data and load it again (login accounts are kept)
//
// This is for development and demos. It refuses to run when NODE_ENV=production.
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { SCHOOLS } from "../utils/schools.js";
import { School } from "../modules/academic/department.model.js";
import { Subject } from "../modules/academic/subject.model.js";
import { Faculty } from "../modules/faculty/faculty.model.js";
import { Student } from "../modules/students/student.model.js";
import { AttendanceSummary, AttendanceSession } from "../modules/attendance/attendance.model.js";
import { TimetableSlot } from "../modules/timetable/timetable.model.js";
import { Course } from "../modules/lms/course.model.js";
import { Hostel } from "../modules/hostel/hostel.model.js";
import { Allocation } from "../modules/hostel/allocation.model.js";
import * as sample from "./sampleData.js";
import { seedExtras, EXTRA_MODELS } from "./seedExtras.js";

const reset = process.argv.includes("--reset");
const { ObjectId } = mongoose.Types;

if (env.nodeEnv === "production") {
  console.error("Sample data is for development only. Refusing to run in production.");
  process.exit(1);
}

const MODELS = [School, Subject, Faculty, Student, AttendanceSummary, AttendanceSession, TimetableSlot, Course, Hostel, Allocation, ...EXTRA_MODELS];

try {
  await mongoose.connect(env.mongoUri);

  if (reset) {
    await Promise.all(MODELS.map((m) => m.deleteMany({})));
    console.log("Old sample data removed.");
  } else if (await School.countDocuments()) {
    console.log("The database already has data. Use  npm run seed:sample -- --reset  to replace it.");
    process.exit(0);
  }

  // ids first, so records can point at each other
  const facultyIds = new Map(sample.faculty.map((f) => [f.id, new ObjectId()]));
  const studentIds = new Map(sample.students.map((s) => [s.id, new ObjectId()]));
  const hostelIds = new Map(sample.hostels.map((h) => [h.id, new ObjectId()]));

  await School.insertMany(SCHOOLS);

  await Faculty.insertMany(
    sample.faculty.map(({ id, subjectCodes, ...f }) => ({ _id: facultyIds.get(id), ...f }))
  );
  await Subject.insertMany(
    sample.subjects.map((s) => ({ ...s, facultyId: facultyIds.get(s.facultyId) }))
  );
  await Student.insertMany(
    sample.students.map(({ id, hostelResident, ...s }) => ({ _id: studentIds.get(id), ...s }))
  );

  await AttendanceSummary.insertMany(
    Object.entries(sample.attendance).map(([key, rec]) => {
      const [studentId, subjectCode] = key.split("|");
      return { studentId: studentIds.get(studentId), subjectCode, held: rec.held, attended: rec.attended };
    })
  );

  await Hostel.insertMany(
    sample.hostels.map(({ id, capacity, ...h }) => ({ _id: hostelIds.get(id), ...h }))
  );
  await Allocation.insertMany(
    sample.residents.map((r) => ({ ...r, studentId: studentIds.get(r.studentId), hostelId: hostelIds.get(r.hostelId) }))
  );

  await Course.insertMany(
    sample.courses.map((c) => ({
      code: c.code,
      name: c.name,
      school: c.school,
      type: c.type,
      credits: c.credits,
      description: c.description,
      units: c.units,
      materials: c.materials,
      assignments: c.assignments.map((a) => ({ title: a.title, dueDate: sample.daysFromNow(a.dueInDays), marks: a.marks })),
    }))
  );

  const slots = SCHOOLS.flatMap(({ code }) =>
    sample.buildTimetable(code).flatMap((day, d) =>
      day.map((slot, p) => ({ school: code, day: d, period: p, subjectCode: slot.subjectCode, room: slot.room }))
    )
  );
  await TimetableSlot.insertMany(slots);

  await seedExtras();

  console.log(
    `Sample data loaded: ${SCHOOLS.length} schools, ${sample.subjects.length} subjects, ${sample.faculty.length} faculty, ` +
      `${sample.students.length} students, ${sample.hostels.length} hostels, ${sample.residents.length} room allocations, ` +
      `${slots.length} timetable slots, plus fees, exams and marks, library, transport, placements, alumni, events and admissions.`
  );
  console.log("Next (development only):  npm run seed:demo-users  to create sign-in accounts for these people.");
} catch (err) {
  console.error("Seeding failed:", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
