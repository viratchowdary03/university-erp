import { ROLES as R } from "./roles";

// What each role has to tell us when registering. Used to draw the form and to validate it
// (see buildRegisterSchema in features/auth/schemas.js). Keep in sync with
// backend/src/modules/auth/auth.validation.js.

export const FACULTY_DESIGNATIONS = [
  "Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Visiting Faculty",
];

export const ADMIN_OFFICES = [
  "Admissions Office", "Examination Cell", "Hostel Office", "Transport Office",
  "Accounts Office", "IT & Systems", "General Administration",
];

export const STUDENT_YEARS = [1, 2, 3, 4, 5].map((y) => ({ value: String(y), label: `Year ${y}` }));

// kind: text | number | tel | date | select | school | program
const field = (name, label, kind = "text", extra = {}) => ({ name, label, kind, ...extra });

const employeeId = field("employeeId", "Employee ID", "text", { placeholder: "e.g. VCU-0142" });
const designation = field("designation", "Designation");
const qualification = field("qualification", "Highest qualification", "text", { placeholder: "e.g. Ph.D., M.Tech, MBA" });
const specialization = field("specialization", "Specialization");
const experience = field("experienceYears", "Years of experience", "number", { min: 0, max: 60 });
const school = field("school", "School", "school");
const program = field("department", "Program / department", "program");

export const ROLE_FIELDS = {
  [R.SUPER_ADMIN]: [
    employeeId,
    designation,
    field("reason", "Why do you need Super Admin access?", "text", { max: 300, wide: true }),
  ],
  [R.REGISTRAR]: [employeeId, designation, qualification, experience],
  [R.ADMIN]: [
    employeeId,
    designation,
    field("officeName", "Office / section", "select", { options: ADMIN_OFFICES }),
    experience,
  ],
  [R.HOD]: [employeeId, school, program, qualification, specialization, experience],
  [R.FACULTY]: [
    employeeId,
    school,
    program,
    field("designation", "Designation", "select", { options: FACULTY_DESIGNATIONS }),
    qualification,
    specialization,
    experience,
  ],
  [R.STUDENT]: [
    field("enrollmentNo", "Enrollment number (if you have one)", "text", { required: false }),
    field("gender", "Gender", "select", { options: [{ value: "M", label: "Male" }, { value: "F", label: "Female" }] }),
    school,
    field("department", "Program", "program"),
    field("year", "Year of study", "select", { options: STUDENT_YEARS }),
    field("dateOfBirth", "Date of birth", "date"),
    field("guardianName", "Guardian name"),
    field("guardianPhone", "Guardian phone", "tel"),
  ],
  [R.ACCOUNTANT]: [employeeId, qualification, experience],
  [R.LIBRARIAN]: [employeeId, qualification, experience],
};

export const ROLE_CHOICES = [
  { value: R.STUDENT, label: "Student", hint: "Courses, attendance, results, hostel" },
  { value: R.FACULTY, label: "Faculty", hint: "Teaching, attendance, exams" },
  { value: R.HOD, label: "Head of School", hint: "Runs the academics of a school" },
  { value: R.REGISTRAR, label: "Registrar", hint: "Records, admissions, all schools" },
  { value: R.ADMIN, label: "Administrator", hint: "Operations across the university" },
  { value: R.SUPER_ADMIN, label: "Super Admin", hint: "Full control of the ERP" },
  { value: R.ACCOUNTANT, label: "Accountant", hint: "Fees and finance" },
  { value: R.LIBRARIAN, label: "Librarian", hint: "Library management" },
];
