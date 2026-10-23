// Role-based access test. It runs the REAL Express app with a stand-in for the user lookup and with
// database calls switched off, then checks every route for every role:
//   - roles that should be blocked must get 403
//   - roles that should be allowed must get past the permission checks (anything except 401/403:
//     400 = validation, 500 = reached the database, which is not connected in this test)
// No MongoDB is needed.
import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-secret";
process.env.MONGO_URI = "mongodb://127.0.0.1:1/none";
mongoose.set("bufferCommands", false);

const { default: app } = await import("../src/app.js");
const { User } = await import("../src/modules/users/user.model.js");
const { signAccessToken } = await import("../src/utils/generateToken.js");

const ALL_ROLES = ["super_admin", "registrar", "admin", "hod", "faculty", "student", "accountant", "librarian"];
const FULL = ["super_admin", "registrar", "admin"];
const ID = "64b000000000000000000001";
const fake = {};
ALL_ROLES.forEach((role, i) => {
  fake[`64b00000000000000000010${i}`] = { _id: `64b00000000000000000010${i}`, role, school: "ENG", status: "active", name: role, email: `${role}@x.test` };
});
User.findById = (id) => Promise.resolve(fake[String(id)] || null);
const tokenFor = (role) => signAccessToken({ _id: Object.keys(fake).find((k) => fake[k].role === role), role });

const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

const call = async (method, path, role, body) => {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(role ? { Authorization: `Bearer ${tokenFor(role)}` } : {}) },
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
  });
  return res.status;
};

