import { ApiError } from "../../utils/ApiError.js";
import { PERM, hasPermission } from "../../utils/permissions.js";
import { visibleSchool, assertManager } from "../../utils/access.js";
import { pad } from "../../utils/helpers.js";
import { Faculty } from "./faculty.model.js";
import { Student } from "../students/student.model.js";
import { School } from "../academic/department.model.js";
import { Subject } from "../academic/subject.model.js";
import { User } from "../users/user.model.js";

async function assertEmailFree(email, exceptFacultyId) {
  const [student, teacher] = await Promise.all([Student.findOne({ email }), Faculty.findOne({ email })]);
  if (student || (teacher && String(teacher._id) !== String(exceptFacultyId))) {
    throw new ApiError(409, "Someone with this email already exists");
  }
}

async function nextEmployeeId(school) {
  const last = await Faculty.findOne({ school, employeeId: new RegExp(`^VCUF${school}\\d+$`) }).sort({ employeeId: -1 });
  const n = last ? Number(last.employeeId.replace(`VCUF${school}`, "")) + 1 : 1;
  return `VCUF${school}${pad(n, 2)}`;
}

// Gives this teacher exactly the chosen subjects of their school. A subject that was taught by someone
// else moves to this teacher; one that is un-ticked becomes unassigned.
async function assignSubjects(teacher, codes) {
  const schoolSubjects = await Subject.find({ school: teacher.school });
  const valid = new Set(schoolSubjects.map((s) => s.code));
  if (codes.some((c) => !valid.has(c))) throw new ApiError(400, "A chosen subject does not belong to this school");
  await Subject.updateMany({ school: teacher.school, code: { $in: codes } }, { facultyId: teacher._id });
  await Subject.updateMany({ school: teacher.school, facultyId: teacher._id, code: { $nin: codes } }, { facultyId: null });
}

export async function listFaculty(user) {
  if (!hasPermission(user.role, PERM.FACULTY)) return [];
  const scope = visibleSchool(user);
  const filter = scope === null ? {} : { school: scope };
  const [people, subjects] = await Promise.all([
    Faculty.find(filter).sort({ school: 1, employeeId: 1 }),
    Subject.find(scope === null ? {} : { school: scope }).sort({ code: 1 }),
  ]);
  return people.map((f) => ({
    ...f.toJSON(),
    subjects: subjects.filter((s) => String(s.facultyId) === String(f._id)).map((s) => s.toJSON()),
  }));
}

// Called when a faculty or head-of-school registration is approved
export async function createFromRegistration(user, { asHod }) {
  if (await Faculty.findOne({ userId: user._id })) return;
  const p = user.profile || {};
  await assertEmailFree(user.email);
  if (p.employeeId && (await Faculty.findOne({ employeeId: p.employeeId }))) {
    throw new ApiError(409, `Employee ID ${p.employeeId} is already used by someone else`);
  }
  if (asHod && (await Faculty.findOne({ school: user.school, isHod: true }))) {
    throw new ApiError(409, "This school already has a head. Ask a Super Admin to change it first");
  }
  await Faculty.create({
    userId: user._id,
    employeeId: p.employeeId || (await nextEmployeeId(user.school)),
    name: user.name,
    gender: p.gender,
    email: user.email,
    phone: user.phone,
    school: user.school,
    department: user.department,
    designation: asHod ? "Head of School" : p.designation,
    qualification: p.qualification,
    experienceYears: Number(p.experienceYears) || 0,
    isHod: asHod,
  });
}

export async function createFaculty(user, values) {
  assertManager(user, PERM.FACULTY);
  const school = await School.findOne({ code: values.school });
  if (!school) throw new ApiError(400, "Choose a valid school");
  if (!school.programs.includes(values.department)) throw new ApiError(400, "That program does not belong to this school");
  const email = values.email.trim().toLowerCase();
  await assertEmailFree(email);

  const { subjectCodes = [], ...data } = values;
  let teacher;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      teacher = await Faculty.create({ ...data, email, employeeId: await nextEmployeeId(data.school), isHod: false });
      break;
    } catch (err) {
      if (err.code !== 11000 || attempt === 2) throw err;
    }
  }
  await assignSubjects(teacher, subjectCodes);
  return teacher;
}

export async function updateFaculty(user, id, values) {
  assertManager(user, PERM.FACULTY);
  const teacher = await Faculty.findById(id);
  if (!teacher) throw new ApiError(404, "Faculty member not found");
  const school = await School.findOne({ code: teacher.school });
  if (!school?.programs.includes(values.department)) throw new ApiError(400, "That program does not belong to this school");
  const email = values.email.trim().toLowerCase();
  await assertEmailFree(email, teacher._id);

  const { subjectCodes = [], school: ignoredSchool, ...editable } = values; // eslint-disable-line no-unused-vars
  Object.assign(teacher, editable, { email });
  await teacher.save();
  await assignSubjects(teacher, subjectCodes);
  return teacher;
}

export async function deleteFaculty(user, id) {
  assertManager(user, PERM.FACULTY);
  const teacher = await Faculty.findById(id);
  if (!teacher) throw new ApiError(404, "Faculty member not found");
  if (teacher.isHod) throw new ApiError(409, "This person is the head of their school. Appoint another head first");
  await Promise.all([
    Subject.updateMany({ facultyId: teacher._id }, { facultyId: null }),
    teacher.userId ? User.updateOne({ _id: teacher.userId }, { status: "suspended" }) : null,
  ]);
  await teacher.deleteOne();
}
