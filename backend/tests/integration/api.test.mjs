// Integration test for the whole API, against a REAL (empty, throw-away) database.
//
//   1. Create an empty database for testing, e.g. a second Atlas database or a local one.
//   2. Put its address in backend/.env as TEST_MONGO_URI (never your real database: this test
//      wipes it, loads sample data and creates and deletes records).
//   3. npm run test:api
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

const root = fileURLToPath(new URL("../../", import.meta.url));
const TEST_URI = process.env.TEST_MONGO_URI;
if (!TEST_URI) {
  console.error("Set TEST_MONGO_URI in backend/.env to an empty test database first.");
  process.exit(1);
}
if (TEST_URI === process.env.MONGO_URI) {
  console.error("TEST_MONGO_URI must be a different database from MONGO_URI. This test wipes it.");
  process.exit(1);
}
process.env.MONGO_URI = TEST_URI;
process.env.NODE_ENV = "development";
process.env.JWT_ACCESS_SECRET ||= "test-secret-only-for-this-test";
process.chdir(root);

await mongoose.connect(TEST_URI);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
execFileSync("node", ["src/seeds/seedAcademic.js"], { stdio: "ignore", env: process.env });
execFileSync("node", ["src/seeds/seedDemoUsers.js"], { stdio: "ignore", env: process.env });

import { spawn } from "node:child_process";

const PORT = 5100, BASE = `http://127.0.0.1:${PORT}/api`;
const server = spawn("node", ["src/server.js"], { cwd: root, env: { ...process.env, PORT: String(PORT) }, stdio: ["ignore", "pipe", "pipe"] });
let log = "";
server.stdout.on("data", (d) => (log += d)); server.stderr.on("data", (d) => (log += d));
for (let i = 0; i < 50 && !log.includes("Server running"); i++) await new Promise((r) => setTimeout(r, 200));
if (!log.includes("Server running")) { console.log("server did not start:\n", log); process.exit(1); }

let pass = 0, fail = 0;
const check = (label, cond, extra = "") => { cond ? pass++ : fail++; console.log((cond ? "ok   " : "FAIL ") + label + (cond ? "" : "  " + extra)); };
const call = async (method, path, token, body) => {
  const r = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, data: j.data, message: j.message, body: j };
};
const login = async (email) => (await call("POST", "/auth/login", null, { email, password: "Demo@12345" })).data?.accessToken;

// ---- accounts (from the demo seed) ----
const A = { super: "anil.kumar@vcu.edu", registrar: "lakshmi.narayan@vcu.edu", admin: "rakesh.menon@vcu.edu", acct: "sunita.agarwal@vcu.edu", lib: "prakash.iyer@vcu.edu" };
const people = await call("GET", "/students", await login(A.registrar));
const tok = { super: await login(A.super), registrar: await login(A.registrar), admin: await login(A.admin), acct: await login(A.acct), lib: await login(A.lib) };
const byEmail = async (collection, filter) => { const m = (await import("mongoose")).default; if (!m.connection.readyState) await m.connect(process.env.MONGO_URI); return m.connection.collection(collection).findOne(filter); };
const userOf = async (role, school) => (await byEmail("users", { role, school }))?.email;
tok.hod = await login(await userOf("hod", "NUR")); tok.hodLaw = await login(await userOf("hod", "LAW"));
tok.fac = await login(await userOf("faculty", "PHA")); tok.facEng = await login(await userOf("faculty", "ENG"));
tok.stu = await login(await userOf("student", "ENG")); tok.stuNur = await login(await userOf("student", "NUR"));

console.log("\n== authentication ==");
check("registrar and every demo role can sign in", Object.values(tok).every(Boolean));
check("wrong password is refused", (await call("POST", "/auth/login", null, { email: A.registrar, password: "nope" })).status === 401);
check("no token -> 401", (await call("GET", "/students")).status === 401);
check("tampered token -> 401", (await call("GET", "/students", tok.registrar.slice(0, -3) + "abc")).status === 401);
const me = await call("GET", "/auth/me", tok.hod);
check("/auth/me returns the person", me.data.user.role === "hod" && me.data.user.school === "NUR");

console.log("\n== who can see what ==");
const sReg = await call("GET", "/students", tok.registrar);
check("registrar sees all 84 students", sReg.data.length === 84);
check("student rows carry attendance and hostel fields", "attendance" in sReg.data[0] && "hostel" in sReg.data[0] && sReg.data[0].id && sReg.data[0].enrollmentNo);
const sFac = await call("GET", "/students", tok.fac);
check("faculty (Pharmacy) sees only Pharmacy students", sFac.data.length === 6 && sFac.data.every((s) => s.school === "PHA"));
check("hod (Nursing) sees only Nursing students", (await call("GET", "/students", tok.hod)).data.every((s) => s.school === "NUR"));
check("student cannot list students", (await call("GET", "/students", tok.stu)).status === 403);
check("accountant cannot list students", (await call("GET", "/students", tok.acct)).status === 403);
check("librarian cannot open attendance", (await call("GET", "/attendance/report", tok.lib)).status === 403);
check("faculty cannot open faculty list", (await call("GET", "/faculty", tok.fac)).status === 403);
check("hod sees only their own school's faculty", (await call("GET", "/faculty", tok.hod)).data.length === 3);
check("registrar sees all 42 faculty with subjects", (await call("GET", "/faculty", tok.registrar)).data.filter((f) => f.subjects.length === 2).length === 42);
const acad = await call("GET", "/academic", tok.registrar);
check("academic setup: 14 schools, 84 subjects", acad.data.schools.length === 14 && acad.data.subjects.length === 84);
check("academic setup: school cards have counts and a head", acad.data.schools.every((s) => s.studentCount === 6 && s.facultyCount === 3 && s.subjectCount === 6 && s.hod?.isHod));
check("faculty cannot open academic setup", (await call("GET", "/academic", tok.fac)).status === 403);
check("a student cannot read another school's student record", (await call("GET", `/students/${sReg.data.find((s) => s.school === "LAW").id}`, tok.hod)).status === 404);

console.log("\n== creating, editing and deleting students ==");
const newStudent = { name: "Zara Test", email: "zara.api@students.vcu.edu", phone: "9876501234", gender: "F", dateOfBirth: "2005-04-10", school: "NUR", program: "B.Sc Nursing", section: "A", city: "Surat", guardianName: "Mr G", guardianPhone: "9123456789" };
const c1 = await call("POST", "/students", tok.registrar, newStudent);
check("registrar adds a student, number is generated", c1.status === 201 && c1.data.enrollmentNo === "VCU25NUR007", JSON.stringify(c1.body).slice(0, 200));
check("duplicate email -> 409", (await call("POST", "/students", tok.registrar, newStudent)).status === 409);
check("faculty cannot add", (await call("POST", "/students", tok.fac, newStudent)).status === 403);
check("hod cannot add", (await call("POST", "/students", tok.hod, newStudent)).status === 403);
const bad = await call("POST", "/students", tok.registrar, { ...newStudent, email: "x", phone: "1" });
check("bad data -> 400 with a message", bad.status === 400 && bad.message, bad.message);
check("program from another school -> 400", (await call("POST", "/students", tok.registrar, { ...newStudent, email: "z2@x.com", program: "MBA" })).status === 400);
const detail = await call("GET", `/students/${c1.data.id}`, tok.registrar);
check("new student has empty attendance (6 subjects, 100%)", detail.data.attendanceRows.length === 6 && detail.data.attendanceRows.every((r) => r.held === 0) && detail.data.attendance === 100);
const upd = await call("PUT", `/students/${c1.data.id}`, tok.registrar, { ...newStudent, city: "Pune", school: "LAW" });
check("edit works and school is not changed", upd.status === 200 && upd.data.city === "Pune" && upd.data.school === "NUR");
const del = await call("DELETE", `/students/${c1.data.id}`, tok.registrar);
check("delete works", del.status === 200 && (await call("GET", `/students/${c1.data.id}`, tok.registrar)).status === 404);

