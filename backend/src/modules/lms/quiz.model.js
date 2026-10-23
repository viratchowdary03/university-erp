import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const quizSchema = new mongoose.Schema(
  {
    courseCode: { type: String, required: true, index: true },
    school: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    durationMin: { type: Number, min: 1, max: 300, default: 20 },
    questions: [{
      _id: false,
      text: { type: String, required: true, trim: true },
      options: [{ type: String, trim: true }],
      correct: { type: Number, required: true, min: 0 }, // index of the right option, never sent to students
    }],
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
quizSchema.plugin(idPlugin);

export const Quiz = mongoose.models.Quiz || mongoose.model("Quiz", quizSchema);
