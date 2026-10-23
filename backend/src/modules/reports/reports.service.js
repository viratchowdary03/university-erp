import { ApiError } from "../../utils/ApiError.js";
import { ROLES, PASS_MARK } from "../../utils/constants.js";
import { hasFullAccess } from "../../utils/permissions.js";
import { visibleSchool } from "../../utils/access.js";
import { Student } from "../students/student.model.js";
import { overallByStudent } from "../attendance/attendance.service.js";
import { listStudentDues } from "../fees/fees.service.js";
import { Allocation } from "../hostel/allocation.model.js";
import { Hostel } from "../hostel/hostel.model.js";

const todayIso = () => new Date().toISOString().slice(0, 10);

export const REPORT_TYPES = {
  students: { title: "Student list", who: "academic" },
  attendance: { title: "Attendance shortage (below 75%)", who: "academic" },
  fees: { title: "Fee dues", who: "finance" },
  hostel: { title: "Hostel residents", who: "full" },
};

// Accountants get finance reports, heads of school get academic reports for their own school,
// full-access roles get everything.
function allowed(user, who) {
  if (hasFullAccess(user.role)) return true;
  if (who === "finance") return user.role === ROLES.ACCOUNTANT;
  if (who === "academic") return user.role === ROLES.HOD;
  return false;
}

export const listReportTypes = (user) =>
  Object.entries(REPORT_TYPES).filter(([, r]) => allowed(user, r.who)).map(([id, r]) => ({ id, title: r.title }));

const col = (key, header) => ({ key, header });

export async function buildReport(user, type, requestedSchool) {
  const def = REPORT_TYPES[type];
  if (!def) throw new ApiError(404, "Unknown report");
  if (!allowed(user, def.who)) throw new ApiError(403, "You cannot open this report");
  const scope = visibleSchool(user);
  const school = scope === null ? requestedSchool || "" : scope;
  const generatedOn = todayIso();

  if (type === "students" || type === "attendance") {
    const students = await Student.find(school ? { school } : {}).sort({ school: 1, enrollmentNo: 1 });
    const attendance = await overallByStudent(students.map((s) => s._id));
    let rows = students.map((s) => ({ enrollmentNo: s.enrollmentNo, name: s.name, school: s.school, program: s.program, section: s.section, cgpa: s.cgpa ?? "", attendance: attendance.get(String(s._id)) }));
    if (type === "attendance") rows = rows.filter((r) => r.attendance < PASS_MARK).sort((a, b) => a.attendance - b.attendance);
    return { type, title: def.title, school, generatedOn, columns: [col("enrollmentNo", "Enrollment"), col("name", "Name"), col("school", "School"), col("program", "Program"), col("section", "Section"), col("cgpa", "CGPA"), col("attendance", "Attendance %")], rows };
  }

  if (type === "fees") {
    const { rows } = await listStudentDues(user, { school });
    return {
      type, title: def.title, school, generatedOn,
      columns: [col("enrollmentNo", "Enrollment"), col("name", "Name"), col("school", "School"), col("total", "Total"), col("paid", "Paid"), col("balance", "Balance"), col("status", "Status")],
      rows: rows.filter((r) => r.balance > 0),
    };
  }

  // hostel
  const [allocations, hostels, students] = await Promise.all([Allocation.find(), Hostel.find(), Student.find(school ? { school } : {})]);
  const hostelBy = new Map(hostels.map((h) => [String(h._id), h.name]));
  const studentBy = new Map(students.map((s) => [String(s._id), s]));
  const rows = allocations.filter((a) => studentBy.has(String(a.studentId))).map((a) => {
    const s = studentBy.get(String(a.studentId));
    return { enrollmentNo: s.enrollmentNo, name: s.name, hostel: hostelBy.get(String(a.hostelId)), room: a.room, bed: a.bed, mess: a.mess, feeStatus: a.feeStatus };
  });
  return { type, title: def.title, school, generatedOn, columns: [col("enrollmentNo", "Enrollment"), col("name", "Name"), col("hostel", "Hostel"), col("room", "Room"), col("bed", "Bed"), col("mess", "Mess"), col("feeStatus", "Fee status")], rows };
}