console.log("\n== faculty ==");
const newFac = { name: "Dr. Newton", email: "newton.api@vcu.edu", phone: "9876500000", gender: "M", school: "LAW", department: "LLM", designation: "Lecturer", qualification: "LLM", experienceYears: 4, subjectCodes: ["LAW305"] };
const f1 = await call("POST", "/faculty", tok.admin, newFac);
check("admin adds faculty, id is generated", f1.status === 201 && f1.data.employeeId === "VCUFLAW04", JSON.stringify(f1.body).slice(0, 200));
const lawList = (await call("GET", "/faculty", tok.registrar)).data.filter((f) => f.school === "LAW");
check("the ticked subject moved to the new teacher", lawList.find((f) => f.id === f1.data.id).subjects.map((s) => s.code).join() === "LAW305" && lawList.filter((f) => f.subjects.length).length === 4 && lawList.find((f) => f.employeeId === "VCUFLAW03").subjects.length === 1);
const hod = lawList.find((f) => f.isHod);
const dh = await call("DELETE", `/faculty/${hod.id}`, tok.registrar);
check("the head of school cannot be deleted", dh.status === 409 && dh.message.includes("head"));
const df = await call("DELETE", `/faculty/${f1.data.id}`, tok.registrar);
const subs = (await call("GET", "/academic", tok.registrar)).data.subjects;
check("deleting a teacher leaves the subject unassigned", df.status === 200 && subs.find((s) => s.code === "LAW305").facultyId === null);
check("faculty cannot add faculty", (await call("POST", "/faculty", tok.fac, newFac)).status === 403);
const tt = await call("GET", "/timetable?school=LAW", tok.registrar);
check("timetable still works with an unassigned subject", tt.status === 200 && JSON.stringify(tt.data.grid).includes("Unassigned"));

console.log("\n== timetable ==");
const ttE = await call("GET", "/timetable", tok.facEng);
check("timetable is a 5 x 6 grid, every cell filled", ttE.data.grid.length === 5 && ttE.data.grid.every((d) => d.length === 6 && d.every(Boolean)));
check("faculty gets their own id so the page can filter 'my classes'", ttE.data.myFacultyId && ttE.data.grid.flat().some((s) => s.facultyId === ttE.data.myFacultyId));
check("student is locked to their own school", (await call("GET", "/timetable?school=LAW", tok.stuNur)).data.school === "NUR");
check("registrar can pick any school", (await call("GET", "/timetable?school=ARC", tok.registrar)).data.school === "ARC");

console.log("\n== attendance ==");
const mine = await call("GET", "/attendance/me", tok.stuNur);
check("student sees their six subjects", mine.data.rows.length === 6 && mine.data.rows.every((r) => r.held > 0));
check("faculty cannot open a student's personal page", (await call("GET", "/attendance/me", tok.fac)).status === 403);
const ov = await call("GET", "/attendance/overview", tok.fac);
check("faculty sees their two subjects with class averages", ov.data.subjects.length === 2 && ov.data.averages.length === 2);
const code = ov.data.subjects[0].code;
const sess = await call("GET", `/attendance/session?subject=${code}`, tok.fac);
check("session lists the school's six students, not yet marked", sess.data.roster.length === 6 && sess.data.marked === false);
const rosterBefore = (await call("GET", "/attendance/report?school=PHA", tok.registrar)).data;
const victim = sess.data.roster[0];
const victimBefore = (await call("GET", `/students/${victim.id}`, tok.registrar)).data.attendanceRows.find((r) => r.code === code);
const present = sess.data.roster.slice(1).map((s) => s.id);
const mk = await call("POST", "/attendance/mark", tok.fac, { subjectCode: code, presentIds: present });
check("faculty saves: 5 present, 1 absent", mk.status === 201 && mk.data.present === 5 && mk.data.absent === 1, JSON.stringify(mk.body));
const victimAfter = (await call("GET", `/students/${victim.id}`, tok.registrar)).data.attendanceRows.find((r) => r.code === code);
check("absent student: one more class held, none attended", victimAfter.held === victimBefore.held + 1 && victimAfter.attended === victimBefore.attended);
check("saving twice the same day -> 409", (await call("POST", "/attendance/mark", tok.fac, { subjectCode: code, presentIds: present })).status === 409);
check("session now reports marked", (await call("GET", `/attendance/session?subject=${code}`, tok.fac)).data.marked === true);
const other = ov.data.subjects.length && (await call("GET", "/attendance/overview", tok.facEng)).data.subjects[0].code;
check("cannot mark another teacher's subject", (await call("POST", "/attendance/mark", tok.fac, { subjectCode: other, presentIds: [] })).status === 403);
check("student cannot mark attendance", (await call("POST", "/attendance/mark", tok.stuNur, { subjectCode: code, presentIds: [] })).status === 403);
check("a student from another school is refused", (await call("POST", "/attendance/mark", tok.fac, { subjectCode: ov.data.subjects[1].code, presentIds: [sReg.data.find((s) => s.school === "LAW").id] })).status === 400);
const rep = await call("GET", "/attendance/report", tok.hod);
check("hod report: own school, subject averages, shortage list", rep.data.school === "NUR" && rep.data.subjectRows.length === 6 && Array.isArray(rep.data.shortage) && rep.data.shortage.every((x) => x.overall < 75 && x.rows.length === 6));
check("registrar can report on any school", (await call("GET", "/attendance/report?school=LAW", tok.registrar)).data.school === "LAW");

console.log("\n== LMS ==");
const lAll = await call("GET", "/lms/courses", tok.registrar);
check("registrar sees 84 courses", lAll.data.courses.length === 84);
check("a course has units and a teacher", lAll.data.courses[0].units.length === 5 && lAll.data.courses[0].facultyName);
const cDetail = await call("GET", `/lms/courses/${lAll.data.courses[0].code}`, tok.registrar);
check("a course page lists its assignments (their own collection now) with due dates", cDetail.status === 200 && cDetail.data.assignments.length >= 1 && cDetail.data.assignments[0].dueDate);
const lStu = await call("GET", "/lms/courses", tok.stuNur);
check("student sees only their school's six courses", lStu.data.courses.length === 6 && lStu.data.courses.every((c) => c.school === "NUR"));
const lFac = await call("GET", "/lms/courses", tok.fac);
check("faculty: exactly their own two courses are marked Teaching", lFac.data.courses.filter((c) => c.teaching).length === 2);
const up = await call("GET", "/lms/assignments/upcoming", tok.stuNur);
check("student has upcoming assignments, soonest first, none already handed in", Array.isArray(up.data) && up.data.length >= 1 && up.data.every((a, i, arr) => !i || new Date(arr[i - 1].due) <= new Date(a.due)));

