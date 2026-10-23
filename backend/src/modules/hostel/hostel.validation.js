import { z } from "zod";
import { objectId, notFuture } from "../../utils/validators.js";

const details = {
  hostelId: objectId("a hostel"),
  room: z.string().trim().regex(/^\d{3}$/, "Enter a 3-digit room number, like 204"),
  bed: z.enum(["A", "B", "C"], { message: "Select a bed" }),
  mess: z.enum(["Veg", "Non-Veg"], { message: "Select a mess plan" }),
  feeStatus: z.enum(["Paid", "Partial", "Pending"], { message: "Select the fee status" }),
  checkIn: notFuture("Check-in date"),
};

export const allocateSchema = z.object({ studentId: objectId("a student"), ...details });
export const updateAllocationSchema = z.object(details);
