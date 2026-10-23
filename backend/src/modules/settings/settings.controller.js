import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./settings.service.js";

export const get = asyncHandler(async (req, res) => ok(res, await svc.getSettings()));
export const update = asyncHandler(async (req, res) => ok(res, await svc.updateSettings(req.user, req.body), "Settings saved"));
export const profile = asyncHandler(async (req, res) => ok(res, { user: await svc.updateProfile(req.user, req.body) }, "Profile updated"));
export const health = asyncHandler(async (req, res) => ok(res, await svc.getHealth(req.user)));