console.log("\n== hostel ==");
const ho = await call("GET", "/hostel/overview", tok.registrar);
check("overview: 4 hostels, 56 residents", ho.data.hostels.length === 4 && ho.data.residents.length === 56);
check("hostel cards have capacity, occupied and occupancy", ho.data.hostels.every((h) => h.capacity === 120 && h.occupied > 0 && h.occupancy >= 0 && h.id));
check("resident rows carry the student and hostel", ho.data.residents.every((r) => r.student?.name && r.hostel?.name && r.hostelId === r.hostel.id));
check("faculty and student cannot open hostel management", (await call("GET", "/hostel/overview", tok.fac)).status === 403 && (await call("GET", "/hostel/overview", tok.stu)).status === 403);
const myH = await call("GET", "/hostel/me", tok.stu);
check("student sees their own room, warden and roommates", myH.data.resident && myH.data.hostel.warden && Array.isArray(myH.data.roommates));
const alloc = await call("GET", "/hostel/allocatable", tok.registrar);
check("allocatable = the 28 students without a room", alloc.data.length === 28);
const girl = alloc.data.find((s) => s.gender === "F"), boy = alloc.data.find((s) => s.gender === "M");
const girls = ho.data.hostels.find((h) => h.type === "Girls"), boys = ho.data.hostels.find((h) => h.type === "Boys");
const sg = await call("GET", `/hostel/suggest?hostel=${girls.id}`, tok.registrar);
check("suggests a free bed", /^\d{3}$/.test(sg.data.room) && "ABC".includes(sg.data.bed));
const body = { studentId: girl.id, hostelId: girls.id, room: sg.data.room, bed: sg.data.bed, mess: "Veg", feeStatus: "Pending", checkIn: "2025-08-01" };
check("allocate a day scholar", (await call("POST", "/hostel/allocations", tok.registrar, body)).status === 201);
check("same student twice -> 409", (await call("POST", "/hostel/allocations", tok.registrar, body)).status === 409);
const wrong = await call("POST", "/hostel/allocations", tok.registrar, { ...body, studentId: boy.id, room: "401", bed: "A" });
check("a boy cannot be put in a girls' hostel", wrong.status === 400 && wrong.message.includes("girls hostel"), wrong.message);
const taken = ho.data.residents.find((r) => r.hostelId === girls.id) || ho.data.residents[0];
const clash = await call("POST", "/hostel/allocations", tok.registrar, { ...body, studentId: boy.id, hostelId: taken.hostel.id, room: taken.room, bed: taken.bed });
check("a taken bed -> 4xx naming who has it", [400, 409].includes(clash.status) && clash.message.length > 10, clash.message);
check("room out of range -> 400", (await call("POST", "/hostel/allocations", tok.registrar, { ...body, studentId: boy.id, hostelId: boys.id, room: "999", bed: "A" })).status === 400);
const up2 = await call("PUT", `/hostel/allocations/${girl.id}`, tok.registrar, { hostelId: girls.id, room: body.room, bed: body.bed, mess: "Non-Veg", feeStatus: "Paid", checkIn: "2025-08-02" });
check("edit the room details", up2.status === 200 && up2.data.mess === "Non-Veg" && up2.data.feeStatus === "Paid");
check("students cannot allocate", (await call("POST", "/hostel/allocations", tok.stu, body)).status === 403);
check("vacate", (await call("DELETE", `/hostel/allocations/${girl.id}`, tok.registrar)).status === 200 && (await call("DELETE", `/hostel/allocations/${girl.id}`, tok.registrar)).status === 404);

console.log("\n== dashboards ==");
const dA = await call("GET", "/dashboard/admin", tok.registrar);
check("admin dashboard: 14 schools, 84 students, 42 faculty, pending count", dA.data.schoolCount === 14 && dA.data.studentCount === 84 && dA.data.facultyCount === 42 && typeof dA.data.pending === "number" && dA.data.reports.length === 14);
const dH = await call("GET", "/dashboard/admin", tok.hod);
check("hod dashboard is limited to one school", dH.data.schoolCount === 1 && dH.data.studentCount === 6 && dH.data.pending === null);
const dF = await call("GET", "/dashboard/faculty?day=0", tok.fac);
check("faculty dashboard: classes of the day, subjects, averages", dF.data.classes.length > 0 && dF.data.classes.every((c) => c.period && c.subjectName) && dF.data.subjectCount === 2);
const dS = await call("GET", "/dashboard/student?day=1", tok.stu);
check("student dashboard: six periods, attendance rows, hostel, cgpa", dS.data.classes.length === 6 && dS.data.rows.length === 6 && "hostel" in dS.data && dS.data.overall > 0);
check("dashboards refuse the wrong role", (await call("GET", "/dashboard/faculty", tok.stu)).status === 403 && (await call("GET", "/dashboard/admin", tok.fac)).status === 403);

console.log("\n== registering, email code, approval ==");
const otpFor = (email) => { const i = log.lastIndexOf(`To: ${email}`); const m = log.slice(i).match(/verification code is (\d{6})/); return m && m[1]; };
const reg = { name: "Isha Newcomer", email: "isha.new@example.com", phone: "9876543210", password: "Passw0rd1", role: "student", gender: "F", enrollmentNo: "", school: "DES", department: "B.Des Product Design", year: 1, dateOfBirth: "2007-02-02", guardianName: "Mr Newcomer", guardianPhone: "9123456780" };
check("student registers", (await call("POST", "/auth/register", null, reg)).status === 201);
const otp = otpFor(reg.email);
check("a 6-digit code was emailed (printed, SMTP not set)", /^\d{6}$/.test(otp || ""));
check("wrong code refused", (await call("POST", "/auth/verify-otp", null, { email: reg.email, otp: otp === "000000" ? "111111" : "000000" })).status === 400);
check("right code verifies; account waits for approval", (await call("POST", "/auth/verify-otp", null, { email: reg.email, otp })).status === 200);
check("cannot sign in before approval", (await call("POST", "/auth/login", null, { email: reg.email, password: reg.password })).status === 403);
const pending = await call("GET", "/users/pending", tok.registrar);
const req = pending.data.users.find((u) => u.email === reg.email);
check("registrar sees the request with the student's details", req && req.profile.guardianName === "Mr Newcomer" && req.school === "DES" && req.profile.gender === "F");
check("student cannot approve", (await call("PATCH", `/users/${req.id}/approve`, tok.stu)).status === 403);
check("approve -> 200", (await call("PATCH", `/users/${req.id}/approve`, tok.registrar)).status === 200);
const nl = await call("POST", "/auth/login", null, { email: reg.email, password: reg.password });
check("new student can sign in", nl.status === 200 && nl.data.user.role === "student");
const stuList = (await call("GET", "/students", tok.registrar)).data;
const rec = stuList.find((s) => s.email === reg.email);
check("approval created the student record (number, section, linked)", rec && /^VCU25DES\d{3}$/.test(rec.enrollmentNo) && rec.program === "B.Des Product Design" && rec.gender === "F" && rec.year === 1);
const myDash = await call("GET", "/dashboard/student?day=0", nl.data.accessToken);
check("the new student's dashboard works (no classes held yet = 100%)", myDash.status === 200 && myDash.data.overall === 100 && myDash.data.rows.length === 6);
check("and they can open their own timetable and hostel page", (await call("GET", "/timetable", nl.data.accessToken)).data.school === "DES" && (await call("GET", "/hostel/me", nl.data.accessToken)).data.resident === false);

