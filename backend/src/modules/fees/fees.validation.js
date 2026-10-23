import { z } from "zod";
import { SCHOOL_CODES } from "../../utils/constants.js";
import { requiredText, isoDate, objectId } from "../../utils/validators.js";
import { PAYMENT_MODES } from "./feePayment.model.js";

export const structureSchema = z.object({
  title: requiredText("Title", 100),
  school: z.enum(SCHOOL_CODES, { message: "Select a school" }),
  program: z.string().trim().max(100).optional().or(z.literal("")),
  components: z.array(z.object({
    name: requiredText("Component name", 60),
    amount: z.coerce.number({ invalid_type_error: "Enter an amount" }).min(0).max(10000000),
  })).min(1, "Add at least one fee component").max(15),
  dueDate: isoDate("Due date"),
});

export const collectSchema = z.object({
  studentId: objectId("Student"),
  structureId: objectId("Fee"),
  amount: z.coerce.number({ invalid_type_error: "Enter an amount" }).positive("Amount must be more than zero"),
  mode: z.enum(PAYMENT_MODES.filter((m) => m !== "Online"), { message: "Choose a payment mode" }),
  reference: z.string().trim().max(60).optional().or(z.literal("")),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});
