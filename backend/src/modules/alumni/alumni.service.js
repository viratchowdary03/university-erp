import { ApiError } from "../../utils/ApiError.js";
import { PERM } from "../../utils/permissions.js";
import { assertManager } from "../../utils/access.js";
import { escapeRegex } from "../../utils/pagination.js";
import { AlumniProfile } from "./alumniProfile.model.js";

export async function listAlumni(query) {
  const filter = {};
  if (query.school) filter.school = String(query.school);
  if (query.year) filter.graduationYear = Number(query.year) || -1;
  if (query.mentor === "true") filter.mentor = true;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ name: rx }, { company: rx }, { designation: rx }, { city: rx }];
  }
  return (await AlumniProfile.find(filter).sort({ graduationYear: -1, name: 1 }).limit(500)).map((a) => a.toJSON());
}

export async function getAlumnus(id) {
  const alumnus = await AlumniProfile.findById(id);
  if (!alumnus) throw new ApiError(404, "Alumni profile not found");
  return alumnus;
}

export async function createAlumnus(user, values) {
  assertManager(user, PERM.ALUMNI);
  return AlumniProfile.create(values);
}
export async function updateAlumnus(user, id, values) {
  assertManager(user, PERM.ALUMNI);
  const alumnus = await getAlumnus(id);
  Object.assign(alumnus, values);
  await alumnus.save();
  return alumnus;
}
export async function deleteAlumnus(user, id) {
  assertManager(user, PERM.ALUMNI);
  await (await getAlumnus(id)).deleteOne();
}
