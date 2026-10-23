import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./dashboard.service.js";

const day = (req) => (req.query.day === undefined ? undefined : Number(req.query.day));

export const admin = asyncHandler(async (req, res) => ok(res, await svc.getAdminDashboard(req.user)));
export const faculty = asyncHandler(async (req, res) => ok(res, await svc.getFacultyDashboard(req.user, day(req))));
export const student = asyncHandler(async (req, res) => ok(res, await svc.getStudentDashboard(req.user, day(req))));
export const accountant = asyncHandler(async (req, res) => ok(res, await svc.getAccountantDashboard(req.user)));
export const librarian = asyncHandler(async (req, res) => ok(res, await svc.getLibrarianDashboard(req.user)));
