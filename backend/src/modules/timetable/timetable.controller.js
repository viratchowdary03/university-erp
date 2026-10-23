import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./timetable.service.js";

const text = (v) => (typeof v === "string" ? v : undefined);

export const week = asyncHandler(async (req, res) => ok(res, await svc.getTimetable(req.user, text(req.query.school))));
