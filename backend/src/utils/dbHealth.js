// Read-only look into the database: how many records each collection has, and a few consistency checks.
// Used by  npm run db:status  and by Settings > Data health (so no database tool is needed).
import mongoose from "mongoose";

const COLLECTIONS = [
  "users", "schools", "subjects", "faculties", "students", "attendancesummaries", "attendancesessions", "timetableslots", "courses",
  "hostels", "allocations", "applications", "exams", "marks", "feestructures", "feepayments", "payments",
  "books", "bookissues", "vehicles", "transportroutes", "transportallocations", "leaverequests", "notices", "notifications",
  "conversations", "messages", "events", "eventregistrations", "tickets", "certificaterequests", "companies",
  "jobposts", "placementapplications", "alumniprofiles", "materials", "assignments", "submissions", "quizzes",
  "quizattempts", "auditlogs", "settings",
];

export async function collectionCounts() {
  const db = mongoose.connection.db;
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
  const rows = await Promise.all(
    COLLECTIONS.map(async (name) => ({ name, count: existing.has(name) ? await db.collection(name).countDocuments() : 0 }))
  );
  return rows;
}

const col = (name) => mongoose.connection.db.collection(name);

// Each check returns the number of broken records; 0 means healthy.
export async function integrityChecks() {
  const ids = async (name, field = "_id") => new Set((await col(name).distinct(field)).map(String));
  const [studentIds, schoolCodes, userIds, subjectCodes, hostelIds, facultyIds] = await Promise.all([
    ids("students"), ids("schools", "code"), ids("users"), ids("subjects", "code"), ids("hostels"), ids("faculties"),
  ]);
  const students = await col("students").find({}, { projection: { school: 1, userId: 1 } }).toArray();
  const subjects = await col("subjects").find({}, { projection: { school: 1, facultyId: 1 } }).toArray();
  const allocations = await col("allocations").find({}, { projection: { studentId: 1, hostelId: 1 } }).toArray();
  const summaries = await col("attendancesummaries").find({}, { projection: { studentId: 1, subjectCode: 1 } }).toArray();
  const payments = await col("feepayments").find({}, { projection: { studentId: 1 } }).toArray();
  const issues = await col("bookissues").find({ status: "issued" }, { projection: { bookId: 1 } }).toArray();
  const bookIds = await ids("books");

  const checks = [
    ["Students whose school does not exist", students.filter((s) => !schoolCodes.has(String(s.school))).length],
    ["Students linked to a login that no longer exists", students.filter((s) => s.userId && !userIds.has(String(s.userId))).length],
    ["Subjects whose school does not exist", subjects.filter((s) => !schoolCodes.has(String(s.school))).length],
    ["Subjects taught by a missing faculty member", subjects.filter((s) => s.facultyId && !facultyIds.has(String(s.facultyId))).length],
    ["Hostel rooms held by missing students or hostels", allocations.filter((a) => !studentIds.has(String(a.studentId)) || !hostelIds.has(String(a.hostelId))).length],
    ["Attendance records of missing students or subjects", summaries.filter((s) => !studentIds.has(String(s.studentId)) || !subjectCodes.has(s.subjectCode)).length],
    ["Fee payments of missing students", payments.filter((p) => !studentIds.has(String(p.studentId))).length],
    ["Issued books that no longer exist", issues.filter((i) => !bookIds.has(String(i.bookId))).length],
  ];
  return checks.map(([label, broken]) => ({ label, broken, ok: broken === 0 }));
}
