import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import { PERM } from "../../utils/permissions.js";
import { assertManager } from "../../utils/access.js";
import { Student } from "../students/student.model.js";
import { Vehicle } from "./vehicle.model.js";
import { TransportRoute } from "./route.model.js";
import { TransportAllocation } from "./transportAllocation.model.js";

const todayIso = () => new Date().toISOString().slice(0, 10);

export async function getOverview() {
  const [vehicles, routes, allocations] = await Promise.all([
    Vehicle.find().sort({ number: 1 }),
    TransportRoute.find().sort({ name: 1 }),
    TransportAllocation.find(),
  ]);
  const vehicleBy = new Map(vehicles.map((v) => [String(v._id), v]));
  const students = await Student.find({ _id: { $in: allocations.map((a) => a.studentId) } }).select("name enrollmentNo school");
  const studentBy = new Map(students.map((s) => [String(s._id), s]));
  return {
    vehicles: vehicles.map((v) => v.toJSON()),
    routes: routes.map((r) => {
      const seats = allocations.filter((a) => String(a.routeId) === String(r._id));
      const vehicle = vehicleBy.get(String(r.vehicleId));
      return { ...r.toJSON(), vehicle: vehicle?.toJSON(), occupied: seats.length, capacity: vehicle?.capacity || 0 };
    }),
    riders: allocations.map((a) => ({
      ...a.toJSON(),
      studentName: studentBy.get(String(a.studentId))?.name,
      enrollmentNo: studentBy.get(String(a.studentId))?.enrollmentNo,
    })),
  };
}

export async function getMyTransport(user) {
  if (user.role !== ROLES.STUDENT) throw new ApiError(403, "Only students have a personal transport page");
  const student = await Student.findOne({ userId: user._id });
  const mine = student && (await TransportAllocation.findOne({ studentId: student._id }));
  if (!mine) return { rider: false };
  const route = await TransportRoute.findById(mine.routeId);
  const vehicle = route && (await Vehicle.findById(route.vehicleId));
  return { rider: true, stop: mine.stop, since: mine.since, route: route?.toJSON(), vehicle: vehicle?.toJSON() };
}

// ---------- vehicles ----------
export async function createVehicle(user, values) {
  assertManager(user, PERM.TRANSPORT);
  return Vehicle.create(values);
}
export async function updateVehicle(user, id, values) {
  assertManager(user, PERM.TRANSPORT);
  const vehicle = await Vehicle.findById(id);
  if (!vehicle) throw new ApiError(404, "Vehicle not found");
  const routes = await TransportRoute.find({ vehicleId: vehicle._id }).select("_id");
  const riders = await TransportAllocation.countDocuments({ routeId: { $in: routes.map((r) => r._id) } });
  if (values.capacity < riders) throw new ApiError(409, `${riders} students already ride this vehicle`);
  Object.assign(vehicle, values);
  await vehicle.save();
  return vehicle;
}
export async function deleteVehicle(user, id) {
  assertManager(user, PERM.TRANSPORT);
  if (await TransportRoute.exists({ vehicleId: id })) throw new ApiError(409, "A route uses this vehicle");
  const vehicle = await Vehicle.findByIdAndDelete(id);
  if (!vehicle) throw new ApiError(404, "Vehicle not found");
}

// ---------- routes ----------
async function checkRoute(values) {
  const vehicle = await Vehicle.findById(values.vehicleId);
  if (!vehicle) throw new ApiError(400, "Choose a vehicle");
  return vehicle;
}
export async function createRoute(user, values) {
  assertManager(user, PERM.TRANSPORT);
  await checkRoute(values);
  return TransportRoute.create(values);
}
export async function updateRoute(user, id, values) {
  assertManager(user, PERM.TRANSPORT);
  const route = await TransportRoute.findById(id);
  if (!route) throw new ApiError(404, "Route not found");
  const vehicle = await checkRoute(values);
  const riders = await TransportAllocation.find({ routeId: route._id });
  if (riders.length > vehicle.capacity) throw new ApiError(409, "This vehicle has fewer seats than students on the route");
  const stops = new Set(values.stops.map((s) => s.name));
  if (riders.some((r) => !stops.has(r.stop))) throw new ApiError(409, "A student boards at a stop you removed");
  Object.assign(route, values);
  await route.save();
  return route;
}
export async function deleteRoute(user, id) {
  assertManager(user, PERM.TRANSPORT);
  if (await TransportAllocation.exists({ routeId: id })) throw new ApiError(409, "Students are assigned to this route");
  const route = await TransportRoute.findByIdAndDelete(id);
  if (!route) throw new ApiError(404, "Route not found");
}

// ---------- allocations ----------
export async function listAllocatable(user) {
  assertManager(user, PERM.TRANSPORT);
  const taken = await TransportAllocation.distinct("studentId");
  const students = await Student.find({ _id: { $nin: taken } }).sort({ enrollmentNo: 1 }).limit(500);
  return students.map((s) => ({ id: String(s._id), name: s.name, enrollmentNo: s.enrollmentNo, school: s.school }));
}

export async function allocate(user, { studentId, routeId, stop }) {
  assertManager(user, PERM.TRANSPORT);
  const [student, route] = await Promise.all([Student.findById(studentId), TransportRoute.findById(routeId)]);
  if (!student) throw new ApiError(404, "Student not found");
  if (!route) throw new ApiError(404, "Route not found");
  if (!route.stops.some((s) => s.name === stop)) throw new ApiError(400, "Choose a stop on this route");
  const vehicle = await Vehicle.findById(route.vehicleId);
  const taken = await TransportAllocation.countDocuments({ routeId: route._id });
  const existing = await TransportAllocation.findOne({ studentId });
  const sameRoute = existing && String(existing.routeId) === String(route._id);
  if (!sameRoute && taken >= (vehicle?.capacity || 0)) throw new ApiError(409, "This route is full");
  if (existing) {
    Object.assign(existing, { routeId: route._id, stop });
    await existing.save();
    return existing;
  }
  return TransportAllocation.create({ studentId, routeId, stop, since: todayIso() });
}

export async function release(user, studentId) {
  assertManager(user, PERM.TRANSPORT);
  const gone = await TransportAllocation.findOneAndDelete({ studentId });
  if (!gone) throw new ApiError(404, "This student does not use the bus");
}
