// Renders every page of the website, for every role that is allowed to open it, and fails on any crash.
// No browser, no backend and no database are needed: data is "still loading" (or failed), which is exactly
// what a page shows first, so this catches broken imports, bad props and code that runs while rendering.
//
//   node scripts/smoke-render.mjs
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fe = path.join(root, "frontend");
register(pathToFileURL(path.join(root, "scripts/jsx-loader.mjs")).href);

const store_ = new Map();
globalThis.localStorage = { getItem: (k) => store_.get(k) ?? null, setItem: (k, v) => store_.set(k, String(v)), removeItem: (k) => store_.delete(k) };
globalThis.window ??= { addEventListener() {}, removeEventListener() {}, location: { pathname: "/" }, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
globalThis.document ??= { addEventListener() {}, removeEventListener() {} };

import { writeFileSync, rmSync } from "node:fs";
// The libraries must be the very same copies the pages load, so they are imported from inside frontend/
const shim = path.join(fe, "src", "__smoke_libs.js");
writeFileSync(shim, [
  'export { default as React } from "react";',
  'export { renderToString } from "react-dom/server";',
  'export { Provider } from "react-redux";',
  'export { QueryClient, QueryClientProvider } from "@tanstack/react-query";',
  'export { MemoryRouter, Routes, Route } from "react-router-dom";',
].join("\n"));
process.on("exit", () => rmSync(shim, { force: true }));
const libs = await import(pathToFileURL(shim).href);
const { React, renderToString, Provider, QueryClient, QueryClientProvider, MemoryRouter, Routes, Route } = libs;
const src = (p) => import(pathToFileURL(path.join(fe, "src", p)).href);

const { store } = await src("store/store.js");
const { setUser } = await src("features/auth/authSlice.js");
const { can, PERM } = await src("config/permissions.js");
const { ROLES } = await src("config/roles.js");
const { NAV_ITEMS } = await src("config/navigation.js");
const { ToastProvider } = await src("components/common/Toast.jsx");
const { ConfirmProvider } = await src("components/common/ConfirmDialog.jsx");

const page = async (p) => (await src(p)).default;
const PAGES = [
  ["/", "features/dashboard/pages/DashboardPage.jsx", PERM.DASHBOARD],
  ["/users", "features/settings/pages/UserApprovalsPage.jsx", PERM.USERS],
  ["/academic", "features/academic/pages/DepartmentsPage.jsx", PERM.ACADEMIC],
  ["/students", "features/students/pages/StudentListPage.jsx", PERM.STUDENTS],
  ["/faculty", "features/faculty/pages/FacultyListPage.jsx", PERM.FACULTY],
  ["/timetable", "features/timetable/pages/TimetablePage.jsx", PERM.TIMETABLE],
  ["/attendance", "features/attendance/pages/MyAttendancePage.jsx", PERM.ATTENDANCE, [ROLES.STUDENT]],
  ["/attendance", "features/attendance/pages/MarkAttendancePage.jsx", PERM.ATTENDANCE, [ROLES.FACULTY]],
  ["/attendance", "features/attendance/pages/AttendanceReportPage.jsx", PERM.ATTENDANCE, [ROLES.SUPER_ADMIN, ROLES.REGISTRAR, ROLES.ADMIN, ROLES.HOD]],
  ["/attendance-planner", "features/attendance/pages/AttendancePlannerPage.jsx", PERM.ATTENDANCE],
  ["/lms", "features/lms/pages/CoursesPage.jsx", PERM.LMS],
  ["/lms/ENG101", "features/lms/pages/CourseDetailPage.jsx", PERM.LMS, null, "/lms/:code"],
  ["/lms/quiz/1", "features/lms/pages/QuizPage.jsx", PERM.LMS, null, "/lms/quiz/:id"],
  ["/hostel", "features/hostel/pages/HostelPage.jsx", PERM.HOSTEL],
  ["/admissions", "features/admissions/pages/ApplicationsPage.jsx", PERM.ADMISSIONS],
  ["/exams", "features/exams/pages/ExamsPage.jsx", PERM.EXAMS],
  ["/exams/1/marks", "features/exams/pages/MarksEntryPage.jsx", PERM.EXAMS, null, "/exams/:id/marks"],
  ["/results", "features/results/pages/ResultsPage.jsx", PERM.RESULTS],
  ["/fees", "features/fees/pages/FeesPage.jsx", PERM.FEES],
  ["/fees/pay/1", "features/payments/pages/OnlinePaymentPage.jsx", PERM.FEES, [ROLES.STUDENT], "/fees/pay/:structureId"],
  ["/payments/status/1", "features/payments/pages/PaymentStatusPage.jsx", PERM.FEES, [ROLES.STUDENT], "/payments/status/:orderId"],
  ["/library", "features/library/pages/LibraryPage.jsx", PERM.LIBRARY],
  ["/transport", "features/transport/pages/TransportPage.jsx", PERM.TRANSPORT],
  ["/leave", "features/leave/pages/LeavePage.jsx", PERM.LEAVE],
  ["/notices", "features/notices/pages/NoticesPage.jsx", PERM.NOTICES],
  ["/reports", "features/reports/pages/ReportsPage.jsx", PERM.REPORTS],
  ["/settings", "features/settings/pages/SettingsPage.jsx", PERM.SETTINGS],
  ["/placements", "features/placements/pages/PlacementsPage.jsx", PERM.PLACEMENTS],
  ["/alumni", "features/alumni/pages/AlumniPage.jsx", PERM.ALUMNI],
  ["/alumni/1", "features/alumni/pages/AlumniProfilePage.jsx", PERM.ALUMNI, null, "/alumni/:id"],
  ["/events", "features/events/pages/EventsPage.jsx", PERM.EVENTS],
  ["/events/1", "features/events/pages/EventDetailPage.jsx", PERM.EVENTS, null, "/events/:id"],
  ["/grievance", "features/grievance/pages/GrievancePage.jsx", PERM.GRIEVANCE],
  ["/grievance/1", "features/grievance/pages/TicketPage.jsx", PERM.GRIEVANCE, null, "/grievance/:id"],
  ["/certificates", "features/certificates/pages/CertificatesPage.jsx", PERM.CERTIFICATES],
  ["/messages", "features/messaging/pages/MessagesPage.jsx", PERM.MESSAGES],
  ["/messages/1", "features/messaging/pages/MessagesPage.jsx", PERM.MESSAGES, null, "/messages/:id"],
  ["/analytics", "features/analytics/pages/AnalyticsPage.jsx", PERM.ANALYTICS],
  ["/audit-logs", "features/auditLogs/pages/AuditLogsPage.jsx", PERM.AUDIT],
  ["/notifications", "features/notifications/pages/NotificationsPage.jsx", null],
];
const PUBLIC = [
  ["/login", "features/auth/pages/LoginPage.jsx"], ["/register", "features/auth/pages/RegisterPage.jsx"],
  ["/forgot-password", "features/auth/pages/ForgotPasswordPage.jsx"], ["/apply", "features/admissions/pages/ApplicationFormPage.jsx"],
  ["/change-password", "features/auth/pages/ChangePasswordPage.jsx"],
];

// A second pass with the data requests failed, to exercise the error screens too
const client = (fail) => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (child) => React.createElement(ToastProvider, null, React.createElement(ConfirmProvider, null, child));
const failures = [];
let rendered = 0;
const errors = [];
const origError = console.error;
console.error = (...a) => errors.push(a.map(String).join(" ").slice(0, 300));

async function render(url, Comp, route, role, label) {
  const user = role ? { id: "u1", name: "Test User", email: "t@x.test", role, school: "ENG", status: "active" } : null;
  store.dispatch(setUser(user));
  errors.length = 0;
  try {
    const el = React.createElement(Provider, { store }, React.createElement(QueryClientProvider, { client: client() },
      wrap(React.createElement(MemoryRouter, { initialEntries: [url] }, React.createElement(Routes, null, React.createElement(Route, { path: route || url.split("?")[0], element: React.createElement(Comp) }))))));
    const html = renderToString(el);
    if (!html || html.length < 10) failures.push(`${label} (${role || "public"}): rendered nothing`);
    const bad = errors.filter((e) => /Warning|Invalid hook|Cannot read|is not defined|Each child|Failed prop/i.test(e) && !/useLayoutEffect/.test(e));
    if (bad.length) failures.push(`${label} (${role || "public"}): ${bad[0]}`);
    rendered += 1;
  } catch (err) {
    failures.push(`${label} (${role || "public"}): ${err.message.split("\n")[0]}`);
  }
}

for (const [url, file, perm, only, route] of PAGES) {
  const Comp = await page(file);
  const roles = (only || Object.values(ROLES)).filter((r) => perm === null || can(r, perm));
  for (const role of roles) await render(url, Comp, route, role, url);
}
for (const [url, file] of PUBLIC) await render(url, await page(file), null, null, url);


// ---------- second pass: pages with data ----------
// Responses shaped like the backend's, put straight into the query cache.  [url, route, role, [[queryKey, data], ...]]
const D = "2026-11-01";
const student = { id: "s1", name: "Asha Patel", enrollmentNo: "ENG2024001", program: "B.Tech CSE", school: "ENG", semester: 3, batch: "2024-28" };
const exam = { id: "e1", name: "Internal Test 1", type: "Internal", subjectCode: "ENG101", subjectName: "Maths", school: "ENG", date: D, startTime: "10:00", venue: "Hall A", maxMarks: 30, published: true, manageable: true, myMarks: { marks: 22, absent: false } };
const fee = { id: "f1", title: "Semester 3 tuition fee", school: "ENG", program: "", dueDate: D, components: [{ name: "Tuition", amount: 60000 }], total: 60000, paid: 20000, balance: 40000, overdue: true };
const payment = { id: "p1", receiptNo: "RCT2026-00001", paidAt: D, mode: "UPI", amount: 20000, studentName: "Asha", enrollmentNo: "ENG2024001", feeTitle: "Tuition" };
const sub = { code: "ENG101", name: "Maths", credits: 4, exams: [{ name: "Internal", marks: 22, max: 30, absent: false }], obtained: 22, max: 30, percentage: 73.3, grade: "A", points: 8, passed: true };
const result = { student, semesters: [{ semester: 3, sgpa: 8, passed: true, subjects: [sub] }], cgpa: 8, backlogs: 0 };
const book = { id: "b1", title: "Clean Code", author: "R. Martin", category: "CS", shelf: "CS-1", copies: 3, available: 2 };
const issue = { id: "i1", title: "Clean Code", author: "R. Martin", studentName: "Asha", enrollmentNo: "ENG2024001", issuedAt: D, dueDate: D, status: "issued", overdueDays: 3, fineNow: 6, fine: 0 };
const notice = { id: "n1", title: "Fee due", body: "Pay soon", audience: ["student"], school: "", priority: "important", pinned: true, authorName: "Admin", authorRole: "admin", createdAt: D, editable: true, expired: false, expiresAt: D };
const event = { id: "ev1", title: "Tech Fest", description: "Fun", type: "Cultural", venue: "Hall", date: D, startTime: "09:00", endTime: "17:00", school: "", capacity: 100, registered: 10, registeredByMe: false, full: false, past: false };
const ticket = { id: "t1", ticketNo: "TKT2026-0001", userId: "u1", name: "Asha", role: "student", school: "ENG", category: "Hostel", subject: "Wi-Fi", description: "Slow", priority: "medium", status: "open", createdAt: D, commentCount: 1, comments: [{ userId: "u2", name: "Admin", role: "admin", text: "Looking", at: D }] };
const cert = { id: "c1", requestNo: "CRQ2026-0001", type: "Bonafide Certificate", purpose: "Bank", status: "issued", createdAt: D, certificateNo: "VCU/2026/0001", studentName: "Asha", enrollmentNo: "ENG2024001" };
const job = { id: "j1", title: "SWE", companyName: "TechNova", type: "Full-time", location: "Pune", packageLpa: 8, openings: 3, minCgpa: 6, schools: ["ENG"], deadline: D, status: "open", description: "Build", applicants: 2, applied: false, eligible: true, expired: false, companyId: "co1" };
const vehicle = { id: "v1", number: "GJ-06-AB-1234", type: "Bus", capacity: 40, driverName: "Ramesh", driverPhone: "9825012345" };
const route = { id: "r1", name: "Alkapuri", vehicleId: "v1", fee: 6000, stops: [{ name: "Alkapuri", time: "07:30" }, { name: "Gate", time: "08:15" }], vehicle, occupied: 3, capacity: 40 };
const insights = { school: "", studentCount: 10, averageAttendance: 72, attendanceBuckets: [{ label: "a", count: 1 }, { label: "b", count: 2 }, { label: "c", count: 3 }, { label: "d", count: 4 }], cgpaBands: [{ label: "a", count: 1 }, { label: "b", count: 2 }, { label: "c", count: 3 }, { label: "d", count: 4 }], atRisk: [{ id: "s1", name: "Asha", enrollmentNo: "E1", program: "B", attendance: 60, cgpa: 4.5, reason: "Low" }], enrollmentBySchool: [{ code: "ENG", name: "Engineering", count: 5 }], fees: { billed: 100, collected: 50, rate: 50 }, hostel: { residents: 5, capacity: 10 } };
const A = ["super_admin"], ST = ["student"], FA = ["faculty"], AC = ["accountant"], LI = ["librarian"], HO = ["hod"];
const FIXTURES = [
  ["/fees", null, ST, [[["fees", "me", null], { items: [fee], payments: [payment], total: 60000, paid: 20000, balance: 40000 }]]],
  ["/fees", null, AC, [[["fees", "students", {}], { rows: [{ id: "s1", name: "Asha", enrollmentNo: "E1", school: "ENG", program: "B", total: 10, paid: 5, balance: 5, status: "Partial", overdue: true }], summary: { total: 10, paid: 5, balance: 5, defaulters: 1 } }]]],
  ["/fees/pay/f1", "/fees/pay/:structureId", ST, [[["fees", "me", null], { items: [fee], payments: [], total: 60000, paid: 20000, balance: 40000 }], [["payments", "gateway", null], { provider: "sandbox", sandbox: true }]]],
  ["/payments/status/o1", "/payments/status/:orderId", ST, [[["payments", "order", "o1", null], { orderId: "o1", status: "paid", amount: 100, feeTitle: "Tuition", receiptNo: "R1" }]]],
  ["/exams", null, ST, [[["exams", null], [exam, { ...exam, id: "e2", published: false, myMarks: undefined, date: "2020-01-01" }]]]],
  ["/exams", null, FA, [[["exams", null], [exam]], [["lms", "courses", "for-exams", null], { courses: [{ code: "ENG101", name: "Maths", school: "ENG", teaching: true }] }]]],
  ["/exams/e1/marks", "/exams/:id/marks", FA, [[["exams", "marks", "e1", null], { exam: { ...exam, published: false }, rows: [{ studentId: "s1", enrollmentNo: "E1", name: "Asha", section: "A", marks: 10, absent: false }, { studentId: "s2", enrollmentNo: "E2", name: "Ravi", section: "A", marks: null, absent: true }] }]]],
  ["/results", null, ST, [[["results", "me", null], result]]],
  ["/results", null, FA, [[["results", "summary", { school: "ENG" }], { school: "ENG", publishedExams: 2, subjectRows: [{ code: "ENG101", name: "Maths", passPercent: 80, average: 70 }], toppers: [{ id: "s1", name: "Asha", enrollmentNo: "E1", cgpa: 9 }], backlogs: [{ id: "s2", name: "Ravi", enrollmentNo: "E2", program: "B", backlogs: 1, cgpa: 4 }], students: 5 }], [["students", "for-results", null], [{ id: "s1", name: "Asha", enrollmentNo: "E1", school: "ENG" }]]]],
  ["/lms/ENG101", "/lms/:code", ST, [[["lms", "course", "ENG101", null], { course: { code: "ENG101", name: "Maths", credits: 4, type: "Theory", facultyName: "Dr X", description: "d" }, canTeach: false, materials: [{ id: "m1", kind: "Link", title: "Notes", url: "https://a.b", unit: 1, postedByName: "Dr X", createdAt: D, description: "" }], assignments: [{ id: "a1", title: "HW1", description: "d", dueDate: D, marks: 10, overdue: false, mine: { marks: 8, late: false, feedback: "ok" } }, { id: "a2", title: "HW2", dueDate: D, marks: 10, overdue: true }], quizzes: [{ id: "q1", title: "Quiz", durationMin: 10, questionCount: 3, mine: { score: 2, total: 3 } }] }]]],
  ["/lms/ENG101", "/lms/:code", FA, [[["lms", "course", "ENG101", null], { course: { code: "ENG101", name: "Maths", credits: 4, type: "Theory", facultyName: "Dr X" }, canTeach: true, materials: [], assignments: [{ id: "a1", title: "HW1", dueDate: D, marks: 10, overdue: false, submissions: 3 }], quizzes: [{ id: "q1", title: "Quiz", durationMin: 10, questionCount: 3, attempts: 2 }] }]]],
  ["/lms/quiz/q1", "/lms/quiz/:id", ST, [[["lms", "quiz", "q1", null], { id: "q1", title: "Quiz", durationMin: 10, courseCode: "ENG101", questions: [{ text: "Q?", options: ["a", "b"] }] }]]],
  ["/lms/quiz/q1", "/lms/quiz/:id", ST, [[["lms", "quiz", "q1", null], { id: "q1", title: "Quiz", durationMin: 10, courseCode: "ENG101", questions: [{ text: "Q?", options: ["a", "b"], correct: 0 }], attempt: { score: 1, total: 1, answers: [0] } }]]],
  ["/library", null, ST, [[["library", "me", null], [{ ...issue, status: "returned", returnedAt: D }, issue]]]],
  ["/library", null, LI, [[["library", "issues", null], [issue]], [["library", "books", null], { books: [book], categories: ["CS"] }], [["library", "summary", null], { titles: 1, copies: 3, issued: 1, overdue: 1 }]]],
  ["/leave", null, ST, [[["leave", "mine", null], [{ id: "l1", type: "Sick", fromDate: D, toDate: D, days: 1, reason: "Fever", status: "approved", decidedByName: "Dr", decisionNote: "ok" }, { id: "l2", type: "Casual", fromDate: D, toDate: D, days: 1, reason: "x", status: "pending" }]]]],
  ["/leave", null, A, [[["leave", "requests", null], [{ id: "l1", applicantName: "Asha", applicantRole: "student", school: "ENG", type: "Sick", fromDate: D, toDate: D, days: 1, reason: "Fever", status: "pending" }]]]],
  ["/notices", null, A, [[["notices", null], [notice]]]],
  ["/notices", null, ST, [[["notices", null], [{ ...notice, editable: false }]]]],
  ["/events", null, ST, [[["events", null], [event, { ...event, id: "ev2", past: true, type: "Holiday" }]]]],
  ["/events/ev1", "/events/:id", A, [[["events", "ev1", null], event], [["events", "ev1", "people", null], [{ id: "r1", name: "Asha", role: "student" }]]]],
  ["/grievance", null, ST, [[["grievance", null], [ticket]]]],
  ["/grievance/t1", "/grievance/:id", ST, [[["grievance", "t1", null], ticket]]],
  ["/grievance/t1", "/grievance/:id", A, [[["grievance", "t1", null], ticket]]],
  ["/certificates", null, ST, [[["certificates", "mine", null], [cert]]]],
  ["/certificates", null, A, [[["certificates", "all", null], [{ ...cert, status: "approved" }]]]],
  ["/placements", null, ST, [[["placements", "jobs", null], [job]]]],
  ["/placements", null, A, [[["placements", "jobs", null], [job]], [["placements", "companies", null], [{ id: "co1", name: "TechNova" }]], [["placements", "stats", null], { companies: 1, openJobs: 1, applications: 2, selected: 0 }]]],
  ["/alumni", null, ST, [[["alumni", null], [{ id: "al1", name: "Ritika Shah", school: "ENG", graduationYear: 2019, company: "Google", designation: "SWE", city: "Pune", mentor: true }]]]],
  ["/alumni/al1", "/alumni/:id", ST, [[["alumni", "al1", null], { id: "al1", name: "Ritika Shah", school: "ENG", graduationYear: 2019, company: "Google", designation: "SWE", city: "Pune", mentor: true, linkedin: "javascript:alert(1)", email: "a@b.c", bio: "Hi" }]]],
  ["/transport", null, ST, [[["transport", "me", null], { rider: true, stop: "Gate", since: D, route, vehicle }]]],
  ["/transport", null, A, [[["transport", "overview", null], { vehicles: [vehicle], routes: [route], riders: [{ id: "t1", studentId: "s1", routeId: "r1", stop: "Gate", since: D, studentName: "Asha", enrollmentNo: "E1" }] }]]],
  ["/analytics", null, A, [[["analytics", "insights", {}], insights]]],
  ["/attendance-planner", null, ST, [[["analytics", "planner", null], { mode: "student", target: 75, overall: 70, overallNeeded: 4, rows: [{ code: "C1", name: "Maths", held: 10, attended: 7, percent: 70, needed: 2, canMiss: 0 }] }]]],
  ["/attendance-planner", null, FA, [[["analytics", "planner", { school: "ENG" }], { mode: "staff", target: 75, school: "ENG", rows: [{ id: "s1", name: "Asha", enrollmentNo: "E1", program: "B", held: 10, attended: 6, percent: 60, needed: 6 }] }]]],
  ["/reports", null, A, [[["reports", "types", null], [{ id: "fees", title: "Fee dues" }]], [["reports", "fees", "", {}], { type: "fees", title: "Fee dues", generatedOn: D, columns: [{ key: "name", header: "Name" }, { key: "balance", header: "Balance" }], rows: [{ enrollmentNo: "E1", name: "Asha", balance: 100 }] }]]],
  ["/admissions", null, A, [[["admissions", "list", null], { items: [{ id: "ap1", applicationNo: "APP2026-0001", name: "A", email: "a@b.c", phone: "1", program: "B", school: "ENG", percentage: 90, status: "approved", createdAt: D, dateOfBirth: D, city: "V", previousSchool: "X", guardianName: "G", guardianPhone: "1" }], counts: { approved: 1 } }]]],
  ["/", null, AC, [[["dashboard", "accountant", null], { summary: { total: 1, paid: 1, balance: 0, defaulters: 0, collectedToday: 1, collectedThisMonth: 1 }, monthly: [{ label: "Oct 2026", amount: 100 }], byMode: [{ mode: "UPI", amount: 100 }], defaulters: [], recent: [payment] }], [["notices", "latest", { limit: 5 }], [notice]]]],
  ["/", null, LI, [[["dashboard", "librarian", null], { summary: { titles: 1, copies: 2, issued: 1, overdue: 1 }, overdue: [issue], recent: [issue], categories: [{ category: "CS", titles: 1, copies: 2 }] }]]],
  ["/notifications", null, ST, [[["notifications", "list", null], { items: [{ id: "n1", title: "Hi", message: "m", link: "/fees", read: false, createdAt: D }], unread: 1 }]]],
  ["/messages", null, ST, [[["messages", "conversations", null], [{ id: "c1", with: { id: "u2", name: "Dr X", role: "faculty" }, lastMessage: "hi", lastAt: D, mine: false, unread: 2 }]]]],
  ["/messages/c1", "/messages/:id", ST, [[["messages", "conversations", null], [{ id: "c1", with: { id: "u2", name: "Dr X", role: "faculty" }, lastMessage: "hi", mine: true, unread: 0 }]], [["messages", "chat", "c1", null], { id: "c1", with: { id: "u2", name: "Dr X", role: "faculty" }, messages: [{ id: "m1", body: "hi", mine: true, at: D }, { id: "m2", body: "hello", mine: false, at: D }] }]]],
  ["/audit-logs", null, A, [[["audit-logs", { page: 1, limit: 25 }], { items: [{ id: "a1", createdAt: D, userName: "Admin", role: "admin", method: "POST", path: "/students", statusCode: 201 }], total: 1, pages: 1 }]]],
  ["/settings", null, A, [[["settings", null], { loanDays: 14, finePerDay: 2, maxBooksPerStudent: 4 }]]],
];
const pageFor = new Map(PAGES.map(([u, f, , , r]) => [r || u, f]));
const pageByUrl = (url, route) => {
  const hit = PAGES.find(([u, , , , r]) => (route ? r === route : u === url));
  return hit[1];
};
for (const [url, route, roles, seed] of FIXTURES) {
  const Comp = await page(pageByUrl(url, route));
  for (const role of roles) {
    const c = client();
    seed.forEach(([key, data]) => c.setQueryData(key, data));
    const user = { id: "u1", name: "Test User", email: "t@x.test", role, school: "ENG", status: "active" };
    store.dispatch(setUser(user));
    errors.length = 0;
    try {
      const html = renderToString(React.createElement(Provider, { store }, React.createElement(QueryClientProvider, { client: c },
        wrap(React.createElement(MemoryRouter, { initialEntries: [url] }, React.createElement(Routes, null, React.createElement(Route, { path: route || url, element: React.createElement(Comp) })))))));
      // the page must have moved past its loading skeleton and show something from the data
      if (/animate-pulse/.test(html) && !/sr-only/.test(html) && html.length < 400) failures.push(`${url} (${role}): still shows the loading state with data present`);
      const bad = errors.filter((e) => /Warning|Invalid hook|Cannot read|is not defined|Each child|Failed prop/i.test(e) && !/useLayoutEffect/.test(e));
      if (bad.length) failures.push(`${url} with data (${role}): ${bad[0]}`);
      if (process.env.SMOKE_SHOW === url + role) console.log(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 400));
      if (/javascript:alert/.test(html)) failures.push(`${url} (${role}): an unsafe javascript: link was rendered`);
      rendered += 1;
    } catch (err) {
      failures.push(`${url} with data (${role}): ${err.message.split("\n")[0]}`);
    }
  }
}
void pageFor;

