import { FeePayment } from "../fees/feePayment.model.js";
import { listStudentDues, listPayments } from "../fees/fees.service.js";
import { getSummary as librarySummary, listIssues } from "../library/library.service.js";
import { Book } from "../library/book.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import { PERM, hasPermission, hasFullAccess, approvableRoles } from "../../utils/permissions.js";
import { visibleSchool } from "../../utils/access.js";
import { School } from "../academic/department.model.js";
import { Student } from "../students/student.model.js";
import { Faculty } from "../faculty/faculty.model.js";
import { Allocation } from "../hostel/allocation.model.js";
import { User } from "../users/user.model.js";
import { AttendanceSession } from "../attendance/attendance.model.js";
import { getSchoolReport, getMarkOverview, rowsFor } from "../attendance/attendance.service.js";
import { getTimetable } from "../timetable/timetable.service.js";
import { listUpcomingAssignments } from "../lms/lms.service.js";
import { getMyHostel } from "../hostel/hostel.service.js";
import { todayKey } from "../../utils/helpers.js";

export const PERIOD_LABELS = ["09:00 - 09:50", "10:00 - 10:50", "11:10 - 12:00", "12:10 - 13:00", "14:00 - 14:50", "15:00 - 15:50"];

const needRole = (user, roles) => {
  if (!roles.includes(user.role)) throw new ApiError(403, "This dashboard is not for your role");
};

// Super admin, registrar, admin (every school) and head of school (their own school)
export async function getAdminDashboard(user) {
  needRole(user, [ROLES.SUPER_ADMIN, ROLES.REGISTRAR, ROLES.ADMIN, ROLES.HOD]);
  const scope = visibleSchool(user);
  const codes = hasFullAccess(user.role) ? (await School.find().sort({ code: 1 })).map((s) => s.code) : [user.school];
  const filter = scope === null ? {} : { school: scope };

  const [reports, studentCount, facultyCount, pending, hostelResidents, totalStudents] = await Promise.all([
    Promise.all(codes.map(async (code) => ({ code, ...(await getSchoolReport(code)) }))),
    Student.countDocuments(filter),
    Faculty.countDocuments(filter),
    hasPermission(user.role, PERM.USERS)
      ? User.countDocuments({ status: "pending_approval", role: { $in: approvableRoles(user.role) } })
      : null,
    Allocation.countDocuments(),
    Student.countDocuments(),
  ]);
  return {
    reports,
    average: reports.length ? Math.round(reports.reduce((n, r) => n + r.average, 0) / reports.length) : 0,
    studentCount,
    facultyCount,
    schoolCount: codes.length,
    pending,
    hostelResidents,
    totalStudents,
  };
}

// `day` is the weekday index the browser wants (0 = Monday)
const dayIndex = (day) => (Number.isInteger(day) && day >= 0 && day <= 4 ? day : 0);

export async function getFacultyDashboard(user, day) {
  needRole(user, [ROLES.FACULTY]);
  const d = dayIndex(day);
  const [{ grid, myFacultyId }, overview, roster] = await Promise.all([
    getTimetable(user),
    getMarkOverview(user),
    Student.countDocuments({ school: user.school }),
  ]);
  const classes = grid[d]
    .map((slot, p) => slot && slot.facultyId === myFacultyId && { ...slot, period: PERIOD_LABELS[p] })
    .filter(Boolean);
  const codes = [...new Set(classes.map((c) => c.subjectCode))];
  const marked = await Promise.all(codes.map((code) => AttendanceSession.exists({ subjectCode: code, date: todayKey() })));
  const average = overview.averages.length
    ? Math.round(overview.averages.reduce((n, r) => n + r.average, 0) / overview.averages.length)
    : 0;
  return {
    classes,
    todaysSubjects: codes.map((code, i) => ({
      code,
      name: classes.find((c) => c.subjectCode === code).subjectName,
      marked: Boolean(marked[i]),
    })),
    subjectCount: overview.subjects.length,
    averages: overview.averages,
    average,
    studentCount: roster,
  };
}

export async function getStudentDashboard(user, day) {
  needRole(user, [ROLES.STUDENT]);
  const student = await Student.findOne({ userId: user._id });
  if (!student) throw new ApiError(404, "Your student record has not been created yet. Contact the university office");
  const [{ grid }, attendance, hostel, assignments] = await Promise.all([
    getTimetable(user),
    rowsFor(student),
    getMyHostel(user),
    listUpcomingAssignments(user),
  ]);
  return {
    rows: attendance.rows,
    overall: attendance.overall,
    classes: grid[dayIndex(day)].map((slot, p) => ({ ...slot, period: PERIOD_LABELS[p] })),
    cgpa: student.cgpa ?? "-",
    hostel,
    assignments,
  };
}

const FINANCE_ROLES = ["accountant", "super_admin", "registrar", "admin"];
const LIBRARY_ROLES = ["librarian", "super_admin", "registrar", "admin"];

// Accountant: money in, money still owed, and the latest receipts (all real, nothing hard-coded)
export async function getAccountantDashboard(user) {
  if (!FINANCE_ROLES.includes(user.role)) throw new ApiError(403, "This dashboard is for the accounts office");
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const sixMonthsAgo = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);
  const sum = async (match) => (await FeePayment.aggregate([{ $match: match }, { $group: { _id: null, n: { $sum: "$amount" } } }]))[0]?.n || 0;
  const [dues, today, month, trend, byMode, recent] = await Promise.all([
    listStudentDues(user, {}),
    sum({ paidAt: { $gte: dayStart } }),
    sum({ paidAt: { $gte: monthStart } }),
    FeePayment.aggregate([
      { $match: { paidAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { y: { $year: "$paidAt" }, m: { $month: "$paidAt" } }, n: { $sum: "$amount" } } },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]),
    FeePayment.aggregate([{ $group: { _id: "$mode", n: { $sum: "$amount" } } }, { $sort: { n: -1 } }]),
    listPayments(user, {}),
  ]);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    summary: { ...dues.summary, collectedToday: today, collectedThisMonth: month },
    monthly: trend.map((t) => ({ label: `${months[t._id.m - 1]} ${t._id.y}`, amount: t.n })),
    byMode: byMode.map((m) => ({ mode: m._id, amount: m.n })),
    defaulters: dues.rows.filter((r) => r.overdue).sort((a, b) => b.balance - a.balance).slice(0, 8),
    recent: recent.slice(0, 8),
  };
}

export async function getLibrarianDashboard(user) {
  if (!LIBRARY_ROLES.includes(user.role)) throw new ApiError(403, "This dashboard is for the library");
  const [summary, issued, categories] = await Promise.all([
    librarySummary(),
    listIssues(user, { status: "issued" }),
    Book.aggregate([{ $group: { _id: "$category", titles: { $sum: 1 }, copies: { $sum: "$copies" } } }, { $sort: { copies: -1 } }, { $limit: 6 }]),
  ]);
  return {
    summary,
    overdue: issued.filter((i) => i.overdueDays > 0).sort((a, b) => b.overdueDays - a.overdueDays).slice(0, 8),
    recent: issued.slice(0, 8),
    categories: categories.map((c) => ({ category: c._id, titles: c.titles, copies: c.copies })),
  };
}
