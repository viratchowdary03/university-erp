import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./admissions.service.js";

export const apply = asyncHandler(async (req, res) => ok(res, await svc.apply(req.body), "Application submitted", 201));
export const status = asyncHandler(async (req, res) => ok(res, await svc.checkStatus(req.body)));
export const list = asyncHandler(async (req, res) => ok(res, await svc.listApplications(req.user, req.query)));
export const decide = asyncHandler(async (req, res) => ok(res, (await svc.decide(req.user, req.params.id, req.body)).toJSON(), "Application updated"));
export const enroll = asyncHandler(async (req, res) => ok(res, await svc.enroll(req.user, req.params.id), "Student enrolled", 201));
export const remove = asyncHandler(async (req, res) => {
  await svc.removeApplication(req.user, req.params.id);
  ok(res, null, "Application deleted");
});
export const options = asyncHandler(async (req, res) => ok(res, await svc.getOptions()));
