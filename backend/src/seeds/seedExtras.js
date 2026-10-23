// Sample data for the modules that came after the core ones: fees, exams and results, library, transport,
// placements, alumni, events, assignments. Called by seedAcademic.js (and by seedDemoUsers.js for the
// parts that need login accounts). Development only.
import { SCHOOLS } from "../utils/schools.js";
import { Student } from "../modules/students/student.model.js";
import { Subject } from "../modules/academic/subject.model.js";
import { Course } from "../modules/lms/course.model.js";
import { Assignment } from "../modules/lms/assignment.model.js";
import { Material } from "../modules/lms/material.model.js";
import { Quiz } from "../modules/lms/quiz.model.js";
import { Submission } from "../modules/lms/submission.model.js";
import { QuizAttempt } from "../modules/lms/quizAttempt.model.js";
import { FeeStructure } from "../modules/fees/feeStructure.model.js";
import { FeePayment } from "../modules/fees/feePayment.model.js";
import { Payment } from "../modules/payments/payment.model.js";
import { Exam } from "../modules/exams/exam.model.js";
import { Mark } from "../modules/exams/mark.model.js";
import { Book } from "../modules/library/book.model.js";
import { BookIssue } from "../modules/library/bookIssue.model.js";
import { Vehicle } from "../modules/transport/vehicle.model.js";
import { TransportRoute } from "../modules/transport/route.model.js";
import { TransportAllocation } from "../modules/transport/transportAllocation.model.js";
import { Company } from "../modules/placements/company.model.js";
import { JobPost } from "../modules/placements/jobPost.model.js";
import { PlacementApplication } from "../modules/placements/placementApplication.model.js";
import { AlumniProfile } from "../modules/alumni/alumniProfile.model.js";
import { Event } from "../modules/events/event.model.js";
import { EventRegistration } from "../modules/events/eventRegistration.model.js";
import { Notice } from "../modules/notices/notice.model.js";
import { LeaveRequest } from "../modules/leave/leaveRequest.model.js";
import { Ticket } from "../modules/grievance/ticket.model.js";
import { Notification } from "../modules/notifications/notification.model.js";
import { Conversation } from "../modules/messaging/conversation.model.js";
import { Message } from "../modules/messaging/message.model.js";
import { Application } from "../modules/admissions/application.model.js";
import { refreshCgpa } from "../modules/results/results.service.js";
import { daysFromNow } from "./sampleData.js";

export const EXTRA_MODELS = [
  Assignment, Material, Quiz, Submission, QuizAttempt, FeeStructure, FeePayment, Payment, Exam, Mark, Book, BookIssue,
  Vehicle, TransportRoute, TransportAllocation, Company, JobPost, PlacementApplication, AlumniProfile, Event,
  EventRegistration, Notice, LeaveRequest, Ticket, Notification, Conversation, Message, Application,
];

