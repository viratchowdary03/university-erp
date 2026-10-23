import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./messaging.service.js";

export const people = asyncHandler(async (req, res) => ok(res, await svc.searchPeople(req.user, req.query.q)));
export const start = asyncHandler(async (req, res) => ok(res, { id: String((await svc.startConversation(req.user, req.body.userId))._id) }));
export const conversations = asyncHandler(async (req, res) => ok(res, await svc.listConversations(req.user)));
export const unread = asyncHandler(async (req, res) => ok(res, await svc.unreadTotal(req.user)));
export const messages = asyncHandler(async (req, res) => ok(res, await svc.getMessages(req.user, req.params.id)));
export const send = asyncHandler(async (req, res) => ok(res, await svc.sendMessage(req.user, req.params.id, req.body.body), "Sent", 201));
