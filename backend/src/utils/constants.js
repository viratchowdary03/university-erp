import { SCHOOLS } from "./schools.js";

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  REGISTRAR: "registrar",
  ADMIN: "admin",
  HOD: "hod",
  FACULTY: "faculty",
  STUDENT: "student",
  ACCOUNTANT: "accountant",
  LIBRARIAN: "librarian",
};
export const ROLE_VALUES = Object.values(ROLES);

// Roles that can see and manage every module (see utils/permissions.js)
export const FULL_ACCESS_ROLES = [ROLES.SUPER_ADMIN, ROLES.REGISTRAR, ROLES.ADMIN];

// Roles an administrator may create directly (see users.service.js for who can create what)
export const STAFF_ROLES = [
  ROLES.ADMIN, ROLES.REGISTRAR, ROLES.HOD, ROLES.FACULTY, ROLES.ACCOUNTANT, ROLES.LIBRARIAN,
];

export const ACCOUNT_STATUS = {
  PENDING_VERIFICATION: "pending_verification", // email not verified yet
  PENDING_APPROVAL: "pending_approval", // verified, waiting for an approver
  ACTIVE: "active",
  SUSPENDED: "suspended",
};
export const ACCOUNT_STATUS_VALUES = Object.values(ACCOUNT_STATUS);

export const SCHOOL_CODES = SCHOOLS.map((s) => s.code);

// Sample-data scope: every school shares the same semester until semester-wise setup is built
export const SEMESTER = 3;
export const BATCH = "2025-29";
export const PASS_MARK = 75; // minimum attendance percentage
export const TIMEZONE = process.env.UNIVERSITY_TIMEZONE || "Asia/Kolkata";

// Keep in sync with frontend/src/config/roleFields.js
export const FACULTY_DESIGNATIONS = [
  "Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Visiting Faculty",
];
export const ADMIN_OFFICES = [
  "Admissions Office", "Examination Cell", "Hostel Office", "Transport Office",
  "Accounts Office", "IT & Systems", "General Administration",
];