// privileged roles: only a super admin may approve
const adminReq = { name: "Aman Admin", email: "aman.admin@example.com", phone: "9876543211", password: "Passw0rd1", role: "admin", employeeId: "AD-9", designation: "Officer", officeName: "Hostel Office", experienceYears: 3 };
await call("POST", "/auth/register", null, adminReq);
await call("POST", "/auth/verify-otp", null, { email: adminReq.email, otp: otpFor(adminReq.email) });
const aReq = (await call("GET", "/users/pending", tok.super)).data.users.find((u) => u.email === adminReq.email);
check("registrar does not even see an admin request", !(await call("GET", "/users/pending", tok.registrar)).data.users.some((u) => u.email === adminReq.email));
check("registrar cannot approve an admin request", (await call("PATCH", `/users/${aReq.id}/approve`, tok.registrar)).status === 403);
check("super admin can", (await call("PATCH", `/users/${aReq.id}/approve`, tok.super)).status === 200);

// a second head for a school that already has one
const hodReq = { name: "Prof. Second Head", email: "second.head@example.com", phone: "9876543212", password: "Passw0rd1", role: "hod", employeeId: "H-77", school: "ENG", department: "M.Tech", qualification: "Ph.D.", specialization: "AI", experienceYears: 12 };
await call("POST", "/auth/register", null, hodReq);
await call("POST", "/auth/verify-otp", null, { email: hodReq.email, otp: otpFor(hodReq.email) });
const hReq = (await call("GET", "/users/pending", tok.registrar)).data.users.find((u) => u.email === hodReq.email);
const ap = await call("PATCH", `/users/${hReq.id}/approve`, tok.registrar);
check("a school cannot get a second head; the request stays pending", ap.status === 409 && (await call("GET", "/users/pending", tok.registrar)).data.users.some((u) => u.email === hodReq.email), ap.message);
check("reject works", (await call("PATCH", `/users/${hReq.id}/reject`, tok.registrar)).status === 200);

// faculty registration -> record
const facReq = { name: "Dr. Fresh Faculty", email: "fresh.faculty@example.com", phone: "9876543213", password: "Passw0rd1", role: "faculty", employeeId: "VCU-F-9001", school: "ARC", department: "B.Arch", designation: "Professor", qualification: "Ph.D.", specialization: "Design", experienceYears: 9 };
await call("POST", "/auth/register", null, facReq);
await call("POST", "/auth/verify-otp", null, { email: facReq.email, otp: otpFor(facReq.email) });
const fq = (await call("GET", "/users/pending", tok.admin)).data.users.find((u) => u.email === facReq.email);
check("admin approves a faculty member", (await call("PATCH", `/users/${fq.id}/approve`, tok.admin)).status === 200);
const rec2 = (await call("GET", "/faculty", tok.registrar)).data.find((f) => f.email === facReq.email);
check("approval created the faculty record with the employee id they gave", rec2 && rec2.employeeId === "VCU-F-9001" && rec2.school === "ARC" && !rec2.isHod);
const fl = await login(facReq.email).catch(() => null);
const fLogin = await call("POST", "/auth/login", null, { email: facReq.email, password: facReq.password });
check("the new faculty member can sign in and sees an empty teaching load", fLogin.status === 200 && (await call("GET", "/attendance/overview", fLogin.data.accessToken)).data.subjects.length === 0);


// =====================================================================================================
// Modules added later: fees, library, exams/results, leave, admissions, notices, messages, grievance,
// certificates, LMS work, events, transport, placements, password reset, audit log, data health
// =====================================================================================================
const raw = (path, token) => fetch(BASE + path, { headers: { Authorization: `Bearer ${token}` } });
const resetCodeFor = (email) => { const m = [...log.matchAll(/password reset code is (\d{6})/g)]; return m.length ? m[m.length - 1][1] : null; };
const allStudents = (await call("GET", "/students", tok.registrar)).data;

console.log("\n== fees ==");
const structs = await call("GET", "/fees/structures", tok.acct);
check("accountant lists fee structures (two per school)", structs.status === 200 && structs.data.length === 28);
const dues = await call("GET", "/fees/students?school=NUR", tok.acct);
check("dues table has rows and a summary", dues.status === 200 && dues.data.rows.length > 0 && dues.data.summary.total > 0);
const owing = dues.data.rows.find((r) => r.balance > 1000);
const sFees = await call("GET", `/fees/students/${owing.id}`, tok.acct);
const open = sFees.data.items.find((i) => i.balance > 1000);
const paid1 = await call("POST", "/fees/payments", tok.acct, { studentId: owing.id, structureId: open.id, amount: 1000, mode: "Cash" });
check("collect a fee -> 201 with a receipt number", paid1.status === 201 && /^RCT\d{4}-\d{5}$/.test(paid1.data.receiptNo), paid1.message);
check("a payment above the balance is refused", (await call("POST", "/fees/payments", tok.acct, { studentId: owing.id, structureId: open.id, amount: open.balance + 1, mode: "Cash" })).status === 400);
check("the online mode cannot be used at the counter", (await call("POST", "/fees/payments", tok.acct, { studentId: owing.id, structureId: open.id, amount: 10, mode: "Online" })).status === 400);
const sFees2 = await call("GET", `/fees/students/${owing.id}`, tok.acct);
check("the balance fell by exactly the amount paid", sFees2.data.items.find((i) => i.id === open.id).balance === open.balance - 1000);
check("a student cannot collect fees", (await call("POST", "/fees/payments", tok.stuNur, { studentId: owing.id, structureId: open.id, amount: 10, mode: "Cash" })).status === 403);
const myFees = await call("GET", "/fees/me", tok.stuNur);
check("a student sees their own fees", myFees.status === 200 && myFees.data.items.length > 0 && typeof myFees.data.balance === "number");
const receiptRes = await raw(`/fees/payments/${paid1.data.id}/receipt`, tok.acct);
const receiptBytes = Buffer.from(await receiptRes.arrayBuffer()).toString("latin1");
check("the receipt is a PDF", receiptRes.status === 200 && receiptRes.headers.get("content-type") === "application/pdf" && receiptBytes.startsWith("%PDF-"));
check("another student cannot open that receipt", (await raw(`/fees/payments/${paid1.data.id}/receipt`, tok.stuNur)).status === 404 || owing.id === myFees.data?.student?.id);
// online payment (sandbox, development only)
const myOpen = myFees.data.items.find((i) => i.balance > 0);
if (myOpen) {
  const order = await call("POST", "/payments/orders", tok.stuNur, { structureId: myOpen.id });
  check("start an online payment -> order", order.status === 201 && order.data.orderId && order.data.amount === myOpen.balance, order.message);
  const failed = await call("POST", `/payments/orders/${order.data.orderId}/confirm`, tok.stuNur, { method: "UPI", outcome: "failure" });
  check("a failed payment records nothing", failed.data.status === "failed" && (await call("GET", "/fees/me", tok.stuNur)).data.paid === myFees.data.paid);
  const order2 = await call("POST", "/payments/orders", tok.stuNur, { structureId: myOpen.id, amount: 500 });
  const ok2 = await call("POST", `/payments/orders/${order2.data.orderId}/confirm`, tok.stuNur, { method: "UPI", outcome: "success" });
  check("a successful payment creates a receipt", ok2.data.status === "paid" && /^RCT/.test(ok2.data.receiptNo));
  check("an order cannot be confirmed twice", (await call("POST", `/payments/orders/${order2.data.orderId}/confirm`, tok.stuNur, { method: "UPI", outcome: "success" })).status === 409);
  check("another student cannot see the order", (await call("GET", `/payments/orders/${order2.data.orderId}`, tok.stu)).status === 404);
}

