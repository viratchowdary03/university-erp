// Creates sign-in accounts for the sample people, so every role can be tried with real logins.
//
//   npm run seed:demo-users
//
// All accounts get the same password (DEMO_PASSWORD in .env, default Demo@12345).
// Development only: it refuses to run when NODE_ENV=production.
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { ACCOUNT_STATUS, ROLES } from "../utils/constants.js";
import { SCHOOLS } from "../utils/schools.js";
import { User } from "../modules/users/user.model.js";
import { Faculty } from "../modules/faculty/faculty.model.js";
import { Student } from "../modules/students/student.model.js";
import { seedUserLinked } from "./seedExtras.js";

if (env.nodeEnv === "production") {
  console.error("Demo accounts are for development only. Refusing to run in production.");
  process.exit(1);
}

const PASSWORD = process.env.DEMO_PASSWORD || "Demo@12345";

const STAFF = [
  { role: ROLES.SUPER_ADMIN, name: "Dr. Anil Kumar", email: "anil.kumar@vcu.edu" },
  { role: ROLES.REGISTRAR, name: "Dr. Lakshmi Narayan", email: "lakshmi.narayan@vcu.edu" },
  { role: ROLES.ADMIN, name: "Rakesh Menon", email: "rakesh.menon@vcu.edu" },
  { role: ROLES.ACCOUNTANT, name: "Sunita Agarwal", email: "sunita.agarwal@vcu.edu" },
  { role: ROLES.LIBRARIAN, name: "Prakash Iyer", email: "prakash.iyer@vcu.edu" },
];

async function createAccount({ role, name, email, phone, school, department }) {
  if (await User.exists({ email })) return null;
  return User.create({
    name, email, phone, role, school, department, password: PASSWORD,
    isEmailVerified: true, status: ACCOUNT_STATUS.ACTIVE,
  });
}

try {
  await mongoose.connect(env.mongoUri);
  const shown = [];
  let created = 0;

  for (const person of STAFF) {
    if (await createAccount(person)) created += 1;
    shown.push([person.role, person.email]);
  }

  for (const { code } of SCHOOLS) {
    const [head, teacher] = (await Faculty.find({ school: code }).sort({ employeeId: 1 })).filter((_, i) => i < 2);
    const student = await Student.findOne({ school: code }).sort({ enrollmentNo: 1 });
    for (const [role, record] of [[ROLES.HOD, head], [ROLES.FACULTY, teacher], [ROLES.STUDENT, student]]) {
      if (!record) continue;
      const user = await createAccount({ role, name: record.name, email: record.email, phone: record.phone, school: code, department: record.department || record.program });
      if (user) created += 1;
      // An account that already exists (kept after  seed:sample --reset) is linked to the re-created record again
      const account = user || (await User.findOne({ email: record.email }));
      if (account) await (role === ROLES.STUDENT ? Student : Faculty).updateOne({ _id: record._id }, { userId: account._id });
      if (code === "ENG") shown.push([role, record.email]);
    }
  }

  // notices, leave, tickets and chat need real accounts to belong to
  const engStudent = await Student.findOne({ school: "ENG", userId: { $ne: null } }).sort({ enrollmentNo: 1 });
  await seedUserLinked({
    admin: await User.findOne({ role: ROLES.ADMIN }),
    studentUser: engStudent && (await User.findById(engStudent.userId)),
    facultyUser: await User.findOne({ role: ROLES.FACULTY, school: "ENG" }),
  });

  console.log(`${created} new accounts created. Password for all of them: ${PASSWORD}\n`);
  console.log("Examples (School of Engineering):");
  shown.forEach(([role, email]) => console.log(`  ${role.padEnd(12)} ${email}`));
  console.log("\nThe heads, faculty and students of the other schools follow the same pattern with their own names.");
} catch (err) {
  console.error("Could not create the accounts:", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
