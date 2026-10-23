import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./leave.service.js";

export const apply = asyncHandler(async (req, res) => ok(res, (await svc.apply(req.user, req.body)).toJSON(), "Leave request sent", 201));
export const mine = asyncHandler(async (req, res) => ok(res, await svc.listMine(req.user)));
export const cancel = asyncHandler(async (req, res) => ok(res, (await svc.cancel(req.user, req.params.id)).toJSON(), "Request cancelled"));
export const requests = asyncHandler(async (req, res) => ok(res, await svc.listRequests(req.user, req.query)));
export const decide = asyncHandler(async (req, res) => ok(res, (await svc.decide(req.user, req.params.id, req.body)).toJSON(), "Decision saved"));
