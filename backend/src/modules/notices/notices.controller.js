import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./notices.service.js";

export const list = asyncHandler(async (req, res) => ok(res, await svc.listNotices(req.user, { limit: Number(req.query.limit) || undefined })));
export const create = asyncHandler(async (req, res) => ok(res, (await svc.createNotice(req.user, req.body)).toJSON(), "Notice posted", 201));
export const update = asyncHandler(async (req, res) => ok(res, (await svc.updateNotice(req.user, req.params.id, req.body)).toJSON(), "Notice updated"));
export const remove = asyncHandler(async (req, res) => {
  await svc.deleteNotice(req.user, req.params.id);
  ok(res, null, "Notice deleted");
});
