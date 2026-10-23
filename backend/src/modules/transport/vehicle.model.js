import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const vehicleSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["Bus", "Mini Bus", "Van"], default: "Bus" },
    capacity: { type: Number, required: true, min: 1, max: 100 },
    driverName: { type: String, trim: true },
    driverPhone: { type: String, trim: true },
  },
  { timestamps: true }
);
vehicleSchema.plugin(idPlugin);

export const Vehicle = mongoose.models.Vehicle || mongoose.model("Vehicle", vehicleSchema);
