import { z } from "zod";
import { requiredText, isoDate } from "../../utils/validators.js";
import { LEAVE_TYPES } from "./leaveRequest.model.js";

export const applySchema = z.object({
  type: z.enum(LEAVE_TYPES, { message: "Choose a leave type" }),
  fromDate: isoDate("From date"),
  toDate: isoDate("To date"),
  reason: requiredText("Reason", 500),
}).refine((v) => v.toDate >= v.fromDate, { message: "The end date cannot be before the start date", path: ["toDate"] });

export const decisionSchema = z.object({
  status: z.enum(["approved", "rejected"], { message: "Choose approve or reject" }),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});
