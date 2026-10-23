import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./grievance.service.js";

export const create = asyncHandler(async (req, res) => ok(res, (await svc.createTicket(req.user, req.body)).toJSON(), "Ticket raised", 201));
export const list = asyncHandler(async (req, res) => ok(res, await svc.listTickets(req.user, req.query)));
export const get = asyncHandler(async (req, res) => ok(res, await svc.getTicket(req.user, req.params.id)));
export const comment = asyncHandler(async (req, res) => ok(res, (await svc.addComment(req.user, req.params.id, req.body.text)).toJSON(), "Comment added", 201));
export const status = asyncHandler(async (req, res) => ok(res, (await svc.setStatus(req.user, req.params.id, req.body.status)).toJSON(), "Status updated"));
