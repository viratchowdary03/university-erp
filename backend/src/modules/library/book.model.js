import mongoose from "mongoose";
import { idPlugin } from "../../utils/idPlugin.js";

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    isbn: { type: String, trim: true, sparse: true, unique: true },
    category: { type: String, trim: true, default: "General" },
    publisher: { type: String, trim: true },
    year: { type: Number, min: 1000, max: 3000 },
    shelf: { type: String, trim: true },
    copies: { type: Number, required: true, min: 1, default: 1 },
    available: { type: Number, required: true, min: 0, default: 1 },
  },
  { timestamps: true }
);
bookSchema.index({ title: "text", author: "text" });
bookSchema.plugin(idPlugin);

export const Book = mongoose.models.Book || mongoose.model("Book", bookSchema);
