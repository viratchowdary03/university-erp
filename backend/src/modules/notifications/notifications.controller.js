import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./notifications.service.js";

export const list = asyncHandler(async (req, res) => ok(res, await svc.listMine(req.user)));
export const unread = asyncHandler(async (req, res) => ok(res, await svc.unreadCount(req.user)));
export const read = asyncHandler(async (req, res) => ok(res, (await svc.markRead(req.user, req.params.id)).toJSON()));
export const readAll = asyncHandler(async (req, res) => {
  await svc.markAllRead(req.user);
  ok(res, null, "All notifications marked as read");
});
export const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.user, req.params.id);
  ok(res, null, "Notification removed");
});
