import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/respond.js";
import * as svc from "./library.service.js";

export const books = asyncHandler(async (req, res) => ok(res, await svc.listBooks(req.query)));
export const createBook = asyncHandler(async (req, res) => ok(res, (await svc.createBook(req.user, req.body)).toJSON(), "Book added", 201));
export const updateBook = asyncHandler(async (req, res) => ok(res, (await svc.updateBook(req.user, req.params.id, req.body)).toJSON(), "Book updated"));
export const removeBook = asyncHandler(async (req, res) => {
  await svc.deleteBook(req.user, req.params.id);
  ok(res, null, "Book deleted");
});
export const issues = asyncHandler(async (req, res) => ok(res, await svc.listIssues(req.user, req.query)));
export const mine = asyncHandler(async (req, res) => ok(res, await svc.myIssues(req.user)));
export const issue = asyncHandler(async (req, res) => ok(res, (await svc.issueBook(req.user, req.body)).toJSON(), "Book issued", 201));
export const giveBack = asyncHandler(async (req, res) => ok(res, (await svc.returnBook(req.user, req.params.id)).toJSON(), "Book returned"));
export const renew = asyncHandler(async (req, res) => ok(res, (await svc.renewBook(req.user, req.params.id)).toJSON(), "Book renewed"));
export const summary = asyncHandler(async (req, res) => ok(res, await svc.getSummary()));
