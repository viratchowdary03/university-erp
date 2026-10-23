import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const { ObjectId } = mongoose.Schema.Types;

// One attempt per student. The unique index stops a second try even from two browsers.
const attemptSchema = new mongoose.Schema(
  {
    quizId: { type: ObjectId, ref: "Quiz", required: true },
    studentId: { type: ObjectId, ref: "Student", required: true },
    answers: [{ type: Number }],
    score: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { timestamps: true }
);
attemptSchema.index({ quizId: 1, studentId: 1 }, { unique: true });
attemptSchema.plugin(idPlugin);

export const QuizAttempt = mongoose.models.QuizAttempt || mongoose.model("QuizAttempt", attemptSchema);
