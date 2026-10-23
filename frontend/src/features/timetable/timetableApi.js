import { PERM, can } from "../../config/permissions";
import { ROLES } from "../../config/roles";
import { visibleSchool } from "../../utils/access";
import { buildTimetable } from "../../utils/demoData";

// The week for one school. Full-access roles may pick the school, everyone else sees their own.
export function getTimetable(user, requestedSchool) {
  if (!can(user?.role, PERM.TIMETABLE)) return null;
  const scope = visibleSchool(user);
  const school = scope === null ? requestedSchool || "ENG" : scope;
  return { school, grid: buildTimetable(school) };
}

// Keep only the classes this teacher takes (other slots become null)
export const onlyMyClasses = (grid, user, facultyId) =>
  user?.role === ROLES.FACULTY
    ? grid.map((day) => day.map((slot) => (slot && slot.facultyId === (facultyId ?? user.id) ? slot : null)))
    : grid;