console.log("\n== library ==");
const books = await call("GET", "/library/books", tok.lib);
check("catalogue has 20 titles and categories", books.status === 200 && books.data.books.length === 20 && books.data.categories.length > 3);
const lastStudent = allStudents[allStudents.length - 1];
const book = books.data.books.find((b) => b.available > 0);
const iss = await call("POST", "/library/issues", tok.lib, { bookId: book.id, member: lastStudent.enrollmentNo });
check("issue a book -> 201", iss.status === 201, iss.message);
check("the same student cannot take a second copy", (await call("POST", "/library/issues", tok.lib, { bookId: book.id, member: lastStudent.enrollmentNo })).status === 409);
check("available copies went down by one", (await call("GET", "/library/books", tok.lib)).data.books.find((b) => b.id === book.id).available === book.available - 1);
check("a student cannot issue books", (await call("POST", "/library/issues", tok.stuNur, { bookId: book.id, member: lastStudent.enrollmentNo })).status === 403);
check("renew once", (await call("POST", `/library/issues/${iss.data.id}/renew`, tok.lib)).status === 200);
check("renew a second time is refused", (await call("POST", `/library/issues/${iss.data.id}/renew`, tok.lib)).status === 409);
const back = await call("POST", `/library/issues/${iss.data.id}/return`, tok.lib);
check("return -> no fine when on time", back.status === 200 && back.data.fine === 0);
check("available copies are back", (await call("GET", "/library/books", tok.lib)).data.books.find((b) => b.id === book.id).available === book.available);
check("returning twice is refused", (await call("POST", `/library/issues/${iss.data.id}/return`, tok.lib)).status === 404);
const libSum = await call("GET", "/library/summary", tok.lib);
check("summary shows overdue loans from the sample data", libSum.data.issued >= 1 && libSum.data.overdue >= 1);

console.log("\n== exams, marks, results ==");
const teachCourse = (await call("GET", "/lms/courses", tok.facEng)).data.courses.find((c) => c.teaching);
const exm = await call("POST", "/exams", tok.facEng, { name: "Pop Quiz", type: "Internal", subjectCode: teachCourse.code, date: "2030-01-15", maxMarks: 20 });
check("a teacher creates an exam for their own subject", exm.status === 201, exm.message);
const otherCourse = (await call("GET", "/lms/courses", tok.facEng)).data.courses.find((c) => !c.teaching);
check("but not for a colleague's subject", (await call("POST", "/exams", tok.facEng, { name: "No", type: "Internal", subjectCode: otherCourse.code, date: "2030-01-15", maxMarks: 20 })).status === 403);
check("a student cannot create exams", (await call("POST", "/exams", tok.stu, { name: "No", type: "Internal", subjectCode: teachCourse.code, date: "2030-01-15", maxMarks: 20 })).status === 403);
const sheet = await call("GET", `/exams/${exm.data.id}/marks`, tok.facEng);
check("mark sheet lists the whole school", sheet.status === 200 && sheet.data.rows.length > 3 && sheet.data.rows.every((r) => r.marks === null));
check("marks above the maximum are refused", (await call("PUT", `/exams/${exm.data.id}/marks`, tok.facEng, { entries: [{ studentId: sheet.data.rows[0].studentId, marks: 21 }] })).status === 400);
const saved = await call("PUT", `/exams/${exm.data.id}/marks`, tok.facEng, { entries: sheet.data.rows.map((r, i) => (i === 1 ? { studentId: r.studentId, absent: true } : { studentId: r.studentId, marks: 10 + (i % 10) })) });
check("save marks", saved.status === 200 && saved.data.saved === sheet.data.rows.length, saved.message);
check("another school's teacher cannot touch the marks", [403, 404].includes((await call("PUT", `/exams/${exm.data.id}/marks`, tok.fac, { entries: [{ studentId: sheet.data.rows[0].studentId, marks: 5 }] })).status));
check("a student cannot open the mark sheet", (await call("GET", `/exams/${exm.data.id}/marks`, tok.stu)).status === 403);
const seenBefore = (await call("GET", "/exams", tok.stu)).data.find((e) => e.id === exm.data.id);
check("before publishing, the student sees the exam but no marks", seenBefore && seenBefore.myMarks === undefined);
check("publish -> 200", (await call("PATCH", `/exams/${exm.data.id}/publish`, tok.facEng, { published: true })).status === 200);
check("a published exam cannot be edited or have its marks changed", (await call("PUT", `/exams/${exm.data.id}/marks`, tok.facEng, { entries: [{ studentId: sheet.data.rows[0].studentId, marks: 5 }] })).status === 409);
const resMe = await call("GET", "/results/me", tok.stu);
check("student result: semesters, SGPA and CGPA from published exams", resMe.status === 200 && resMe.data.semesters.length >= 1 && typeof resMe.data.cgpa === "number" && resMe.data.semesters[0].subjects.every((s) => ["O", "A+", "A", "B+", "B", "C", "F"].includes(s.grade)));
const sumRes = await call("GET", "/results/summary?school=ENG", tok.registrar);
check("class summary: pass rates, toppers", sumRes.status === 200 && sumRes.data.subjectRows.length > 0 && sumRes.data.toppers.length > 0);
const marksheetPdf = await raw("/results/me/marksheet", tok.stu);
check("marksheet PDF", marksheetPdf.status === 200 && marksheetPdf.headers.get("content-type") === "application/pdf");
check("a teacher cannot ask for 'my result'", (await call("GET", "/results/me", tok.facEng)).status === 403);
check("hide the results again", (await call("PATCH", `/exams/${exm.data.id}/publish`, tok.facEng, { published: false })).status === 200);
check("delete the exam", (await call("DELETE", `/exams/${exm.data.id}`, tok.facEng)).status === 200);

