import { ApiError } from "../../utils/ApiError.js";
import { PERM, hasPermission } from "../../utils/permissions.js";
import { visibleSchool } from "../../utils/access.js";
import { TimetableSlot } from "./timetable.model.js";
import { Subject } from "../academic/subject.model.js";
import { Faculty } from "../faculty/faculty.model.js";

export const DAY_COUNT = 5;
export const PERIOD_COUNT = 6;

// The week for one school as grid[day][period]. Full-access roles may pick the school.
export async function getTimetable(user, requestedSchool) {
  if (!hasPermission(user.role, PERM.TIMETABLE)) throw new ApiError(403, "You do not have access to the timetable");
  const scope = visibleSchool(user);
  const school = scope === null ? requestedSchool || "ENG" : scope;

  const [slots, subjects, teachers, me] = await Promise.all([
    TimetableSlot.find({ school }),
    Subject.find({ school }),
    Faculty.find({ school }),
    user.role === "faculty" ? Faculty.findOne({ userId: user._id }) : null,
  ]);
  const subjectByCode = new Map(subjects.map((s) => [s.code, s]));
  const teacherById = new Map(teachers.map((t) => [String(t._id), t]));

  const grid = Array.from({ length: DAY_COUNT }, () => Array(PERIOD_COUNT).fill(null));
  slots.forEach((slot) => {
    const subject = subjectByCode.get(slot.subjectCode);
    if (!subject) return;
    grid[slot.day][slot.period] = {
      subjectCode: subject.code,
      subjectName: subject.name,
      type: subject.type,
      facultyId: subject.facultyId ? String(subject.facultyId) : null,
      facultyName: teacherById.get(String(subject.facultyId))?.name ?? "Unassigned",
      room: slot.room,
    };
  });
  return { school, grid, myFacultyId: me ? String(me._id) : null };
}
