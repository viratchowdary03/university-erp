import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const { ObjectId } = mongoose.Schema.Types;

// A student's seat on a route. A student has at most one.
const allocationSchema = new mongoose.Schema(
  {
    studentId: { type: ObjectId, ref: "Student", required: true, unique: true },
    routeId: { type: ObjectId, ref: "TransportRoute", required: true, index: true },
    stop: { type: String, required: true, trim: true },
    since: { type: String, required: true }, // YYYY-MM-DD
  },
  { timestamps: true }
);
allocationSchema.plugin(idPlugin);

export const TransportAllocation = mongoose.models.TransportAllocation || mongoose.model("TransportAllocation", allocationSchema);
