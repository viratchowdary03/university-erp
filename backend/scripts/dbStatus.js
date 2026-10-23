// Shows what is inside the database without any database tool:
//   npm run db:status            record counts per collection + consistency checks
//   npm run db:status -- users   also lists the login accounts (name, email, role, status; never passwords)
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { collectionCounts, integrityChecks } from "../src/utils/dbHealth.js";

try {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`Connected to: ${env.mongoUri.replace(/\/\/[^@]*@/, "//***@")}\n`);

  console.log("RECORDS PER COLLECTION");
  (await collectionCounts()).forEach(({ name, count }) => console.log(`  ${name.padEnd(24)} ${count}`));

  console.log("\nCONSISTENCY CHECKS");
  const checks = await integrityChecks();
  checks.forEach((c) => console.log(`  ${c.ok ? "OK  " : "FAIL"} ${c.label}${c.ok ? "" : `  (${c.broken})`}`));

  if (process.argv.includes("users")) {
    console.log("\nLOGIN ACCOUNTS");
    const users = await mongoose.connection.db.collection("users")
      .find({}, { projection: { name: 1, email: 1, role: 1, status: 1, school: 1 } }).sort({ role: 1, name: 1 }).toArray();
    users.forEach((u) => console.log(`  ${String(u.role).padEnd(12)} ${String(u.status).padEnd(10)} ${u.email}  (${u.name}${u.school ? `, ${u.school}` : ""})`));
  }
  if (checks.some((c) => !c.ok)) process.exitCode = 2;
} catch (err) {
  console.error(`Could not read the database: ${err.message}`);
  console.error("Is MongoDB running, and is MONGO_URI in backend/.env correct?");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