console.log("\n== leave ==");
const lv = await call("POST", "/leave", tok.stuNur, { type: "Casual", fromDate: "2031-03-10", toDate: "2031-03-11", reason: "Family function" });
check("student applies for leave -> pending, 2 days", lv.status === 201 && lv.data.status === "pending" && lv.data.days === 2, lv.message);
check("overlapping dates are refused", (await call("POST", "/leave", tok.stuNur, { type: "Sick", fromDate: "2031-03-11", toDate: "2031-03-12", reason: "Fever" })).status === 409);
check("end before start is refused", (await call("POST", "/leave", tok.stuNur, { type: "Sick", fromDate: "2031-05-12", toDate: "2031-05-10", reason: "Fever" })).status === 400);
check("the head of the same school sees the request", (await call("GET", "/leave/requests", tok.hod)).data.some((l) => l.id === lv.data.id));
check("a head of ANOTHER school does not", !(await call("GET", "/leave/requests", tok.hodLaw)).data.some((l) => l.id === lv.data.id));
check("a student cannot decide", (await call("PATCH", `/leave/${lv.data.id}/decision`, tok.stuNur, { status: "approved" })).status === 403);
check("the head approves", (await call("PATCH", `/leave/${lv.data.id}/decision`, tok.hod, { status: "approved", note: "ok" })).status === 200);
check("a decided request cannot be decided again", (await call("PATCH", `/leave/${lv.data.id}/decision`, tok.hod, { status: "rejected" })).status === 409);
check("the student is notified", (await call("GET", "/notifications", tok.stuNur)).data.items.some((n) => /Leave approved/.test(n.title)));

console.log("\n== admissions ==");
const opts = await call("GET", "/admissions/options", null);
const engOpt = opts.data.find((o) => o.code === "ENG");
check("public options list schools with programs", opts.status === 200 && engOpt && engOpt.programs.length > 0);
const form = { name: "Test Applicant", email: "applicant.test@example.com", phone: "9876501234", gender: "F", dateOfBirth: "2007-04-02", school: "ENG", program: engOpt.programs[0], previousSchool: "City School", percentage: 91, guardianName: "G Parent", guardianPhone: "9876501235", city: "Surat" };
const applied = await call("POST", "/admissions/apply", null, form);
check("anyone can apply -> application number", applied.status === 201 && /^APP\d{4}-\d{4}$/.test(applied.data.applicationNo), applied.message);
check("the same email cannot apply twice", (await call("POST", "/admissions/apply", null, form)).status === 409);
check("a program of another school is refused", (await call("POST", "/admissions/apply", null, { ...form, email: "other.test@example.com", school: "LAW" })).status === 400);
check("status check needs the right email", (await call("POST", "/admissions/status", null, { applicationNo: applied.data.applicationNo, email: "wrong@example.com" })).status === 404);
check("status check works with number + email", (await call("POST", "/admissions/status", null, { applicationNo: applied.data.applicationNo, email: form.email })).data.status === "submitted");
const adm = (await call("GET", "/admissions", tok.registrar)).data.items.find((a) => a.applicationNo === applied.data.applicationNo);
check("a student cannot see applications", (await call("GET", "/admissions", tok.stuNur)).status === 403);
check("cannot enroll before approval", (await call("POST", `/admissions/${adm.id}/enroll`, tok.registrar)).status === 409);
check("approve", (await call("PATCH", `/admissions/${adm.id}/decision`, tok.registrar, { status: "approved" })).status === 200);
const enrolled = await call("POST", `/admissions/${adm.id}/enroll`, tok.registrar);
check("enroll creates the student with an enrollment number", enrolled.status === 201 && enrolled.data.student.enrollmentNo, enrolled.message);
check("the new student is in the student list", (await call("GET", "/students", tok.registrar)).data.some((s) => s.email === form.email));
check("an enrolled application cannot be deleted", (await call("DELETE", `/admissions/${adm.id}`, tok.registrar)).status === 409);

console.log("\n== notices and notifications ==");
const nt = await call("POST", "/notices", tok.admin, { title: "Holiday on Friday", body: "Campus closed.", audience: ["student"], priority: "important" });
check("admin posts a notice for students", nt.status === 201, nt.message);
check("students see it", (await call("GET", "/notices", tok.stuNur)).data.some((n) => n.id === nt.data.id));
check("the accountant (not in the audience) does not", !(await call("GET", "/notices", tok.acct)).data.some((n) => n.id === nt.data.id));
check("an important notice notified the students", (await call("GET", "/notifications", tok.stuNur)).data.items.some((n) => n.title === "Holiday on Friday"));
check("a student cannot post notices", (await call("POST", "/notices", tok.stuNur, { title: "x", body: "y" })).status === 403);
const facNotice = await call("POST", "/notices", tok.facEng, { title: "Lab moved", body: "Lab 2 today", audience: ["student", "accountant"], school: "LAW" });
check("a teacher's notice is forced to their own school and to students/staff only", facNotice.status === 201 && facNotice.data.school === "ENG" && !facNotice.data.audience.includes("accountant"));
check("a teacher cannot delete the admin's notice", (await call("DELETE", `/notices/${nt.data.id}`, tok.facEng)).status === 403);
const notes = await call("GET", "/notifications", tok.stuNur);
check("unread count and mark-all-read", notes.data.unread > 0 && (await call("PATCH", "/notifications/read-all", tok.stuNur)).status === 200 && (await call("GET", "/notifications/unread-count", tok.stuNur)).data.unread === 0);

console.log("\n== messages ==");
const hodUser = await byEmail("users", { role: "hod", school: "NUR" });
const people2 = await call("GET", "/messages/people", tok.stuNur);
check("a student's directory has no other students", people2.status === 200 && people2.data.length > 0 && people2.data.every((p) => p.role !== "student"));
const conv = await call("POST", "/messages/conversations", tok.stuNur, { userId: String(hodUser._id) });
check("start a chat with the head of school", conv.status === 200 && conv.data.id);
check("starting it again returns the same chat", (await call("POST", "/messages/conversations", tok.stuNur, { userId: String(hodUser._id) })).data.id === conv.data.id);
check("send a message", (await call("POST", `/messages/conversations/${conv.data.id}/messages`, tok.stuNur, { body: "Good morning sir" })).status === 201);
check("the head sees one unread", (await call("GET", "/messages/unread-count", tok.hod)).data.unread === 1);
const opened = await call("GET", `/messages/conversations/${conv.data.id}`, tok.hod);
check("opening the chat shows the message and marks it read", opened.data.messages.length === 1 && opened.data.messages[0].mine === false && (await call("GET", "/messages/unread-count", tok.hod)).data.unread === 0);
check("a third person cannot open the chat", (await call("GET", `/messages/conversations/${conv.data.id}`, tok.stu)).status === 404);
const otherStudent = await byEmail("users", { role: "student", school: "ENG" });
check("a student cannot start a chat with another student", (await call("POST", "/messages/conversations", tok.stuNur, { userId: String(otherStudent._id) })).status === 403);

