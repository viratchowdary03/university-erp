import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./auditLogs.service.js";

export const list = asyncHandler(async (req, res) => ok(res, await svc.listLogs(req.query)));
