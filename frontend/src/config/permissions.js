import { ROLES as R } from "./roles";

// One permission per module. Keep in sync with backend/src/utils/permissions.js
export const PERM = {
  DASHBOARD: "dashboard",
  USERS: "users", // approve registrations, create staff accounts
  ACADEMIC: "academic",
  ADMISSIONS: "admissions",
  STUDENTS: "students",
  FACULTY: "faculty",
  TIMETABLE: "timetable",
  ATTENDANCE: "attendance",
  LMS: "lms",
  EXAMS: "exams",
  RESULTS: "results",
  FEES: "fees",
  LIBRARY: "library",
  HOSTEL: "hostel",
  TRANSPORT: "transport",
  LEAVE: "leave",
  NOTICES: "notices",
  REPORTS: "reports",
  SETTINGS: "settings",
  PLACEMENTS: "placements",
  ALUMNI: "alumni",
  EVENTS: "events",
  GRIEVANCE: "grievance",
  CERTIFICATES: "certificates",
  MESSAGES: "messages",
  ANALYTICS: "analytics",
  AUDIT: "audit",
};

const P = PERM;
const EVERYTHING = Object.values(P);

export const FULL_ACCESS_ROLES = [R.SUPER_ADMIN, R.REGISTRAR, R.ADMIN];

export const ROLE_PERMISSIONS = {
  // Super admin, registrar and admin can open every module for every school
  [R.SUPER_ADMIN]: EVERYTHING,
  [R.REGISTRAR]: EVERYTHING,
  [R.ADMIN]: EVERYTHING,

  // Head of school: academic work of their own school. No admissions, fees, hostel, library.
  [R.HOD]: [
    P.DASHBOARD, P.STUDENTS, P.FACULTY, P.TIMETABLE, P.ATTENDANCE, P.LMS, P.EXAMS,
    P.RESULTS, P.LEAVE, P.NOTICES, P.REPORTS, P.SETTINGS,
    P.PLACEMENTS, P.ALUMNI, P.EVENTS, P.GRIEVANCE, P.MESSAGES, P.ANALYTICS,
  ],

  // Faculty: the education process only. No admissions, fees, hostel, transport, library.
  [R.FACULTY]: [
    P.DASHBOARD, P.STUDENTS, P.TIMETABLE, P.ATTENDANCE, P.LMS, P.EXAMS, P.RESULTS,
    P.LEAVE, P.NOTICES, P.SETTINGS, P.ALUMNI, P.EVENTS, P.GRIEVANCE, P.MESSAGES,
  ],

  // Student: their own data
  [R.STUDENT]: [
    P.DASHBOARD, P.TIMETABLE, P.ATTENDANCE, P.LMS, P.EXAMS, P.RESULTS, P.FEES, P.LIBRARY,
    P.HOSTEL, P.TRANSPORT, P.LEAVE, P.NOTICES, P.SETTINGS,
    P.PLACEMENTS, P.ALUMNI, P.EVENTS, P.GRIEVANCE, P.CERTIFICATES, P.MESSAGES,
  ],

  // Accountant: money only
  [R.ACCOUNTANT]: [P.DASHBOARD, P.FEES, P.REPORTS, P.NOTICES, P.SETTINGS, P.EVENTS, P.GRIEVANCE, P.MESSAGES],

  // Librarian: library only
  [R.LIBRARIAN]: [P.DASHBOARD, P.LIBRARY, P.NOTICES, P.SETTINGS, P.EVENTS, P.GRIEVANCE, P.MESSAGES],
};

// Who may add, change and delete records of each module (same table as the backend's MANAGE_ROLES).
// Everyone else with access can only view, or work with their own records.
const FULL = FULL_ACCESS_ROLES;
export const MANAGE_ROLES = {
  [P.ACADEMIC]: FULL, [P.ADMISSIONS]: FULL, [P.STUDENTS]: FULL, [P.FACULTY]: FULL, [P.HOSTEL]: FULL,
  [P.TRANSPORT]: FULL, [P.PLACEMENTS]: FULL, [P.ALUMNI]: FULL, [P.EVENTS]: FULL, [P.CERTIFICATES]: FULL,
  [P.GRIEVANCE]: FULL, [P.SETTINGS]: FULL, [P.AUDIT]: FULL, [P.USERS]: FULL,
  [P.FEES]: [...FULL, R.ACCOUNTANT],
  [P.LIBRARY]: [...FULL, R.LIBRARIAN],
  [P.NOTICES]: [...FULL, R.HOD, R.FACULTY],
  [P.EXAMS]: [...FULL, R.HOD, R.FACULTY],
  [P.RESULTS]: [...FULL, R.HOD, R.FACULTY],
  [P.LMS]: [...FULL, R.HOD, R.FACULTY],
};
export const canManage = (role, permission) => Boolean(MANAGE_ROLES[permission]?.includes(role));

export const can = (role, permission) => Boolean(ROLE_PERMISSIONS[role]?.includes(permission));
export const hasFullAccess = (role) => FULL_ACCESS_ROLES.includes(role);

// Who may approve a registration request for which role.
// Super admin approves anything. Registrar and admin approve everything below them,
// but never a super admin, registrar or admin request.
const LOWER_ROLES = [R.HOD, R.FACULTY, R.STUDENT, R.ACCOUNTANT, R.LIBRARIAN];

const APPROVABLE_ROLES = {
  [R.SUPER_ADMIN]: Object.values(R),
  [R.REGISTRAR]: LOWER_ROLES,
  [R.ADMIN]: LOWER_ROLES,
};

export const approvableRoles = (approverRole) => APPROVABLE_ROLES[approverRole] || [];
export const canApprove = (approverRole, targetRole) => approvableRoles(approverRole).includes(targetRole);

// Who has to approve a request for this role (shown on the registration page)
export const approverNote = (role) =>
  FULL_ACCESS_ROLES.includes(role)
    ? "Needs approval from a Super Admin"
    : "Needs approval from the Super Admin, Registrar or Admin";

// Shown on the dashboard so people understand what their role can do
export const ROLE_SUMMARY = {
  [R.SUPER_ADMIN]: "Full access to every module, for every school, including approving all accounts.",
  [R.REGISTRAR]: "Full access to every module and every school. Approves accounts for heads of school, faculty, students, accountants and librarians.",
  [R.ADMIN]: "Full access to every module and every school. Approves accounts for heads of school, faculty, students, accountants and librarians.",
  [R.HOD]: "Academic work for your own school: students, faculty, timetable, attendance, LMS, exams and results. Admissions, fees, hostel and library are not available.",
  [R.FACULTY]: "The education process for your school: timetable, attendance, LMS, exams and results. Admissions, fees, hostel, transport and library work are not available.",
  [R.STUDENT]: "Your own timetable, attendance, courses, exams, results, fees, library, hostel, transport, placements and certificates.",
  [R.ACCOUNTANT]: "Fees, payments and finance reports only.",
  [R.LIBRARIAN]: "Library work only.",
};
