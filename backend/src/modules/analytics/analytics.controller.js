import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./analytics.service.js";

export const insights = asyncHandler(async (req, res) => ok(res, await svc.getInsights(req.user, req.query.school)));
export const prediction = asyncHandler(async (req, res) => ok(res, await svc.getAttendancePrediction(req.user, req.query.school)));
