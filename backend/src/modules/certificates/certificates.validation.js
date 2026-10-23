import { z } from "zod";
import { requiredText } from "../../utils/validators.js";
import { CERTIFICATE_TYPES } from "./certificateRequest.model.js";

export const requestSchema = z.object({
  type: z.enum(CERTIFICATE_TYPES, { message: "Choose a certificate" }),
  purpose: requiredText("Purpose", 300),
});
export const decisionSchema = z.object({
  status: z.enum(["approved", "rejected"], { message: "Choose approve or reject" }),
  remarks: z.string().trim().max(300).optional().or(z.literal("")),
});
