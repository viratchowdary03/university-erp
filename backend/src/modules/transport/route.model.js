import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const routeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    stops: [{ _id: false, name: { type: String, required: true, trim: true }, time: { type: String, trim: true } }],
    fee: { type: Number, required: true, min: 0 }, // per semester
  },
  { timestamps: true }
);
routeSchema.plugin(idPlugin);

export const TransportRoute = mongoose.models.TransportRoute || mongoose.model("TransportRoute", routeSchema);
