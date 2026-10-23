import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import { PERM } from "../../utils/permissions.js";
import { assertManager } from "../../utils/access.js";
import { escapeRegex } from "../../utils/pagination.js";
import { Student } from "../students/student.model.js";
import { getSettings } from "../settings/settings.service.js";
import { notify } from "../notifications/notifications.service.js";
import { Book } from "./book.model.js";
import { BookIssue } from "./bookIssue.model.js";

const DAY = 86400000;
const daysLate = (due, now = new Date()) => Math.max(0, Math.floor((now - new Date(due)) / DAY));

// ---------- books ----------
export async function listBooks(query) {
  const filter = {};
  if (query.category) filter.category = String(query.category);
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ title: rx }, { author: rx }, { isbn: rx }];
  }
  const [books, categories] = await Promise.all([Book.find(filter).sort({ title: 1 }).limit(500), Book.distinct("category")]);
  return { books: books.map((b) => b.toJSON()), categories: categories.sort() };
}

export async function createBook(user, values) {
  assertManager(user, PERM.LIBRARY);
  return Book.create({ ...values, isbn: values.isbn || undefined, available: values.copies });
}

export async function updateBook(user, id, values) {
  assertManager(user, PERM.LIBRARY);
  const book = await Book.findById(id);
  if (!book) throw new ApiError(404, "Book not found");
  const out = book.copies - book.available; // copies currently with students
  if (values.copies < out) throw new ApiError(409, `${out} copies are issued, so there must be at least ${out} copies`);
  Object.assign(book, { ...values, isbn: values.isbn || undefined, available: values.copies - out });
  await book.save();
  return book;
}

export async function deleteBook(user, id) {
  assertManager(user, PERM.LIBRARY);
  const book = await Book.findById(id);
  if (!book) throw new ApiError(404, "Book not found");
  if (await BookIssue.exists({ bookId: book._id, status: "issued" })) throw new ApiError(409, "Some copies are still issued");
  await book.deleteOne();
}

// ---------- issue / return ----------
async function findMember(member) {
  const text = member.trim();
  const student = await Student.findOne({ $or: [{ enrollmentNo: text.toUpperCase() }, { email: text.toLowerCase() }] });
  if (!student) throw new ApiError(404, "No student has that enrollment number or email");
  return student;
}

const present = async (issues) => {
  const [books, students] = await Promise.all([
    Book.find({ _id: { $in: issues.map((i) => i.bookId) } }).select("title author"),
    Student.find({ _id: { $in: issues.map((i) => i.studentId) } }).select("name enrollmentNo"),
  ]);
  const bookBy = new Map(books.map((b) => [String(b._id), b]));
  const studentBy = new Map(students.map((s) => [String(s._id), s]));
  const { finePerDay } = await getSettings();
  return issues.map((i) => {
    const late = i.status === "issued" ? daysLate(i.dueDate) : 0;
    return {
      ...i.toJSON(),
      title: bookBy.get(String(i.bookId))?.title,
      author: bookBy.get(String(i.bookId))?.author,
      studentName: studentBy.get(String(i.studentId))?.name,
      enrollmentNo: studentBy.get(String(i.studentId))?.enrollmentNo,
      overdueDays: late,
      fineNow: i.status === "issued" ? late * finePerDay : i.fine,
    };
  });
};

export async function listIssues(user, query) {
  assertManager(user, PERM.LIBRARY);
  const filter = query.status ? { status: String(query.status) } : {};
  return present(await BookIssue.find(filter).sort({ issuedAt: -1 }).limit(300));
}

export async function myIssues(user) {
  if (user.role !== ROLES.STUDENT) throw new ApiError(403, "Only students have a personal library page");
  const student = await Student.findOne({ userId: user._id });
  if (!student) return [];
  return present(await BookIssue.find({ studentId: student._id }).sort({ issuedAt: -1 }).limit(100));
}

export async function issueBook(user, { bookId, member }) {
  assertManager(user, PERM.LIBRARY);
  const student = await findMember(member);
  const { loanDays, maxBooksPerStudent, finePerDay } = await getSettings();
  const open = await BookIssue.find({ studentId: student._id, status: "issued" });
  if (open.length >= maxBooksPerStudent) throw new ApiError(409, `${student.name} already has ${open.length} books (the limit is ${maxBooksPerStudent})`);
  if (open.some((i) => String(i.bookId) === String(bookId))) throw new ApiError(409, "This student already has a copy of this book");
  const overdue = open.filter((i) => daysLate(i.dueDate) > 0);
  if (overdue.length) throw new ApiError(409, `${student.name} has ${overdue.length} overdue book(s). Return them first (fine ₹${finePerDay} per day)`);

  // taking a copy is one atomic step, so two librarians can never issue the last copy twice
  const book = await Book.findOneAndUpdate({ _id: bookId, available: { $gt: 0 } }, { $inc: { available: -1 } }, { new: true });
  if (!book) {
    if (!(await Book.exists({ _id: bookId }))) throw new ApiError(404, "Book not found");
    throw new ApiError(409, "No copy of this book is available");
  }
  try {
    const issue = await BookIssue.create({ bookId, studentId: student._id, dueDate: new Date(Date.now() + loanDays * DAY), issuedBy: user._id });
    if (student.userId) notify(student.userId, { title: "Book issued", message: `${book.title} is due on ${issue.dueDate.toLocaleDateString("en-IN")}.`, link: "/library" });
    return issue;
  } catch (err) {
    await Book.updateOne({ _id: bookId }, { $inc: { available: 1 } }); // put the copy back
    throw err;
  }
}

export async function returnBook(user, id) {
  assertManager(user, PERM.LIBRARY);
  const { finePerDay } = await getSettings();
  const issue = await BookIssue.findOneAndUpdate({ _id: id, status: "issued" }, { status: "returned", returnedAt: new Date() }, { new: true });
  if (!issue) throw new ApiError(404, "This book is not currently issued");
  issue.fine = daysLate(issue.dueDate, issue.returnedAt) * finePerDay;
  await issue.save();
  await Book.updateOne({ _id: issue.bookId }, { $inc: { available: 1 } });
  return issue;
}

export async function renewBook(user, id) {
  assertManager(user, PERM.LIBRARY);
  const { loanDays } = await getSettings();
  const issue = await BookIssue.findOne({ _id: id, status: "issued" });
  if (!issue) throw new ApiError(404, "This book is not currently issued");
  if (issue.renewals >= 1) throw new ApiError(409, "A book can be renewed only once");
  if (daysLate(issue.dueDate) > 0) throw new ApiError(409, "Overdue books cannot be renewed. Return it and pay the fine");
  issue.dueDate = new Date(new Date(issue.dueDate).getTime() + loanDays * DAY);
  issue.renewals += 1;
  await issue.save();
  return issue;
}

export async function getSummary() {
  const [books, copies, issued, overdue] = await Promise.all([
    Book.countDocuments(),
    Book.aggregate([{ $group: { _id: null, n: { $sum: "$copies" } } }]),
    BookIssue.countDocuments({ status: "issued" }),
    BookIssue.countDocuments({ status: "issued", dueDate: { $lt: new Date() } }),
  ]);
  return { titles: books, copies: copies[0]?.n || 0, issued, overdue };
}