console.log("\n== grievance ==");
const tk = await call("POST", "/grievance", tok.stuNur, { category: "Hostel", subject: "Water problem", description: "No water on floor 2", priority: "high" });
check("student raises a ticket", tk.status === 201 && /^TKT\d{4}-\d{4}$/.test(tk.data.ticketNo), tk.message);
check("an admin sees it", (await call("GET", "/grievance", tok.admin)).data.some((t) => t.id === tk.data.id));
check("another student does not", (await call("GET", `/grievance/${tk.data.id}`, tok.stu)).status === 404);
check("admin replies, ticket moves to in progress", (await call("POST", `/grievance/${tk.data.id}/comments`, tok.admin, { text: "Plumber sent" })).data.status === "in_progress");
check("the student cannot set 'resolved'", (await call("PATCH", `/grievance/${tk.data.id}/status`, tok.stuNur, { status: "resolved" })).status === 403);
check("admin resolves", (await call("PATCH", `/grievance/${tk.data.id}/status`, tok.admin, { status: "resolved" })).data.status === "resolved");
check("the student closes their own ticket", (await call("PATCH", `/grievance/${tk.data.id}/status`, tok.stuNur, { status: "closed" })).data.status === "closed");
check("no replies on a closed ticket", (await call("POST", `/grievance/${tk.data.id}/comments`, tok.stuNur, { text: "more" })).status === 409);

console.log("\n== certificates ==");
const cr = await call("POST", "/certificates", tok.stuNur, { type: "Bonafide Certificate", purpose: "Bank account" });
check("student requests a certificate", cr.status === 201, cr.message);
check("a duplicate open request is refused", (await call("POST", "/certificates", tok.stuNur, { type: "Bonafide Certificate", purpose: "Again" })).status === 409);
check("cannot issue before approval", (await call("POST", `/certificates/${cr.data.id}/issue`, tok.registrar)).status === 409);
check("no PDF before issue", (await raw(`/certificates/${cr.data.id}/pdf`, tok.stuNur)).status === 404);
check("registrar approves", (await call("PATCH", `/certificates/${cr.data.id}/decision`, tok.registrar, { status: "approved" })).status === 200);
const issued = await call("POST", `/certificates/${cr.data.id}/issue`, tok.registrar);
check("issue gives a certificate number", issued.data.status === "issued" && /^VCU\/\d{4}\/\d{4}$/.test(issued.data.certificateNo));
const cpdf = await raw(`/certificates/${cr.data.id}/pdf`, tok.stuNur);
check("the student downloads the PDF", cpdf.status === 200 && cpdf.headers.get("content-type") === "application/pdf");
check("another student cannot", (await raw(`/certificates/${cr.data.id}/pdf`, tok.stu)).status === 404);

console.log("\n== LMS work ==");
const asg = await call("POST", `/lms/courses/${teachCourse.code}/assignments`, tok.facEng, { title: "Lab report", description: "Write it", dueDate: "2031-01-01", marks: 10 });
check("a teacher posts an assignment", asg.status === 201, asg.message);
check("a colleague of another subject cannot", (await call("POST", `/lms/courses/${otherCourse.code}/assignments`, tok.facEng, { title: "x", dueDate: "2031-01-01", marks: 10 })).status === 403);
const subm = await call("POST", `/lms/assignments/${asg.data.id}/submit`, tok.stu, { text: "My answer" });
check("student submits", subm.status === 201 && subm.data.late === false, subm.message);
check("an empty submission is refused", (await call("POST", `/lms/assignments/${asg.data.id}/submit`, tok.stu, {})).status === 400);
check("a link must be http(s)", (await call("POST", `/lms/assignments/${asg.data.id}/submit`, tok.stu, { link: "javascript:alert(1)" })).status === 400);
check("teacher grades; marks above the maximum are refused", (await call("PATCH", `/lms/submissions/${subm.data.id}/grade`, tok.facEng, { marks: 11 })).status === 400 && (await call("PATCH", `/lms/submissions/${subm.data.id}/grade`, tok.facEng, { marks: 9, feedback: "Good" })).status === 200);
check("graded work cannot be resubmitted", (await call("POST", `/lms/assignments/${asg.data.id}/submit`, tok.stu, { text: "again" })).status === 409);
const qz = await call("POST", `/lms/courses/${teachCourse.code}/quizzes`, tok.facEng, { title: "Quick check", durationMin: 5, questions: [{ text: "1+1?", options: ["1", "2"], correct: 1 }, { text: "2+2?", options: ["3", "4"], correct: 1 }] });
check("a teacher creates a quiz", qz.status === 201, qz.message);
const qView = await call("GET", `/lms/quizzes/${qz.data.id}`, tok.stu);
check("students never get the right answers before attempting", qView.data.questions.every((q) => q.correct === undefined));
const att = await call("POST", `/lms/quizzes/${qz.data.id}/attempt`, tok.stu, { answers: [1, 0] });
check("auto-graded: 1 of 2", att.status === 201 && att.data.score === 1 && att.data.total === 2, att.message);
check("only one attempt", (await call("POST", `/lms/quizzes/${qz.data.id}/attempt`, tok.stu, { answers: [1, 1] })).status === 409);
check("after attempting, the student sees the answers", (await call("GET", `/lms/quizzes/${qz.data.id}`, tok.stu)).data.questions[0].correct === 1);
check("the teacher sees the attempts", (await call("GET", `/lms/quizzes/${qz.data.id}/attempts`, tok.facEng)).data.attempts.length === 1);

console.log("\n== events, transport, placements, alumni ==");
const evs = await call("GET", "/events", tok.stuNur);
const ev = evs.data.find((e) => !e.past && e.type !== "Holiday" && !e.registeredByMe);
check("events list with counts", evs.status === 200 && evs.data.length >= 4 && ev);
check("register for an event", (await call("POST", `/events/${ev.id}/register`, tok.stuNur)).status === 201);
check("registering twice is refused", (await call("POST", `/events/${ev.id}/register`, tok.stuNur)).status === 409);
check("organisers see the registrations", (await call("GET", `/events/${ev.id}/registrations`, tok.registrar)).data.length === ev.registered + 1);
check("cancel the registration", (await call("DELETE", `/events/${ev.id}/register`, tok.stuNur)).status === 200);
check("a student cannot create events", (await call("POST", "/events", tok.stuNur, { title: "x", type: "Other", venue: "y", date: "2031-01-01" })).status === 403);
const tr = await call("GET", "/transport/overview", tok.registrar);
check("transport overview: routes with seats and riders", tr.status === 200 && tr.data.routes.length === 3 && tr.data.riders.length > 0);
const free = await call("GET", "/transport/allocatable", tok.registrar);
const rt = tr.data.routes[0];
check("assign a seat", (await call("POST", "/transport/allocations", tok.registrar, { studentId: free.data[0].id, routeId: rt.id, stop: rt.stops[0].name })).status === 201);
check("a stop that is not on the route is refused", (await call("POST", "/transport/allocations", tok.registrar, { studentId: free.data[1].id, routeId: rt.id, stop: "Nowhere" })).status === 400);
check("release the seat", (await call("DELETE", `/transport/allocations/${free.data[0].id}`, tok.registrar)).status === 200);
const jobs = await call("GET", "/placements/jobs", tok.stuNur);
check("students see jobs with eligibility flags", jobs.status === 200 && jobs.data.length === 5 && jobs.data.every((j) => typeof j.eligible === "boolean"));
const notEligible = jobs.data.find((j) => j.eligible === false && j.status === "open" && !j.expired);
if (notEligible) check("applying when not eligible is refused", (await call("POST", `/placements/jobs/${notEligible.id}/apply`, tok.stuNur)).status === 403);
const closedJob = jobs.data.find((j) => j.status === "closed");
check("a closed job refuses applications", (await call("POST", `/placements/jobs/${closedJob.id}/apply`, tok.stuNur)).status === 409);
check("alumni directory", (await call("GET", "/alumni?school=ENG", tok.stuNur)).data.length >= 3);
check("an alumni link must be http(s)", (await call("POST", "/alumni", tok.registrar, { name: "X Y", school: "ENG", graduationYear: 2020, linkedin: "javascript:alert(1)" })).status === 400);

