// Creates the first Super Admin. Run once with:  npm run seed
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { ACCOUNT_STATUS, ROLES } from "../utils/constants.js";
import { User } from "../modules/users/user.model.js";

const { name, email, password } = env.superAdmin;

if (!email || !password) {
  console.error("Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in backend/.env first.");
  process.exit(1);
}

try {
  await mongoose.connect(env.mongoUri);
  const existing = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (existing) {
    console.log(`A Super Admin already exists (${existing.email}). Nothing to do.`);
  } else {
    await User.create({
      name,
      email,
      password,
      role: ROLES.SUPER_ADMIN,
      isEmailVerified: true,
      status: ACCOUNT_STATUS.ACTIVE,
    });
    console.log(`Super Admin created: ${email}`);
    console.log("Sign in, then change this password.");
  }
} catch (err) {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
