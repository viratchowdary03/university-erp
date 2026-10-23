import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const hostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ["Boys", "Girls"], required: true },
    warden: { type: String, trim: true },
    wardenPhone: { type: String, trim: true },
    floors: { type: Number, min: 1, default: 4 },
    roomsPerFloor: { type: Number, min: 1, default: 10 },
    sharing: { type: Number, min: 1, max: 3, default: 3 }, // beds per room (A, B, C)
  },
  { timestamps: true }
);
hostelSchema.virtual("capacity").get(function () {
  return this.floors * this.roomsPerFloor * this.sharing;
});
hostelSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export const Hostel = mongoose.models.Hostel || mongoose.model("Hostel", hostelSchema);
