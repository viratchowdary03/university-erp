import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import { hasFullAccess } from "../../utils/permissions.js";
import { visibleSchool } from "../../utils/access.js";
import { notify } from "../notifications/notifications.service.js";
import { Subject } from "../academic/subject.model.js";
import { Student } from "../students/student.model.js";
import { Faculty } from "../faculty/faculty.model.js";
import { Exam } from "./exam.model.js";
import { Mark } from "./mark.model.js";
import { refreshCgpa } from "../results/results.service.js";

const MANAGER_ROLES = [ROLES.SUPER_ADMIN, ROLES.REGISTRAR, ROLES.ADMIN, ROLES.HOD, ROLES.FACULTY];

// Can this person set up exams and enter marks for this subject?
async function canManageSubject(user, subject) {
  if (!MANAGER_ROLES.includes(user.role)) return false;
  if (hasFullAccess(user.role)) return true;
  if (user.school !== subject.school) return false;
  if (user.role === ROLES.HOD) return true;
  const me = await Faculty.findOne({ userId: user._id });
  return Boolean(me && String(subject.facultyId) === String(me._id));
}

async function loadManageable(user, id) {
  const exam = await Exam.findById(id);
  const scope = visibleSchool(user);
  if (!exam || (scope !== null && exam.school !== scope)) throw new ApiError(404, "Exam not found");
  const subject = await Subject.findOne({ school: exam.school, code: exam.subjectCode });
  if (!subject || !(await canManageSubject(user, subject))) throw new ApiError(403, "You can only manage exams of your own subjects");
  return { exam, subject };
}

export async function listExams(user, query = {}) {
  const scope = visibleSchool(user);
  const school = scope === null ? query.school || "" : scope;
  const exams = await Exam.find(school ? { school } : {}).sort({ date: -1 }).limit(500);
  const subjects = await Subject.find(school ? { school } : {});
  const subjectBy = new Map(subjects.map((s) => [`${s.school}|${s.code}`, s]));

  let myMarks = new Map();
  let myFaculty = null;
  if (user.role === ROLES.STUDENT) {
    const student = await Student.findOne({ userId: user._id });
    if (student) {
      const marks = await Mark.find({ studentId: student._id, examId: { $in: exams.map((e) => e._id) } });
      myMarks = new Map(marks.map((m) => [String(m.examId), m]));
    }
  } else if (user.role === ROLES.FACULTY) {
    myFaculty = await Faculty.findOne({ userId: user._id });
  }

  return exams.map((e) => {
    const subject = subjectBy.get(`${e.school}|${e.subjectCode}`);
    const mark = myMarks.get(String(e._id));
    const manageable = hasFullAccess(user.role) || (user.role === ROLES.HOD && user.school === e.school) ||
      (myFaculty && subject && String(subject.facultyId) === String(myFaculty._id));
    return {
      ...e.toJSON(),
      subjectName: subject?.name || e.subjectCode,
      manageable: Boolean(manageable),
      // a student sees their own marks only once the exam is published
      myMarks: user.role === ROLES.STUDENT && e.published && mark ? { marks: mark.marks, absent: mark.absent } : undefined,
    };
  });
}

export async function createExam(user, values) {
  const scope = visibleSchool(user);
  const subject = await Subject.findOne({ code: values.subjectCode, ...(scope === null ? {} : { school: scope }) });
  if (!subject) throw new ApiError(400, "Choose a subject of your school");
  if (!(await canManageSubject(user, subject))) throw new ApiError(403, "You can only set exams for your own subjects");
  return Exam.create({ ...values, school: subject.school, createdBy: user._id });
}

export async function updateExam(user, id, values) {
  const { exam } = await loadManageable(user, id);
  if (exam.published) throw new ApiError(409, "Unpublish the exam before changing it");
  const { name, type, date, startTime, venue, maxMarks } = values;
  const biggest = await Mark.findOne({ examId: exam._id, marks: { $gt: maxMarks } });
  if (biggest) throw new ApiError(409, "Some entered marks are higher than this maximum");
  Object.assign(exam, { name, type, date, startTime, venue, maxMarks });
  await exam.save();
  return exam;
}

export async function deleteExam(user, id) {
  const { exam } = await loadManageable(user, id);
  if (exam.published) throw new ApiError(409, "Unpublish the exam before deleting it");
  await Promise.all([Mark.deleteMany({ examId: exam._id }), exam.deleteOne()]);
}

// Every student of the school with the mark entered so far
export async function getMarkSheet(user, id) {
  const { exam, subject } = await loadManageable(user, id);
  const [roster, marks] = await Promise.all([
    Student.find({ school: exam.school }).sort({ enrollmentNo: 1 }),
    Mark.find({ examId: exam._id }),
  ]);
  const byStudent = new Map(marks.map((m) => [String(m.studentId), m]));
  return {
    exam: { ...exam.toJSON(), subjectName: subject.name },
    rows: roster.map((s) => {
      const m = byStudent.get(String(s._id));
      return { studentId: String(s._id), enrollmentNo: s.enrollmentNo, name: s.name, section: s.section, marks: m?.marks ?? null, absent: Boolean(m?.absent) };
    }),
  };
}

export async function saveMarks(user, id, entries) {
  const { exam } = await loadManageable(user, id);
  if (exam.published) throw new ApiError(409, "Marks are published. Unpublish the exam to change them");
  const roster = new Set((await Student.find({ school: exam.school }).select("_id")).map((s) => String(s._id)));
  for (const e of entries) {
    if (!roster.has(e.studentId)) throw new ApiError(400, "A student in the list does not belong to this school");
    if (!e.absent && e.marks !== null && e.marks !== undefined && e.marks > exam.maxMarks) {
      throw new ApiError(400, `Marks cannot be more than ${exam.maxMarks}`);
    }
  }
  await Mark.bulkWrite(
    entries.map((e) => ({
      updateOne: {
        filter: { examId: exam._id, studentId: e.studentId },
        update: { $set: { marks: e.absent ? null : e.marks ?? null, absent: Boolean(e.absent), enteredBy: user._id } },
        upsert: true,
      },
    }))
  );
  return { saved: entries.length };
}

export async function setPublished(user, id, published) {
  const { exam } = await loadManageable(user, id);
  if (published) {
    const entered = await Mark.countDocuments({ examId: exam._id });
    if (!entered) throw new ApiError(409, "Enter marks before publishing");
  }
  exam.published = published;
  await exam.save();
  await refreshCgpa(exam.school); // CGPA depends on what is published
  if (published) {
    const students = await Student.find({ school: exam.school, userId: { $ne: null } }).select("userId");
    notify(students.map((s) => s.userId), { title: "Results published", message: `${exam.name} (${exam.subjectCode}) marks are out.`, link: "/results", type: "success" });
  }
  return exam;
}
