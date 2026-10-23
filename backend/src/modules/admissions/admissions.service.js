import { ApiError } from "../../utils/ApiError.js";
import { PERM } from "../../utils/permissions.js";
import { assertManager } from "../../utils/access.js";
import { pad } from "../../utils/helpers.js";
import { sendPlainEmail } from "../../utils/sendEmail.js";
import { School } from "../academic/department.model.js";
import { Student } from "../students/student.model.js";
import { Faculty } from "../faculty/faculty.model.js";
import { insertStudent } from "../students/students.service.js";
import { Application } from "./application.model.js";

async function nextApplicationNo() {
  const year = new Date().getFullYear();
  const prefix = `APP${year}-`;
  const last = await Application.findOne({ applicationNo: new RegExp(`^${prefix}`) }).sort({ applicationNo: -1 });
  const n = last ? Number(last.applicationNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${pad(n, 4)}`;
}

// Public: anyone may apply. The same email cannot have two open applications.
export async function apply(values) {
  const school = await School.findOne({ code: values.school });
  if (!school) throw new ApiError(400, "Choose a valid school");
  if (!school.programs.includes(values.program)) throw new ApiError(400, "That program does not belong to this school");
  const email = values.email.toLowerCase();
  const [open, student, teacher] = await Promise.all([
    Application.findOne({ email, status: { $nin: ["rejected"] } }),
    Student.exists({ email }),
    Faculty.exists({ email }),
  ]);
  if (open) throw new ApiError(409, `An application for this email already exists (${open.applicationNo})`);
  if (student || teacher) throw new ApiError(409, "Someone with this email already studies or works here");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const application = await Application.create({ ...values, email, applicationNo: await nextApplicationNo() });
      sendPlainEmail({
        to: email, name: values.name, subject: `Application ${application.applicationNo} received`,
        lines: [`We received your application to ${values.program}. Your application number is ${application.applicationNo}.`, "Use it with your email to check the status on the application page."],
      }).catch(() => {});
      return { applicationNo: application.applicationNo, status: application.status };
    } catch (err) {
      if (err.code !== 11000 || attempt === 2) throw err;
    }
  }
  return null;
}

// Public: the applicant checks their own status with the number and the email used
export async function checkStatus({ applicationNo, email }) {
  const application = await Application.findOne({ applicationNo: applicationNo.toUpperCase(), email: email.toLowerCase() });
  if (!application) throw new ApiError(404, "No application matches that number and email");
  const { name, program, status, remarks, updatedAt } = application;
  return { applicationNo: application.applicationNo, name, program, status, remarks, updatedAt };
}

export async function listApplications(user, query) {
  assertManager(user, PERM.ADMISSIONS);
  const filter = {};
  if (query.status) filter.status = String(query.status);
  if (query.school) filter.school = String(query.school);
  const items = await Application.find(filter).sort({ createdAt: -1 }).limit(500);
  const counts = await Application.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
  return { items: items.map((a) => a.toJSON()), counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) };
}

export async function decide(user, id, { status, remarks }) {
  assertManager(user, PERM.ADMISSIONS);
  const application = await Application.findById(id);
  if (!application) throw new ApiError(404, "Application not found");
  if (application.status === "enrolled") throw new ApiError(409, "This applicant is already enrolled");
  application.status = status;
  application.remarks = remarks || undefined;
  application.decidedBy = user._id;
  application.decidedAt = new Date();
  await application.save();
  if (["approved", "rejected"].includes(status)) {
    sendPlainEmail({
      to: application.email, name: application.name, subject: `Application ${application.applicationNo}: ${status}`,
      lines: [status === "approved"
        ? "Congratulations, your application has been approved. The admissions office will enroll you shortly."
        : "We are sorry, your application was not selected this time.", ...(remarks ? [`Note: ${remarks}`] : [])],
    }).catch(() => {});
  }
  return application;
}

// Turns an approved application into a student record. The student then registers with the same email
// and the new login is attached to this record when it is approved.
export async function enroll(user, id) {
  assertManager(user, PERM.ADMISSIONS);
  const application = await Application.findById(id);
  if (!application) throw new ApiError(404, "Application not found");
  if (application.status !== "approved") throw new ApiError(409, "Only approved applications can be enrolled");
  if (await Student.exists({ email: application.email })) throw new ApiError(409, "A student with this email already exists");

  const year = new Date().getFullYear();
  const student = await insertStudent({
    name: application.name, email: application.email, phone: application.phone, gender: application.gender,
    school: application.school, program: application.program, dateOfBirth: application.dateOfBirth,
    guardianName: application.guardianName, guardianPhone: application.guardianPhone, city: application.city,
    year: 1, semester: 1, batch: `${year}-${String(year + 4).slice(2)}`,
    section: (await Student.countDocuments({ school: application.school })) % 2 === 0 ? "A" : "B",
  });
  application.status = "enrolled";
  application.studentId = student._id;
  await application.save();
  sendPlainEmail({
    to: application.email, name: application.name, subject: "You are enrolled",
    lines: [`Your enrollment number is ${student.enrollmentNo}.`, "Register on the ERP with this same email address to get your login. Your account is linked to your student record once it is approved."],
  }).catch(() => {});
  return { application, student: student.toJSON() };
}

export async function removeApplication(user, id) {
  assertManager(user, PERM.ADMISSIONS);
  const application = await Application.findById(id);
  if (!application) throw new ApiError(404, "Application not found");
  if (application.status === "enrolled") throw new ApiError(409, "Enrolled applications are kept as a record");
  await application.deleteOne();
}

// Public: the schools and programs the application form offers (read from the database, so changes made in
// Academic Setup show up here)
export async function getOptions() {
  const schools = await School.find().sort({ code: 1 });
  return schools.map((s) => ({ code: s.code, name: s.name, programs: s.programs }));
}