const iso = (offset) => daysFromNow(offset).toISOString().slice(0, 10);
// a steady pseudo-random number from a text, so reseeding gives the same data every time
const hash = (text) => [...String(text)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export async function seedExtras() {
  const [students, subjects, courses] = await Promise.all([Student.find().sort({ enrollmentNo: 1 }), Subject.find(), Course.find()]);

  // ----- assignments, materials, a quiz per school's first course -----
  const sampleAssignments = courses.flatMap((c) => c.assignments.map((a) => ({ courseCode: c.code, school: c.school, title: a.title, description: "Complete and submit before the due date.", dueDate: a.dueDate, marks: a.marks })));
  const assignments = sampleAssignments.length ? await Assignment.insertMany(sampleAssignments) : [];
  await Course.updateMany({}, { $set: { assignments: [] } }); // they live in their own collection now
  await Material.insertMany(courses.flatMap((c) => [
    { courseCode: c.code, school: c.school, title: `${c.name}: unit 1 notes`, kind: "Notes", description: "Read the chapter summary and attempt the practice questions.", unit: 1 },
    { courseCode: c.code, school: c.school, title: `${c.name}: lecture playlist`, kind: "Video", url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(c.name), unit: 1 },
  ]));
  await Course.bulkWrite(courses.map((c) => ({ updateOne: { filter: { _id: c._id }, update: { $set: { materials: 2 } } } })));
  const quizzes = await Quiz.insertMany(SCHOOLS.map(({ code }) => {
    const course = courses.find((c) => c.school === code);
    return { courseCode: course.code, school: code, title: `${course.name}: warm-up quiz`, durationMin: 10, questions: [
      { text: "Which of these is a core idea of this subject?", options: ["Abstraction", "Guesswork", "Coincidence", "None of these"], correct: 0 },
      { text: "A good first step when solving a problem is to...", options: ["Skip the question", "Understand it clearly", "Copy an answer", "Wait"], correct: 1 },
      { text: "Practice is most useful when it is...", options: ["Regular", "Last minute", "Rare", "Avoided"], correct: 0 },
    ] };
  }));
  // some students already did the quiz and the first assignment
  const attempts = [];
  const submissions = [];
  students.forEach((s, i) => {
    const quiz = quizzes.find((q) => q.school === s.school);
    if (quiz && i % 3 !== 0) attempts.push({ quizId: quiz._id, studentId: s._id, answers: [0, 1, hash(s.name) % 4], score: 2 + (hash(s.name) % 2), total: 3 });
    const a = assignments.find((x) => x.school === s.school);
    if (a && i % 4 !== 3) submissions.push({ assignmentId: a._id, studentId: s._id, text: "My answer is attached in the notebook.", late: false, marks: i % 2 ? Math.round(a.marks * 0.8) : null });
  });
  if (attempts.length) await QuizAttempt.insertMany(attempts);
  if (submissions.length) await Submission.insertMany(submissions);

  // ----- fees: one tuition fee and one exam fee per school; students are at different stages of payment -----
  const structures = await FeeStructure.insertMany(SCHOOLS.flatMap(({ code }) => [
    { title: "Semester 3 tuition fee", school: code, program: "", components: [{ name: "Tuition", amount: 60000 }, { name: "Laboratory", amount: 8000 }, { name: "Library", amount: 2000 }], total: 70000, dueDate: iso(20) },
    { title: "Examination fee", school: code, program: "", components: [{ name: "Examination", amount: 3000 }], total: 3000, dueDate: iso(-5) },
  ]));
  let receipt = 0;
  const payments = [];
  const pay = (s, structure, amount, mode, daysAgo) => payments.push({ receiptNo: `RCT${new Date().getFullYear()}-${String(++receipt).padStart(5, "0")}`, studentId: s._id, structureId: structure._id, amount, mode, reference: mode === "Cash" ? undefined : `TXN${hash(s.name + amount) % 900000 + 100000}`, paidAt: daysFromNow(-daysAgo) });
  students.forEach((s, i) => {
    const tuition = structures.find((f) => f.school === s.school && f.title.startsWith("Semester"));
    const exam = structures.find((f) => f.school === s.school && f.title.startsWith("Exam"));
    const modes = ["Cash", "UPI", "Card", "Bank Transfer"];
    if (i % 4 === 0) { pay(s, tuition, 70000, modes[i % 4], 30 + (i % 20)); pay(s, exam, 3000, "UPI", 12); }
    else if (i % 4 === 1) pay(s, tuition, 30000, "UPI", 15 + (i % 10));
    else if (i % 4 === 3) { pay(s, tuition, 70000, "Card", 25); }
  });
  if (payments.length) await FeePayment.insertMany(payments);

  // ----- exams and marks -----
  const examDocs = [];
  SCHOOLS.forEach(({ code }) => {
    subjects.filter((s) => s.school === code).forEach((sub, i) => {
      examDocs.push({ name: "Internal Test 1", type: "Internal", subjectCode: sub.code, school: code, date: iso(-21 + i), startTime: "10:00", venue: "Exam Hall A", maxMarks: 30, published: true });
      if (i < 3) examDocs.push({ name: "Midterm", type: "Midterm", subjectCode: sub.code, school: code, date: iso(-6 + i), startTime: "14:00", venue: "Exam Hall B", maxMarks: 50, published: true });
      examDocs.push({ name: "End Semester", type: "Final", subjectCode: sub.code, school: code, date: iso(30 + i * 2), startTime: "10:00", venue: "Main Auditorium", maxMarks: 100, published: false });
    });
  });
  const exams = await Exam.insertMany(examDocs);
  const marks = [];
  exams.filter((e) => e.published).forEach((e) => {
    students.filter((s) => s.school === e.school).forEach((s) => {
      const h = hash(`${s.enrollmentNo}${e.subjectCode}${e.name}`);
      marks.push(h % 33 === 0 ? { examId: e._id, studentId: s._id, marks: null, absent: true } : { examId: e._id, studentId: s._id, marks: Math.min(e.maxMarks, Math.round(e.maxMarks * (0.38 + (h % 58) / 100))), absent: false });
    });
  });
  if (marks.length) await Mark.insertMany(marks);
  for (const { code } of SCHOOLS) await refreshCgpa(code);

  // ----- library -----
  const catalog = [
    ["Introduction to Algorithms", "Cormen, Leiserson, Rivest, Stein", "Computer Science"], ["Clean Code", "Robert C. Martin", "Computer Science"],
    ["Database System Concepts", "Silberschatz, Korth", "Computer Science"], ["Operating System Concepts", "Silberschatz, Galvin", "Computer Science"],
    ["Engineering Mathematics", "B. S. Grewal", "Mathematics"], ["Higher Engineering Mathematics", "B. V. Ramana", "Mathematics"],
    ["Principles of Management", "Harold Koontz", "Management"], ["Marketing Management", "Philip Kotler", "Management"],
    ["Financial Accounting", "T. S. Grewal", "Commerce"], ["The Wealth of Nations", "Adam Smith", "Economics"],
    ["Fundamentals of Physics", "Halliday, Resnick", "Science"], ["Organic Chemistry", "Morrison, Boyd", "Science"],
    ["The Constitution of India", "D. D. Basu", "Law"], ["Wings of Fire", "A. P. J. Abdul Kalam", "Biography"],
    ["The Discovery of India", "Jawaharlal Nehru", "History"], ["Pride and Prejudice", "Jane Austen", "Literature"],
    ["Engineering Drawing", "N. D. Bhatt", "Engineering"], ["Digital Design", "M. Morris Mano", "Engineering"],
    ["Pharmacology", "K. D. Tripathi", "Pharmacy"], ["Anatomy and Physiology", "Tortora", "Medical"],
  ].map(([title, author, category], i) => ({ title, author, category, isbn: `978-81-${String(1000 + i * 7)}-${String(200 + i * 13)}-${i % 10}`, shelf: `${category.slice(0, 2).toUpperCase()}-${(i % 9) + 1}`, copies: 2 + (i % 4), available: 2 + (i % 4), year: 2005 + i }));
  const books = await Book.insertMany(catalog);
  const loans = [];
  students.slice(0, 14).forEach((s, i) => {
    const book = books[i % books.length];
    const overdue = i % 5 === 0;
    const issuedAt = daysFromNow(overdue ? -22 : -(2 + i));
    loans.push({ bookId: book._id, studentId: s._id, issuedAt, dueDate: new Date(issuedAt.getTime() + 14 * 86400000), status: "issued" });
  });
  await BookIssue.insertMany(loans);
  for (const loan of loans) await Book.updateOne({ _id: loan.bookId }, { $inc: { available: -1 } });

  // ----- transport -----
  const vehicles = await Vehicle.insertMany([
    { number: "GJ-06-AB-1234", type: "Bus", capacity: 40, driverName: "Ramesh Parmar", driverPhone: "9825012345" },
    { number: "GJ-06-CD-5678", type: "Bus", capacity: 36, driverName: "Mahesh Solanki", driverPhone: "9825023456" },
    { number: "GJ-06-EF-9012", type: "Mini Bus", capacity: 20, driverName: "Dinesh Patel", driverPhone: "9825034567" },
  ]);
  const routes = await TransportRoute.insertMany([
    { name: "Alkapuri - Campus", vehicleId: vehicles[0]._id, fee: 6000, stops: [{ name: "Alkapuri Circle", time: "07:30" }, { name: "Race Course", time: "07:40" }, { name: "Fatehgunj", time: "07:50" }, { name: "Campus Gate", time: "08:15" }] },
    { name: "Manjalpur - Campus", vehicleId: vehicles[1]._id, fee: 5500, stops: [{ name: "Manjalpur Naka", time: "07:20" }, { name: "Tandalja", time: "07:35" }, { name: "Campus Gate", time: "08:10" }] },
    { name: "Karelibaug - Campus", vehicleId: vehicles[2]._id, fee: 5000, stops: [{ name: "Karelibaug", time: "07:45" }, { name: "Harni", time: "07:55" }, { name: "Campus Gate", time: "08:15" }] },
  ]);
  await TransportAllocation.insertMany(students.filter((_, i) => i % 5 === 2).slice(0, 25).map((s, i) => {
    const route = routes[i % routes.length];
    return { studentId: s._id, routeId: route._id, stop: route.stops[i % (route.stops.length - 1)].name, since: iso(-60) };
  }));

  // ----- placements -----
  const companies = await Company.insertMany([
    { name: "TechNova Solutions", industry: "Software", website: "https://example.com/technova", contactName: "Meera Shah", contactEmail: "hr@technova.example", description: "Product engineering and cloud services." },
    { name: "Bharat Finserv", industry: "Finance", contactName: "Arjun Rao", contactEmail: "campus@bharatfin.example", description: "Banking technology and analytics." },
    { name: "GreenGrid Energy", industry: "Energy", contactName: "Kavita Nair", contactEmail: "careers@greengrid.example", description: "Renewable energy systems." },
    { name: "MediCare Labs", industry: "Healthcare", contactName: "Dr. S. Iyer", contactEmail: "talent@medicare.example", description: "Diagnostics and pharma research." },
  ]);
  const jobs = await JobPost.insertMany([
    { companyId: companies[0]._id, title: "Software Engineer", type: "Full-time", location: "Bengaluru", packageLpa: 8.5, openings: 10, minCgpa: 6.5, schools: [SCHOOLS[0].code], deadline: iso(18), description: "Build and ship web services." },
    { companyId: companies[0]._id, title: "Software Intern", type: "Internship", location: "Remote", packageLpa: 3, openings: 5, minCgpa: 6, schools: [], deadline: iso(10), description: "Six-month internship." },
    { companyId: companies[1]._id, title: "Business Analyst", type: "Full-time", location: "Mumbai", packageLpa: 7, openings: 6, minCgpa: 7, schools: [], deadline: iso(25), description: "Analyse customer and risk data." },
    { companyId: companies[2]._id, title: "Graduate Engineer Trainee", type: "Full-time", location: "Ahmedabad", packageLpa: 5.5, openings: 8, minCgpa: 6, schools: [], deadline: iso(14), description: "Two-year training programme." },
    { companyId: companies[3]._id, title: "Research Associate", type: "Full-time", location: "Hyderabad", packageLpa: 6, openings: 4, minCgpa: 6.5, schools: [], deadline: iso(-3), description: "Closed drive from last month.", status: "closed" },
  ]);
  const apps = [];
  students.filter((s) => (s.cgpa ?? 0) >= 6).slice(0, 12).forEach((s, i) => apps.push({ jobId: jobs[i % 3]._id, studentId: s._id, status: ["applied", "shortlisted", "interview", "selected", "applied", "rejected"][i % 6] }));
  await PlacementApplication.insertMany(apps.filter((a, i, all) => all.findIndex((b) => String(b.jobId) === String(a.jobId) && String(b.studentId) === String(a.studentId)) === i));

  // ----- alumni and events -----
  await AlumniProfile.insertMany([
    ["Ritika Shah", "ENG", "B.Tech Computer Science", 2019, "Google", "Software Engineer", "Bengaluru", true], ["Nikhil Desai", "ENG", "B.Tech Mechanical", 2018, "Tata Motors", "Design Engineer", "Pune", true],
    ["Priyanka Joshi", SCHOOLS[1].code, "", 2020, "Deloitte", "Consultant", "Mumbai", false], ["Aman Verma", SCHOOLS[2].code, "", 2017, "HDFC Bank", "Relationship Manager", "Vadodara", true],
    ["Sneha Kulkarni", SCHOOLS[3].code, "", 2021, "Infosys", "Systems Engineer", "Pune", false], ["Rahul Mehta", "ENG", "B.Tech Civil", 2016, "L&T", "Project Manager", "Mumbai", true],
    ["Divya Nair", SCHOOLS[1].code, "", 2022, "Amazon", "Business Analyst", "Hyderabad", false], ["Karan Singh", SCHOOLS[4].code, "", 2015, "Own startup", "Founder", "Delhi", true],
  ].map(([name, school, program, graduationYear, company, designation, city, mentor]) => ({ name, school, program: program || undefined, graduationYear, company, designation, city, mentor, bio: `${name} studied here and now works at ${company}.` })));
  await Event.insertMany([
    { title: "Annual Tech Fest", description: "Hackathon, robotics demos and project showcase.", type: "Cultural", venue: "Main Auditorium", date: iso(12), startTime: "09:30", endTime: "17:00", school: "", capacity: 300 },
    { title: "Resume Workshop", description: "Write a resume that gets shortlisted.", type: "Workshop", venue: "Seminar Hall 2", date: iso(5), startTime: "11:00", endTime: "13:00", school: "", capacity: 60 },
    { title: "Inter-School Cricket", description: "Knock-out tournament.", type: "Sports", venue: "University Ground", date: iso(20), startTime: "08:00", school: "", capacity: 0 },
    { title: "Guest Lecture: Cloud Careers", description: "Talk by an alumnus.", type: "Seminar", venue: "Seminar Hall 1", date: iso(-8), startTime: "15:00", endTime: "16:30", school: SCHOOLS[0].code, capacity: 100 },
    { title: "Diwali Holiday", type: "Holiday", venue: "Campus closed", date: iso(26), school: "" },
  ]);

  // ----- admissions -----
  await Application.insertMany([
    ["Aarav Trivedi", "aarav.t@example.com", "M", "B.Tech Computer Science", "submitted", 91], ["Isha Bhatt", "isha.b@example.com", "F", "B.Tech Computer Science", "under_review", 86],
    ["Dev Panchal", "dev.p@example.com", "M", "B.Tech Computer Science", "approved", 94], ["Mira Thakkar", "mira.t@example.com", "F", "B.Tech Computer Science", "rejected", 48],
  ].map(([name, email, gender, program, status, percentage], i) => ({
    applicationNo: `APP${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`, name, email, phone: `98250${String(10000 + i * 137).slice(0, 5)}`, gender, dateOfBirth: "2007-06-15",
    school: SCHOOLS[0].code, program, previousSchool: "Sunrise Higher Secondary School", percentage, guardianName: "Guardian", guardianPhone: "9825099999", city: "Vadodara", status,
  })));
}

// Needs login accounts, so it runs after seedDemoUsers has created them
export async function seedUserLinked(users) {
  const { admin, studentUser, facultyUser } = users;
  if (!admin || !studentUser) return;
  if (await Notice.countDocuments()) return;
  await Notice.insertMany([
    { title: "Semester 3 fee due date", body: "Please pay the semester 3 fee before the due date to avoid a late fine. The accounts office is open 10:00 to 16:00.", priority: "important", pinned: true, audience: ["student"], authorId: admin._id, authorName: admin.name, authorRole: admin.role },
    { title: "Library timings extended", body: "The central library stays open until 8 PM on weekdays during the exam period.", priority: "normal", authorId: admin._id, authorName: admin.name, authorRole: admin.role },
    { title: "Faculty meeting on Friday", body: "All faculty and heads of school: meeting in the board room at 3 PM.", priority: "normal", audience: ["faculty", "hod"], expiresAt: iso(7), authorId: admin._id, authorName: admin.name, authorRole: admin.role },
    { title: "Campus network maintenance", body: "Wi-Fi will be down on Sunday from 2 AM to 6 AM.", priority: "urgent", authorId: admin._id, authorName: admin.name, authorRole: admin.role },
  ]);
  await LeaveRequest.insertMany([
    { applicantId: studentUser._id, applicantName: studentUser.name, applicantRole: "student", school: studentUser.school, type: "Sick", fromDate: iso(-10), toDate: iso(-9), days: 2, reason: "Viral fever", status: "approved", decidedByName: "Class teacher", decidedAt: daysFromNow(-11) },
    { applicantId: studentUser._id, applicantName: studentUser.name, applicantRole: "student", school: studentUser.school, type: "Casual", fromDate: iso(6), toDate: iso(7), days: 2, reason: "Family function", status: "pending" },
  ]);
  await Ticket.create({ ticketNo: `TKT${new Date().getFullYear()}-0001`, userId: studentUser._id, name: studentUser.name, role: "student", school: studentUser.school, category: "Hostel", subject: "Wi-Fi is slow in the evening", description: "The hostel Wi-Fi drops after 8 PM, which makes online classes difficult.", priority: "medium", status: "in_progress",
    comments: [{ userId: admin._id, name: admin.name, role: admin.role, text: "We have raised this with the network team." }] });
  await Notification.insertMany([
    { userId: studentUser._id, title: "Welcome to the ERP", message: "Your fees, results and courses are all here.", link: "/dashboard" },
    { userId: studentUser._id, title: "Results published", message: "Internal Test 1 marks are out.", link: "/results", type: "success" },
  ]);
  if (facultyUser) {
    const pair = [String(studentUser._id), String(facultyUser._id)].sort().join(":");
    const conversation = await Conversation.create({ pair, participants: [studentUser._id, facultyUser._id], lastMessage: "Yes, please bring it tomorrow.", lastSenderId: facultyUser._id });
    await Message.insertMany([
      { conversationId: conversation._id, senderId: studentUser._id, body: "Good morning sir, may I submit the assignment tomorrow?", readBy: [studentUser._id, facultyUser._id] },
      { conversationId: conversation._id, senderId: facultyUser._id, body: "Yes, please bring it tomorrow.", readBy: [facultyUser._id] },
    ]);
  }
}

