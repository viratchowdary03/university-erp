import { z } from "zod";
import { objectId } from "../../utils/validators.js";

export const orderSchema = z.object({
  structureId: objectId("Fee"),
  amount: z.coerce.number().positive("Amount must be more than zero").optional(),
});

export const confirmSchema = z.object({
  method: z.enum(["UPI", "Card", "Net Banking"], { message: "Choose a payment method" }),
  outcome: z.enum(["success", "failure"]).default("success"),
});
