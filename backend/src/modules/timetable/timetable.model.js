import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

// One class in the weekly timetable of a school: day 0 = Monday ... 4 = Friday, period 0 = first period
const slotSchema = new mongoose.Schema({
  school: { type: String, required: true },
  day: { type: Number, min: 0, max: 4, required: true },
  period: { type: Number, min: 0, max: 5, required: true },
  subjectCode: { type: String, required: true },
  room: { type: String, trim: true },
});
slotSchema.index({ school: 1, day: 1, period: 1 }, { unique: true });
slotSchema.plugin(idPlugin);

export const TimetableSlot = mongoose.models.TimetableSlot || mongoose.model("TimetableSlot", slotSchema);
