import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import { PERM } from "../../utils/permissions.js";
import { assertManager } from "../../utils/access.js";
import { Student } from "../students/student.model.js";
import { notify } from "../notifications/notifications.service.js";
import { Company } from "./company.model.js";
import { JobPost } from "./jobPost.model.js";
import { PlacementApplication } from "./placementApplication.model.js";

const todayIso = () => new Date().toISOString().slice(0, 10);

// ---------- companies ----------
export const listCompanies = async () => (await Company.find().sort({ name: 1 })).map((c) => c.toJSON());
export async function createCompany(user, values) {
  assertManager(user, PERM.PLACEMENTS);
  return Company.create(values);
}
export async function updateCompany(user, id, values) {
  assertManager(user, PERM.PLACEMENTS);
  const company = await Company.findById(id);
  if (!company) throw new ApiError(404, "Company not found");
  Object.assign(company, values);
  await company.save();
  return company;
}
export async function deleteCompany(user, id) {
  assertManager(user, PERM.PLACEMENTS);
  if (await JobPost.exists({ companyId: id })) throw new ApiError(409, "This company has job posts. Delete them first");
  const company = await Company.findByIdAndDelete(id);
  if (!company) throw new ApiError(404, "Company not found");
}

// ---------- jobs ----------
const eligible = (job, student) =>
  Boolean(student) && (student.cgpa ?? 0) >= job.minCgpa && (!job.schools.length || job.schools.includes(student.school));

export async function listJobs(user) {
  const [jobs, companies, counts] = await Promise.all([
    JobPost.find().sort({ deadline: 1 }).limit(300),
    Company.find(),
    PlacementApplication.aggregate([{ $group: { _id: "$jobId", n: { $sum: 1 } } }]),
  ]);
  const companyBy = new Map(companies.map((c) => [String(c._id), c]));
  const countBy = new Map(counts.map((c) => [String(c._id), c.n]));
  const student = user.role === ROLES.STUDENT ? await Student.findOne({ userId: user._id }) : null;
  const mine = student ? new Set((await PlacementApplication.find({ studentId: student._id })).map((a) => String(a.jobId))) : new Set();
  return jobs.map((j) => ({
    ...j.toJSON(),
    companyName: companyBy.get(String(j.companyId))?.name,
    applicants: countBy.get(String(j._id)) || 0,
    expired: j.deadline < todayIso(),
    applied: mine.has(String(j._id)),
    eligible: student ? eligible(j, student) : undefined,
  }));
}

export async function createJob(user, values) {
  assertManager(user, PERM.PLACEMENTS);
  if (!(await Company.exists({ _id: values.companyId }))) throw new ApiError(400, "Choose a company");
  return JobPost.create(values);
}
export async function updateJob(user, id, values) {
  assertManager(user, PERM.PLACEMENTS);
  const job = await JobPost.findById(id);
  if (!job) throw new ApiError(404, "Job not found");
  if (!(await Company.exists({ _id: values.companyId }))) throw new ApiError(400, "Choose a company");
  Object.assign(job, values);
  await job.save();
  return job;
}
export async function deleteJob(user, id) {
  assertManager(user, PERM.PLACEMENTS);
  const job = await JobPost.findById(id);
  if (!job) throw new ApiError(404, "Job not found");
  await Promise.all([PlacementApplication.deleteMany({ jobId: job._id }), job.deleteOne()]);
}

// ---------- applications ----------
export async function apply(user, jobId) {
  if (user.role !== ROLES.STUDENT) throw new ApiError(403, "Only students can apply");
  const [student, job] = await Promise.all([Student.findOne({ userId: user._id }), JobPost.findById(jobId)]);
  if (!student) throw new ApiError(404, "Your student record has not been created yet");
  if (!job) throw new ApiError(404, "Job not found");
  if (job.status !== "open" || job.deadline < todayIso()) throw new ApiError(409, "Applications for this job are closed");
  if (!eligible(job, student)) throw new ApiError(403, `You are not eligible: this job needs CGPA ${job.minCgpa}+${job.schools.length ? ` and a student of ${job.schools.join(", ")}` : ""}`);
  try {
    return await PlacementApplication.create({ jobId, studentId: student._id });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, "You have already applied");
    throw err;
  }
}

export async function myApplications(user) {
  if (user.role !== ROLES.STUDENT) throw new ApiError(403, "Only students have applications");
  const student = await Student.findOne({ userId: user._id });
  if (!student) return [];
  const apps = await PlacementApplication.find({ studentId: student._id }).sort({ createdAt: -1 });
  const jobs = await JobPost.find({ _id: { $in: apps.map((a) => a.jobId) } });
  const companies = await Company.find({ _id: { $in: jobs.map((j) => j.companyId) } });
  const jobBy = new Map(jobs.map((j) => [String(j._id), j]));
  const companyBy = new Map(companies.map((c) => [String(c._id), c]));
  return apps.map((a) => {
    const job = jobBy.get(String(a.jobId));
    return { ...a.toJSON(), jobTitle: job?.title, companyName: companyBy.get(String(job?.companyId))?.name, packageLpa: job?.packageLpa };
  });
}

export async function jobApplications(user, jobId) {
  assertManager(user, PERM.PLACEMENTS);
  const apps = await PlacementApplication.find({ jobId }).sort({ createdAt: 1 });
  const students = await Student.find({ _id: { $in: apps.map((a) => a.studentId) } });
  const by = new Map(students.map((s) => [String(s._id), s]));
  return apps.map((a) => {
    const s = by.get(String(a.studentId));
    return { ...a.toJSON(), studentName: s?.name, enrollmentNo: s?.enrollmentNo, school: s?.school, program: s?.program, cgpa: s?.cgpa };
  });
}

export async function setApplicationStatus(user, id, { status, note }) {
  assertManager(user, PERM.PLACEMENTS);
  const app = await PlacementApplication.findById(id);
  if (!app) throw new ApiError(404, "Application not found");
  app.status = status;
  app.note = note || undefined;
  await app.save();
  const [student, job] = await Promise.all([Student.findById(app.studentId), JobPost.findById(app.jobId)]);
  if (student?.userId) notify(student.userId, { title: `Application ${status}`, message: job?.title || "", link: "/placements", type: status === "selected" ? "success" : "info" });
  return app;
}

export async function getStats(user) {
  assertManager(user, PERM.PLACEMENTS);
  const [companies, jobs, applications, selected] = await Promise.all([
    Company.countDocuments(), JobPost.countDocuments({ status: "open" }), PlacementApplication.countDocuments(), PlacementApplication.countDocuments({ status: "selected" }),
  ]);
  return { companies, openJobs: jobs, applications, selected };
}
