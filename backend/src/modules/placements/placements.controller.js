import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./placements.service.js";

export const companies = asyncHandler(async (req, res) => ok(res, await svc.listCompanies()));
export const createCompany = asyncHandler(async (req, res) => ok(res, (await svc.createCompany(req.user, req.body)).toJSON(), "Company added", 201));
export const updateCompany = asyncHandler(async (req, res) => ok(res, (await svc.updateCompany(req.user, req.params.id, req.body)).toJSON(), "Company updated"));
export const removeCompany = asyncHandler(async (req, res) => {
  await svc.deleteCompany(req.user, req.params.id);
  ok(res, null, "Company deleted");
});
export const jobs = asyncHandler(async (req, res) => ok(res, await svc.listJobs(req.user)));
export const createJob = asyncHandler(async (req, res) => ok(res, (await svc.createJob(req.user, req.body)).toJSON(), "Job posted", 201));
export const updateJob = asyncHandler(async (req, res) => ok(res, (await svc.updateJob(req.user, req.params.id, req.body)).toJSON(), "Job updated"));
export const removeJob = asyncHandler(async (req, res) => {
  await svc.deleteJob(req.user, req.params.id);
  ok(res, null, "Job deleted");
});
export const apply = asyncHandler(async (req, res) => ok(res, (await svc.apply(req.user, req.params.id)).toJSON(), "Application sent", 201));
export const mine = asyncHandler(async (req, res) => ok(res, await svc.myApplications(req.user)));
export const applicants = asyncHandler(async (req, res) => ok(res, await svc.jobApplications(req.user, req.params.id)));
export const setStatus = asyncHandler(async (req, res) => ok(res, (await svc.setApplicationStatus(req.user, req.params.id, req.body)).toJSON(), "Status updated"));
export const stats = asyncHandler(async (req, res) => ok(res, await svc.getStats(req.user)));
