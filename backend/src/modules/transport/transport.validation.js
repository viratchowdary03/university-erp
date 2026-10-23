import { z } from "zod";
import { requiredText, phoneRule, objectId } from "../../utils/validators.js";

export const vehicleSchema = z.object({
  number: requiredText("Vehicle number", 20),
  type: z.enum(["Bus", "Mini Bus", "Van"], { message: "Choose a vehicle type" }),
  capacity: z.coerce.number().int().min(1).max(100),
  driverName: requiredText("Driver name"),
  driverPhone: phoneRule,
});

export const routeSchema = z.object({
  name: requiredText("Route name", 80),
  vehicleId: objectId("Vehicle"),
  fee: z.coerce.number({ invalid_type_error: "Enter the fee" }).min(0).max(1000000),
  stops: z.array(z.object({
    name: requiredText("Stop name", 80),
    time: z.string().trim().regex(/^\d{2}:\d{2}$/, "Use HH:MM").optional().or(z.literal("")),
  })).min(1, "Add at least one stop").max(30),
});

export const allocationSchema = z.object({
  studentId: objectId("Student"),
  routeId: objectId("Route"),
  stop: requiredText("Stop", 80),
});
