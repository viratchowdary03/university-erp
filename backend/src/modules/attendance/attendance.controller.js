import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./attendance.service.js";

const text = (v) => (typeof v === "string" ? v : undefined);

export const mine = asyncHandler(async (req, res) => ok(res, await svc.getMyAttendance(req.user)));
export const overview = asyncHandler(async (req, res) => ok(res, await svc.getMarkOverview(req.user)));
export const session = asyncHandler(async (req, res) => ok(res, await svc.getMarkingSession(req.user, String(req.query.subject || ""))));
export const mark = asyncHandler(async (req, res) =>
  ok(res, await svc.markAttendance(req.user, req.body.subjectCode, req.body.presentIds), "Attendance saved", 201));
export const report = asyncHandler(async (req, res) => {
  const school = svc.resolveReportSchool(req.user, text(req.query.school));
  ok(res, await svc.getSchoolReport(school));
});
