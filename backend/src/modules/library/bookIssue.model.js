import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const { ObjectId } = mongoose.Schema.Types;

const bookIssueSchema = new mongoose.Schema(
  {
    bookId: { type: ObjectId, ref: "Book", required: true, index: true },
    studentId: { type: ObjectId, ref: "Student", required: true, index: true },
    issuedAt: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    returnedAt: { type: Date },
    renewals: { type: Number, default: 0 },
    fine: { type: Number, default: 0 }, // worked out when the book comes back
    status: { type: String, enum: ["issued", "returned"], default: "issued", index: true },
    issuedBy: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);
bookIssueSchema.plugin(idPlugin);

export const BookIssue = mongoose.models.BookIssue || mongoose.model("BookIssue", bookIssueSchema);
