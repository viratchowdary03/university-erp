import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import { PERM, hasPermission, hasFullAccess } from "../../utils/permissions.js";
import { assertManager } from "../../utils/access.js";
import { Hostel } from "./hostel.model.js";
import { Allocation } from "./allocation.model.js";
import { Student } from "../students/student.model.js";

const hostelCard = (hostel, occupied) => ({
  ...hostel.toJSON(),
  occupied,
  occupancy: Math.round((occupied / hostel.capacity) * 100),
});

// Everything about the hostels, for roles that manage them
export async function getHostelOverview(user) {
  if (!hasPermission(user.role, PERM.HOSTEL) || !hasFullAccess(user.role)) {
    throw new ApiError(403, "You do not have access to hostel management");
  }
  const [hostels, allocations] = await Promise.all([Hostel.find().sort({ name: 1 }), Allocation.find()]);
  const students = await Student.find({ _id: { $in: allocations.map((a) => a.studentId) } });
  const studentById = new Map(students.map((s) => [String(s._id), s]));
  const cards = hostels.map((h) => hostelCard(h, allocations.filter((a) => String(a.hostelId) === String(h._id)).length));
  const cardById = new Map(cards.map((c) => [c.id, c]));

  return {
    hostels: cards,
    residents: allocations
      .map((a) => ({
        ...a.toJSON(),
        student: studentById.get(String(a.studentId))?.toJSON(),
        hostel: cardById.get(String(a.hostelId)),
      }))
      .filter((r) => r.student && r.hostel),
  };
}

// A student's own hostel details (resident: false when they live at home)
export async function getMyHostel(user) {
  if (user.role !== ROLES.STUDENT) throw new ApiError(403, "Only students have a personal hostel page");
  const student = await Student.findOne({ userId: user._id });
  const mine = student && (await Allocation.findOne({ studentId: student._id }));
  if (!mine) return { resident: false };
  const [hostel, mates] = await Promise.all([
    Hostel.findById(mine.hostelId),
    Allocation.find({ hostelId: mine.hostelId, room: mine.room, studentId: { $ne: student._id } }),
  ]);
  const roommates = await Student.find({ _id: { $in: mates.map((m) => m.studentId) } });
  return { resident: true, hostel: hostel.toJSON(), ...mine.toJSON(), roommates: roommates.map((r) => r.toJSON()) };
}

// Students who do not have a room yet
export async function listAllocatableStudents(user) {
  assertManager(user, PERM.HOSTEL);
  const taken = await Allocation.find().select("studentId");
  const students = await Student.find({ _id: { $nin: taken.map((a) => a.studentId) } }).sort({ enrollmentNo: 1 });
  return students.map((s) => ({ id: String(s._id), name: s.name, enrollmentNo: s.enrollmentNo, gender: s.gender, school: s.school }));
}

// The first free bed in a hostel, so the form can suggest one
export async function suggestBed(user, hostelId) {
  assertManager(user, PERM.HOSTEL);
  const hostel = await Hostel.findById(hostelId);
  if (!hostel) return null;
  const taken = new Set((await Allocation.find({ hostelId })).map((a) => `${a.room}${a.bed}`));
  for (let floor = 1; floor <= hostel.floors; floor += 1) {
    for (let n = 1; n <= hostel.roomsPerFloor; n += 1) {
      const room = String(floor * 100 + n);
      for (const bed of "ABC".slice(0, hostel.sharing)) {
        if (!taken.has(`${room}${bed}`)) return { room, bed };
      }
    }
  }
  return null;
}

async function validate(values, exceptStudentId) {
  const [student, hostel] = await Promise.all([Student.findById(values.studentId), Hostel.findById(values.hostelId)]);
  if (!student) throw new ApiError(400, "Choose a student");
  if (!hostel) throw new ApiError(400, "Choose a hostel");
  if (!student.gender) throw new ApiError(400, `${student.name} has no gender on record. Edit the student first`);
  if ((hostel.type === "Boys") !== (student.gender === "M")) {
    throw new ApiError(400, `${hostel.name} is a ${hostel.type.toLowerCase()} hostel and cannot house ${student.name}`);
  }

  const number = Number(values.room);
  const floor = Math.floor(number / 100);
  const inFloor = number % 100;
  if (floor < 1 || floor > hostel.floors || inFloor < 1 || inFloor > hostel.roomsPerFloor) {
    throw new ApiError(400, `${hostel.name} has rooms 101 to ${hostel.floors * 100 + hostel.roomsPerFloor}, ${hostel.roomsPerFloor} per floor`);
  }
  if (!"ABC".slice(0, hostel.sharing).includes(values.bed)) throw new ApiError(400, "Choose a valid bed");

  const holder = await Allocation.findOne({
    hostelId: hostel._id, room: values.room, bed: values.bed, ...(exceptStudentId ? { studentId: { $ne: exceptStudentId } } : {}),
  });
  if (holder) {
    const who = await Student.findById(holder.studentId);
    throw new ApiError(409, `Room ${values.room}, bed ${values.bed} is already taken by ${who?.name}`);
  }
}

const clashError = (err) => {
  if (err.code === 11000) throw new ApiError(409, "That bed was just taken. Choose another one");
  throw err;
};

export async function allocateRoom(user, values) {
  assertManager(user, PERM.HOSTEL);
  if (await Allocation.exists({ studentId: values.studentId })) throw new ApiError(409, "This student already has a room");
  await validate(values);
  try {
    return await Allocation.create(values);
  } catch (err) {
    return clashError(err);
  }
}

export async function updateAllocation(user, studentId, values) {
  assertManager(user, PERM.HOSTEL);
  const current = await Allocation.findOne({ studentId });
  if (!current) throw new ApiError(404, "This student does not have a room");
  await validate({ ...values, studentId }, studentId);
  try {
    Object.assign(current, values, { studentId });
    return await current.save();
  } catch (err) {
    return clashError(err);
  }
}

export async function vacateRoom(user, studentId) {
  assertManager(user, PERM.HOSTEL);
  const result = await Allocation.deleteOne({ studentId });
  if (result.deletedCount === 0) throw new ApiError(404, "This student does not have a room");
}