const staffAcademic = [...FULL, "hod", "faculty"];
const order = { structureId: ID };
// [method, path, roles that may use it, body]
const ROUTES = [
  ["GET", "/api/users", FULL],
  ["PATCH", `/api/users/${ID}/status`, FULL, { status: "suspended" }],
  ["GET", "/api/academic", FULL],
  ["POST", "/api/academic/subjects", FULL],
  ["GET", "/api/admissions", FULL],
  ["PATCH", `/api/admissions/${ID}/decision`, FULL, { status: "approved" }],
  ["POST", `/api/admissions/${ID}/enroll`, FULL],
  ["GET", "/api/exams", [...staffAcademic, "student"]],
  ["POST", "/api/exams", staffAcademic],
  ["PUT", `/api/exams/${ID}/marks`, staffAcademic],
  ["PATCH", `/api/exams/${ID}/publish`, staffAcademic, { published: true }],
  ["GET", "/api/results/me", ["student"]],
  ["GET", "/api/results/summary", staffAcademic],
  ["GET", `/api/results/student/${ID}`, staffAcademic],
  ["GET", "/api/fees/me", ["student"]],
  ["GET", "/api/fees/structures", [...FULL, "accountant"]],
  ["POST", "/api/fees/structures", [...FULL, "accountant"]],
  ["GET", "/api/fees/students", [...FULL, "accountant"]],
  ["POST", "/api/fees/payments", [...FULL, "accountant"]],
  ["GET", "/api/payments/gateway", [...FULL, "student", "accountant"]],
  ["POST", "/api/payments/orders", ["student"], order],
  ["GET", "/api/library/books", [...FULL, "student", "librarian"]],
  ["POST", "/api/library/books", [...FULL, "librarian"]],
  ["GET", "/api/library/me", ["student"]],
  ["GET", "/api/library/issues", [...FULL, "librarian"]],
  ["POST", "/api/library/issues", [...FULL, "librarian"]],
  ["GET", "/api/transport/overview", FULL],
  ["GET", "/api/transport/me", ["student"]],
  ["POST", "/api/transport/routes", FULL],
  ["POST", "/api/leave", ["hod", "faculty", "student"], { type: "Casual", fromDate: "2030-01-01", toDate: "2030-01-02", reason: "Family function" }],
  ["GET", "/api/leave/requests", staffAcademic],
  ["PATCH", `/api/leave/${ID}/decision`, staffAcademic, { status: "approved" }],
  ["GET", "/api/notices", ALL_ROLES],
  ["POST", "/api/notices", [...FULL, "hod", "faculty"]],
  ["DELETE", `/api/notices/${ID}`, [...FULL, "hod", "faculty"]],
  ["GET", "/api/notifications", ALL_ROLES],
  ["PATCH", "/api/notifications/read-all", ALL_ROLES],
  ["GET", "/api/messages/conversations", ALL_ROLES],
  ["GET", "/api/messages/people", ALL_ROLES],
  ["GET", "/api/events", ALL_ROLES],
  ["POST", "/api/events", FULL],
  ["POST", `/api/events/${ID}/register`, ALL_ROLES],
  ["GET", "/api/grievance", ALL_ROLES],
  ["POST", "/api/grievance", ALL_ROLES, { category: "Fees", subject: "Wrong amount", description: "My fee amount is wrong" }],
  ["GET", "/api/certificates/mine", ["student"]],
  ["GET", "/api/certificates", FULL],
  ["POST", `/api/certificates/${ID}/issue`, FULL],
  ["GET", "/api/placements/jobs", [...FULL, "hod", "student"]],
  ["POST", "/api/placements/jobs", FULL],
  ["POST", `/api/placements/jobs/${ID}/apply`, ["student"]],
  ["GET", "/api/placements/stats", FULL],
  ["GET", "/api/alumni", [...staffAcademic, "student"]],
  ["POST", "/api/alumni", FULL],
  ["GET", "/api/analytics/insights", [...FULL, "hod"]],
  ["GET", "/api/analytics/attendance-prediction", [...staffAcademic, "student"]],
  ["GET", "/api/reports", [...FULL, "hod", "accountant"]],
  ["GET", "/api/reports/fees", [...FULL, "accountant"]],
  ["GET", "/api/reports/students", [...FULL, "hod"]],
  ["GET", "/api/reports/hostel", FULL],
  ["GET", "/api/settings", ALL_ROLES],
  ["PUT", "/api/settings", FULL],
  ["GET", "/api/settings/health", FULL],
  ["GET", "/api/audit-logs", FULL],
  ["GET", "/api/lms/courses", [...staffAcademic, "student"]],
  ["POST", "/api/lms/courses/ENG101/materials", staffAcademic],
  ["POST", `/api/lms/assignments/${ID}/submit`, ["student"], { text: "answer" }],
  ["PATCH", `/api/lms/submissions/${ID}/grade`, staffAcademic, { marks: 5 }],
  ["POST", `/api/lms/quizzes/${ID}/attempt`, ["student"], { answers: [0] }],
  ["GET", "/api/dashboard/accountant", [...FULL, "accountant"]],
  ["GET", "/api/dashboard/librarian", [...FULL, "librarian"]],
];

test("every route rejects a request with no token", async () => {
  const bad = [];
  for (const [method, path] of ROUTES) {
    const status = await call(method, path, null);
    if (status !== 401) bad.push(`${method} ${path} -> ${status}`);
  }
  assert.deepEqual(bad, []);
});

test("an invalid token is rejected", async () => {
  const res = await fetch(`${base}/api/exams`, { headers: { Authorization: "Bearer not-a-token" } });
  assert.equal(res.status, 401);
});

test("public admission routes need no login but still validate input", async () => {
  assert.equal(await call("POST", "/api/admissions/apply", null, {}), 400);
  assert.equal(await call("POST", "/api/admissions/status", null, {}), 400);
  assert.equal(await call("POST", "/api/auth/forgot-password", null, {}), 400);
  assert.equal(await call("POST", "/api/auth/reset-password", null, {}), 400);
});

for (const [method, path, allowed, body] of ROUTES) {
  test(`${method} ${path}`, async () => {
    const wrong = [];
    for (const role of ALL_ROLES) {
      const status = await call(method, path, role, body);
      const passed = status !== 401 && status !== 403;
      if (allowed.includes(role) !== passed) wrong.push(`${role}: got ${status}, expected ${allowed.includes(role) ? "access" : "403"}`);
    }
    assert.deepEqual(wrong, []);
  });
}
