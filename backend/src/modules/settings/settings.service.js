import { User } from "../users/user.model.js";
import { Setting } from "./setting.model.js";
import { assertManager } from "../../utils/access.js";
import { PERM } from "../../utils/permissions.js";
import { ApiError } from "../../utils/ApiError.js";
import { collectionCounts, integrityChecks } from "../../utils/dbHealth.js";

// What an admin can change without touching code. The defaults apply until something is saved.
export const DEFAULTS = {
  loanDays: 14, // days a library book may be kept
  finePerDay: 2, // library fine in rupees per overdue day
  maxBooksPerStudent: 4,
};

export async function getSettings() {
  const rows = await Setting.find({ key: { $in: Object.keys(DEFAULTS) } });
  const out = { ...DEFAULTS };
  rows.forEach((r) => { out[r.key] = r.value; });
  return out;
}

export async function updateSettings(user, values) {
  assertManager(user, PERM.SETTINGS);
  await Promise.all(
    Object.entries(values).map(([key, value]) =>
      Setting.updateOne({ key }, { key, value }, { upsert: true })
    )
  );
  return getSettings();
}

export async function updateProfile(user, { name, phone }) {
  const fresh = await User.findById(user._id);
  if (!fresh) throw new ApiError(404, "Account not found");
  fresh.name = name;
  fresh.phone = phone || undefined;
  await fresh.save();
  return fresh.toSafeJSON();
}

// Lets an admin see what is in the database without any database tool
export async function getHealth(user) {
  assertManager(user, PERM.SETTINGS);
  const [counts, checks] = await Promise.all([collectionCounts(), integrityChecks()]);
  return { counts, checks };
}
