import { asyncHandler } from "../../utils/asyncHandler.js";
import * as usersService from "./users.service.js";

export const listPending = asyncHandler(async (req, res) => {
  const users = await usersService.listPending(req.user);
  res.json({ success: true, message: "OK", data: { users: users.map((u) => u.toSafeJSON()) } });
});

export const approve = asyncHandler(async (req, res) => {
  const user = await usersService.approve(req.user, req.params.id);
  res.json({ success: true, message: "Account approved", data: { user: user.toSafeJSON() } });
});

export const reject = asyncHandler(async (req, res) => {
  const user = await usersService.reject(req.user, req.params.id);
  res.json({ success: true, message: "Account rejected", data: { user: user.toSafeJSON() } });
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await usersService.createUser(req.user, req.body);
  res.status(201).json({ success: true, message: "Account created", data: { user: user.toSafeJSON() } });
});

export const list = asyncHandler(async (req, res) => {
  res.json({ success: true, message: "OK", data: { users: await usersService.listUsers(req.user, req.query) } });
});

export const setStatus = asyncHandler(async (req, res) => {
  const user = await usersService.setStatus(req.user, req.params.id, req.body.status);
  res.json({ success: true, message: `Account ${user.status === "active" ? "re-activated" : "suspended"}`, data: { user: user.toSafeJSON() } });
});
