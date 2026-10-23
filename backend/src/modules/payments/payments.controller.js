import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./payments.service.js";

export const info = asyncHandler(async (req, res) => ok(res, svc.gatewayInfo()));
export const create = asyncHandler(async (req, res) => ok(res, (await svc.createOrder(req.user, req.body)).toJSON(), "Payment started", 201));
export const confirm = asyncHandler(async (req, res) => {
  const order = await svc.confirm(req.user, req.params.orderId, req.body);
  ok(res, order.toJSON(), order.status === "paid" ? "Payment successful" : "Payment failed");
});
export const get = asyncHandler(async (req, res) => ok(res, await svc.getOrder(req.user, req.params.orderId)));
export const mine = asyncHandler(async (req, res) => ok(res, await svc.myPayments(req.user)));