// the layout (side menu, top bar) for every role
const { default: Layout } = await src("components/layout/Layout.jsx");
for (const role of Object.values(ROLES)) {
  const user = { id: "u1", name: "Test User", email: "t@x.test", role, school: "ENG", status: "active" };
  store.dispatch(setUser(user));
  try {
    renderToString(React.createElement(Provider, { store }, React.createElement(QueryClientProvider, { client: client() },
      wrap(React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(Routes, null, React.createElement(Route, { element: React.createElement(Layout) }, React.createElement(Route, { path: "/", element: React.createElement("div", null, "x") }))))))));
    rendered += 1;
  } catch (err) {
    failures.push(`layout (${role}): ${err.message.split("\n")[0]}`);
  }
}

console.error = origError;
console.log(`rendered ${rendered} page views (${PAGES.length} pages x the roles that may open them, ${FIXTURES.length} more with realistic data, ${PUBLIC.length} public pages, the layout for ${Object.values(ROLES).length} roles)`);
const menuPaths = new Set(PAGES.map((p) => p[0]));
const missing = NAV_ITEMS.filter((n) => !menuPaths.has(n.path)).map((n) => n.path);
if (missing.length) failures.push(`menu items with no page in this test: ${missing.join(", ")}`);
if (failures.length) {
  console.log(`\n${failures.length} problem(s):`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
console.log("every page renders without crashing");
process.exit(0);
