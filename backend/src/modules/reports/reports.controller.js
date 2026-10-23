import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./reports.service.js";

export const types = asyncHandler(async (req, res) => ok(res, svc.listReportTypes(req.user)));
export const build = asyncHandler(async (req, res) => ok(res, await svc.buildReport(req.user, req.params.type, req.query.school)));
