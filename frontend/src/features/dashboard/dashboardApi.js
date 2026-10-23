import { SCHOOLS } from "../../config/schools";
import { PERM, can, hasFullAccess } from "../../config/permissions";
import { PERIODS, residents, students as allStudents, getStudent } from "../../utils/demoData";
import { classDay } from "../../utils/helpers";
import { listStudents } from "../students/studentsApi";
import { listFaculty } from "../faculty/facultyApi";
import { getSchoolReport, getStudentAttendance, getMarkOverview, alreadyMarkedToday } from "../attendance/attendanceApi";
import { getTimetable, onlyMyClasses } from "../timetable/timetableApi";
import { listUpcomingAssignments } from "../lms/lmsApi";
import { getMyHostel } from "../hostel/hostelApi";
import { countPendingRequests } from "../settings/settingsApi";

// One function per dashboard, so each page loads with a single request

export function getAdminDashboard(user) {
  const fullAccess = hasFullAccess(user.role);
  const codes = fullAccess ? SCHOOLS.map((s) => s.code) : [user.school];
  const reports = codes.map((code) => ({ code, ...getSchoolReport(code) }));
  return {
    reports,
    average: Math.round(reports.reduce((n, r) => n + r.average, 0) / reports.length),
    studentCount: listStudents(user).length,
    facultyCount: listFaculty(user).length,
    schoolCount: codes.length,
    pending: can(user.role, PERM.USERS) ? countPendingRequests(user.role) : null,
    hostelResidents: residents.length,
    totalStudents: allStudents.length,
  };
}

export function getFacultyDashboard(user) {
  const day = classDay();
  const grid = onlyMyClasses(getTimetable(user).grid, user);
  const classes = grid[day.index].map((slot, p) => slot && { ...slot, period: PERIODS[p] }).filter(Boolean);
  const overview = getMarkOverview(user);
  const average = overview.averages.length
    ? Math.round(overview.averages.reduce((n, r) => n + r.average, 0) / overview.averages.length)
    : 0;
  const todaysSubjects = [...new Set(classes.map((c) => c.subjectCode))].map((code) => ({
    code,
    name: classes.find((c) => c.subjectCode === code).subjectName,
    marked: alreadyMarkedToday(code),
  }));
  return {
    day,
    classes,
    todaysSubjects,
    subjectCount: overview.subjects.length,
    averages: overview.averages,
    average,
    studentCount: getSchoolReport(user.school).studentCount,
  };
}

export function getStudentDashboard(user) {
  const day = classDay();
  const { rows, overall } = getStudentAttendance(user.id);
  return {
    day,
    rows,
    overall,
    classes: getTimetable(user).grid[day.index].map((slot, p) => ({ ...slot, period: PERIODS[p] })),
    cgpa: getStudent(user.id)?.cgpa ?? "-",
    hostel: getMyHostel(user),
    assignments: listUpcomingAssignments(user),
  };
}