console.log("\n== analytics, reports, dashboards ==");
const ins = await call("GET", "/analytics/insights", tok.registrar);
check("insights: attendance spread, cgpa bands, at-risk list, fees", ins.status === 200 && ins.data.attendanceBuckets.length === 4 && ins.data.cgpaBands.length === 4 && ins.data.fees.billed > 0);
check("a head of school only sees their school", (await call("GET", "/analytics/insights?school=LAW", tok.hod)).data.school === "NUR");
check("a teacher cannot open analytics", (await call("GET", "/analytics/insights", tok.facEng)).status === 403);
const plan = await call("GET", "/analytics/attendance-prediction", tok.stuNur);
check("attendance planner for a student: rows with classes needed", plan.data.mode === "student" && plan.data.rows.length === 6 && plan.data.rows.every((r) => r.needed >= 0 && r.canMiss >= 0));
check("the accountant can open the fee report, not the student list", (await call("GET", "/reports/fees", tok.acct)).status === 200 && (await call("GET", "/reports/students", tok.acct)).status === 403);
check("the head of school gets the attendance shortage report for own school", (await call("GET", "/reports/attendance", tok.hod)).data.rows.every((r) => r.school === "NUR" && r.attendance < 75));
const dAcc = await call("GET", "/dashboard/accountant", tok.acct);
check("accountant dashboard is built from real payments", dAcc.status === 200 && dAcc.data.summary.collectedThisMonth >= 0 && dAcc.data.recent.length > 0 && dAcc.data.byMode.length > 0);
check("librarian dashboard", (await call("GET", "/dashboard/librarian", tok.lib)).data.summary.titles === 20);
check("a student cannot open the accountant dashboard", (await call("GET", "/dashboard/accountant", tok.stuNur)).status === 403);

console.log("\n== settings, users, audit, health ==");
check("library rules are read by anyone signed in", (await call("GET", "/settings", tok.stuNur)).data.loanDays === 14);
check("only admins change them", (await call("PUT", "/settings", tok.stuNur, { loanDays: 5, finePerDay: 1, maxBooksPerStudent: 2 })).status === 403);
check("admin changes the loan period", (await call("PUT", "/settings", tok.admin, { loanDays: 10, finePerDay: 3, maxBooksPerStudent: 4 })).data.loanDays === 10);
await call("PUT", "/settings", tok.admin, { loanDays: 14, finePerDay: 2, maxBooksPerStudent: 4 });
const prof = await call("PUT", "/settings/profile", tok.stuNur, { name: "Renamed Student", phone: "9876543210" });
check("a person updates their own profile", prof.status === 200 && prof.data.user.name === "Renamed Student");
const allUsers = await call("GET", "/users", tok.admin);
check("admin lists all users", allUsers.status === 200 && allUsers.data.users.length > 20);
const suspendTarget = allUsers.data.users.find((u) => u.role === "librarian");
check("suspending a librarian works and blocks their sign-in", (await call("PATCH", `/users/${suspendTarget.id}/status`, tok.admin, { status: "suspended" })).status === 200 && (await call("POST", "/auth/login", null, { email: suspendTarget.email, password: "Demo@12345" })).status === 403);
check("re-activating restores it", (await call("PATCH", `/users/${suspendTarget.id}/status`, tok.admin, { status: "active" })).status === 200 && (await call("POST", "/auth/login", null, { email: suspendTarget.email, password: "Demo@12345" })).status === 200);
const superUser = allUsers.data.users.find((u) => u.role === "super_admin");
check("an admin cannot suspend the super admin", (await call("PATCH", `/users/${superUser.id}/status`, tok.admin, { status: "suspended" })).status === 403);
check("nobody can suspend themselves", (await call("PATCH", `/users/${superUser.id}/status`, tok.super, { status: "suspended" })).status === 400);
const audit = await call("GET", "/audit-logs?limit=100", tok.super);
check("the audit log recorded the changes above (who, what, status)", audit.status === 200 && audit.data.total > 50 && audit.data.items.some((l) => l.method === "POST" && l.path === "/fees/payments" && l.userName));
check("the audit log holds no passwords or request bodies", !JSON.stringify(audit.data).includes("Demo@12345"));
check("a student cannot read the audit log", (await call("GET", "/audit-logs", tok.stuNur)).status === 403);
const health = await call("GET", "/settings/health", tok.super);
check("data health: every consistency check passes on seeded data", health.status === 200 && health.data.checks.length >= 8 && health.data.checks.every((c) => c.ok), JSON.stringify(health.data?.checks?.filter((c) => !c.ok)));

console.log("\n== forgot password ==");
const fpEmail = (await byEmail("users", { role: "librarian" })).email;
check("the answer is the same for a known and an unknown email", (await call("POST", "/auth/forgot-password", null, { email: fpEmail })).status === 200 && (await call("POST", "/auth/forgot-password", null, { email: "nobody@example.com" })).status === 200);
await new Promise((r) => setTimeout(r, 300));
const resetCode = resetCodeFor(fpEmail);
check("a code was sent (printed in dev)", /^\d{6}$/.test(resetCode || ""));
check("a wrong code is refused", (await call("POST", "/auth/reset-password", null, { email: fpEmail, otp: resetCode === "000000" ? "111111" : "000000", newPassword: "Brand@New123" })).status === 400);
check("a weak new password is refused", (await call("POST", "/auth/reset-password", null, { email: fpEmail, otp: resetCode, newPassword: "weak" })).status === 400);
check("the right code resets the password", (await call("POST", "/auth/reset-password", null, { email: fpEmail, otp: resetCode, newPassword: "Brand@New123" })).status === 200);
check("the old password no longer works, the new one does", (await call("POST", "/auth/login", null, { email: fpEmail, password: "Demo@12345" })).status === 401 && (await call("POST", "/auth/login", null, { email: fpEmail, password: "Brand@New123" })).status === 200);
check("a code cannot be used twice", (await call("POST", "/auth/reset-password", null, { email: fpEmail, otp: resetCode, newPassword: "Other@New123" })).status === 400);

console.log(`\n${pass} passed, ${fail} failed`);
server.kill();
process.exit(fail ? 1 : 0);
