import { PERM, can, canManage, hasFullAccess } from "../../config/permissions";
import { hostels, residents, students, getStudent, getResident, persist } from "../../utils/demoData";

export const MESS_PLANS = ["Veg", "Non-Veg"];
export const FEE_STATUSES = ["Paid", "Partial", "Pending"];

function assertManager(user) {
  if (!canManage(user?.role, PERM.HOSTEL)) throw new Error("You are not allowed to change hostel allocations");
}

// Everything about the hostels, for roles that manage them
export function getHostelOverview(user) {
  if (!can(user?.role, PERM.HOSTEL) || !hasFullAccess(user.role)) return null;
  const rows = residents.map((r) => ({
    ...r,
    student: getStudent(r.studentId),
    hostel: hostels.find((h) => h.id === r.hostelId),
  }));
  const cards = hostels.map((h) => {
    const occupied = residents.filter((r) => r.hostelId === h.id).length;
    return { ...h, occupied, occupancy: Math.round((occupied / h.capacity) * 100) };
  });
  return { hostels: cards, residents: rows };
}

// A student's own hostel details (resident: false when they live at home)
export function getMyHostel(user) {
  if (user?.role !== "student" || !can(user.role, PERM.HOSTEL)) return null;
  const mine = getResident(user.id);
  if (!mine) return { resident: false };
  const hostel = hostels.find((h) => h.id === mine.hostelId);
  const roommates = residents
    .filter((r) => r.hostelId === mine.hostelId && r.room === mine.room && r.studentId !== user.id)
    .map((r) => getStudent(r.studentId));
  return { resident: true, hostel, ...mine, roommates };
}

// Students who do not have a room yet
export function listAllocatableStudents(user) {
  assertManager(user);
  return students
    .filter((s) => !getResident(s.id))
    .map(({ id, name, enrollmentNo, gender, school }) => ({ id, name, enrollmentNo, gender, school }));
}

// The first free bed in a hostel, so the form can suggest one
export function suggestBed(user, hostelId) {
  assertManager(user);
  const hostel = hostels.find((h) => h.id === hostelId);
  if (!hostel) return null;
  for (let floor = 1; floor <= hostel.floors; floor += 1) {
    for (let n = 1; n <= hostel.roomsPerFloor; n += 1) {
      const room = String(floor * 100 + n);
      for (const bed of "ABC".slice(0, hostel.sharing)) {
        const taken = residents.some((r) => r.hostelId === hostelId && r.room === room && r.bed === bed);
        if (!taken) return { room, bed };
      }
    }
  }
  return null;
}

function validate(values, exceptStudentId) {
  const student = getStudent(values.studentId);
  if (!student) throw new Error("Choose a student");
  const hostel = hostels.find((h) => h.id === values.hostelId);
  if (!hostel) throw new Error("Choose a hostel");
  if ((hostel.type === "Boys") !== (student.gender === "M")) {
    throw new Error(`${hostel.name} is a ${hostel.type.toLowerCase()} hostel and cannot house ${student.name}`);
  }

  const number = Number(values.room);
  const floor = Math.floor(number / 100);
  const inFloor = number % 100;
  if (!/^\d{3}$/.test(values.room) || floor < 1 || floor > hostel.floors || inFloor < 1 || inFloor > hostel.roomsPerFloor) {
    throw new Error(`${hostel.name} has rooms ${101} to ${hostel.floors * 100 + hostel.roomsPerFloor}, ${hostel.roomsPerFloor} per floor`);
  }
  if (!"ABC".slice(0, hostel.sharing).includes(values.bed)) throw new Error("Choose a valid bed");

  const holder = residents.find(
    (r) => r.hostelId === hostel.id && r.room === values.room && r.bed === values.bed && r.studentId !== exceptStudentId
  );
  if (holder) {
    throw new Error(`Room ${values.room}, bed ${values.bed} is already taken by ${getStudent(holder.studentId)?.name}`);
  }
}

const record = (values) => ({
  studentId: values.studentId,
  hostelId: values.hostelId,
  room: values.room,
  bed: values.bed,
  mess: values.mess,
  feeStatus: values.feeStatus,
  checkIn: values.checkIn,
});

export function allocateRoom(user, values) {
  assertManager(user);
  if (getResident(values.studentId)) throw new Error("This student already has a room");
  validate(values);
  residents.push(record(values));
  getStudent(values.studentId).hostelResident = true;
  persist();
}

export function updateAllocation(user, studentId, values) {
  assertManager(user);
  const current = getResident(studentId);
  if (!current) throw new Error("This student does not have a room");
  validate({ ...values, studentId }, studentId);
  Object.assign(current, record({ ...values, studentId }));
  persist();
}

export function vacateRoom(user, studentId) {
  assertManager(user);
  const index = residents.findIndex((r) => r.studentId === studentId);
  if (index === -1) throw new Error("This student does not have a room");
  residents.splice(index, 1);
  const student = getStudent(studentId);
  if (student) student.hostelResident = false;
  persist();
}
