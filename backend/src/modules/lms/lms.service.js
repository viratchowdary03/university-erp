import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import { PERM, hasPermission } from "../../utils/permissions.js";
import { visibleSchool } from "../../utils/access.js";
import { Course } from "./course.model.js";
import { School } from "../academic/department.model.js";
import { Subject } from "../academic/subject.model.js";
import { Faculty } from "../faculty/faculty.model.js";
import { Student } from "../students/student.model.js";
import { hasFullAccess } from "../../utils/permissions.js";
import { Material } from "./material.model.js";
import { Assignment } from "./assignment.model.js";
import { Submission } from "./submission.model.js";
import { Quiz } from "./quiz.model.js";
import { QuizAttempt } from "./quizAttempt.model.js";
import { notify } from "../notifications/notifications.service.js";

export async function listCourses(user, requestedSchool) {
  if (!hasPermission(user.role, PERM.LMS)) throw new ApiError(403, "You do not have access to courses");
  const scope = visibleSchool(user);
  const school = scope === null ? requestedSchool || "" : scope; // "" means every school

  const myStudent = user.role === ROLES.STUDENT ? await Student.findOne({ userId: user._id }) : null;
  const [courses, subjects, schools, people, enrolled, me] = await Promise.all([
    Course.find(school ? { school } : {}).sort({ code: 1 }),
    Subject.find(school ? { school } : {}),
    School.find(),
    Faculty.find().select("name"),
    Student.aggregate([{ $group: { _id: "$school", n: { $sum: 1 } } }]),
    user.role === ROLES.FACULTY ? Faculty.findOne({ userId: user._id }) : null,
  ]);
  const teacherOf = new Map(subjects.map((s) => [s.code, s.facultyId ? String(s.facultyId) : null]));
  const schoolName = new Map(schools.map((s) => [s.code, s.name]));
  const personName = new Map(people.map((p) => [String(p._id), p.name]));
  const enrolledIn = new Map(enrolled.map((e) => [e._id, e.n]));

  const progressOf = await progressFor(myStudent, courses.map((c) => c.code));
  return {
    school,
    courses: courses.map((c) => {
      const facultyId = teacherOf.get(c.code);
      return {
        ...c.toJSON(),
        schoolName: schoolName.get(c.school),
        facultyId,
        facultyName: facultyId ? personName.get(facultyId) : "Unassigned",
        enrolled: enrolledIn.get(c.school) || 0,
        teaching: Boolean(me && facultyId === String(me._id)),
        progress: progressOf.get(c.code) ?? null,
      };
    }),
  };
}

// Assignments due soon that this student has not handed in yet, nearest first
export async function listUpcomingAssignments(user, limit = 4) {
  if (user.role !== ROLES.STUDENT) return [];
  const student = await Student.findOne({ userId: user._id });
  if (!student) return [];
  const [assignments, courses, done] = await Promise.all([
    Assignment.find({ school: user.school, dueDate: { $gte: new Date(Date.now() - 86400000) } }).sort({ dueDate: 1 }).limit(30),
    Course.find({ school: user.school }).select("code name"),
    Submission.find({ studentId: student._id }).select("assignmentId"),
  ]);
  const doneSet = new Set(done.map((d) => String(d.assignmentId)));
  const nameBy = new Map(courses.map((c) => [c.code, c.name]));
  return assignments
    .filter((a) => !doneSet.has(String(a._id)))
    .slice(0, limit)
    .map((a) => ({ id: String(a._id), title: a.title, course: nameBy.get(a.courseCode) || a.courseCode, due: a.dueDate }));
}

// Share of a course's assignments and quizzes the student has completed (null when there is nothing to do yet)
async function progressFor(student, codes) {
  const map = new Map();
  if (!student || !codes.length) return map;
  const [assignments, quizzes] = await Promise.all([
    Assignment.find({ courseCode: { $in: codes }, school: student.school }).select("_id courseCode"),
    Quiz.find({ courseCode: { $in: codes }, school: student.school }).select("_id courseCode"),
  ]);
  const [subs, attempts] = await Promise.all([
    Submission.find({ studentId: student._id, assignmentId: { $in: assignments.map((a) => a._id) } }).select("assignmentId"),
    QuizAttempt.find({ studentId: student._id, quizId: { $in: quizzes.map((q) => q._id) } }).select("quizId"),
  ]);
  const doneA = new Set(subs.map((x) => String(x.assignmentId)));
  const doneQ = new Set(attempts.map((x) => String(x.quizId)));
  for (const code of codes) {
    const a = assignments.filter((x) => x.courseCode === code);
    const q = quizzes.filter((x) => x.courseCode === code);
    const total = a.length + q.length;
    if (!total) continue;
    const done = a.filter((x) => doneA.has(String(x._id))).length + q.filter((x) => doneQ.has(String(x._id))).length;
    map.set(code, Math.round((done / total) * 100));
  }
  return map;
}

// ---------- one course ----------
async function loadCourse(user, code) {
  if (!hasPermission(user.role, PERM.LMS)) throw new ApiError(403, "You do not have access to courses");
  const course = await Course.findOne({ code: String(code).toUpperCase() });
  const scope = visibleSchool(user);
  if (!course || (scope !== null && course.school !== scope)) throw new ApiError(404, "Course not found");
  return course;
}

// Can this person add and grade work in this course? Teachers of the subject, the head of school, full-access roles.
async function canTeach(user, course) {
  if (hasFullAccess(user.role)) return true;
  if (user.role === ROLES.HOD) return user.school === course.school;
  if (user.role !== ROLES.FACULTY) return false;
  const [me, subject] = await Promise.all([Faculty.findOne({ userId: user._id }), Subject.findOne({ code: course.code })]);
  return Boolean(me && subject && String(subject.facultyId) === String(me._id));
}

async function assertTeacher(user, code) {
  const course = await loadCourse(user, code);
  if (!(await canTeach(user, course))) throw new ApiError(403, "Only the teacher of this course can do this");
  return course;
}

export async function getCourse(user, code) {
  const course = await loadCourse(user, code);
  const teacher = await canTeach(user, course);
  const student = user.role === ROLES.STUDENT ? await Student.findOne({ userId: user._id }) : null;
  const [subject, materials, assignments, quizzes] = await Promise.all([
    Subject.findOne({ code: course.code }),
    Material.find({ courseCode: course.code }).sort({ unit: 1, createdAt: -1 }),
    Assignment.find({ courseCode: course.code }).sort({ dueDate: 1 }),
    Quiz.find({ courseCode: course.code }).sort({ createdAt: -1 }),
  ]);
  const teacherDoc = subject?.facultyId ? await Faculty.findById(subject.facultyId).select("name") : null;
  const [subs, attempts, subCounts] = await Promise.all([
    student ? Submission.find({ studentId: student._id, assignmentId: { $in: assignments.map((a) => a._id) } }) : [],
    student ? QuizAttempt.find({ studentId: student._id, quizId: { $in: quizzes.map((q) => q._id) } }) : [],
    teacher ? Submission.aggregate([{ $match: { assignmentId: { $in: assignments.map((a) => a._id) } } }, { $group: { _id: "$assignmentId", n: { $sum: 1 } } }]) : [],
  ]);
  const subBy = new Map(subs.map((s) => [String(s.assignmentId), s]));
  const attemptBy = new Map(attempts.map((a) => [String(a.quizId), a]));
  const countBy = new Map(subCounts.map((c) => [String(c._id), c.n]));
  const attemptCounts = teacher ? await QuizAttempt.aggregate([{ $match: { quizId: { $in: quizzes.map((q) => q._id) } } }, { $group: { _id: "$quizId", n: { $sum: 1 } } }]) : [];
  const attemptCountBy = new Map(attemptCounts.map((c) => [String(c._id), c.n]));

  return {
    course: { ...course.toJSON(), facultyName: teacherDoc?.name || "Unassigned" },
    canTeach: teacher,
    materials: materials.map((m) => m.toJSON()),
    assignments: assignments.map((a) => ({
      ...a.toJSON(), overdue: a.dueDate < new Date(),
      submissions: teacher ? countBy.get(String(a._id)) || 0 : undefined,
      mine: subBy.get(String(a._id))?.toJSON(),
    })),
    quizzes: quizzes.map((q) => ({
      id: String(q._id), title: q.title, durationMin: q.durationMin, questionCount: q.questions.length,
      attempts: teacher ? attemptCountBy.get(String(q._id)) || 0 : undefined,
      mine: attemptBy.get(String(q._id))?.toJSON(),
    })),
  };
}

// ---------- materials ----------
export async function addMaterial(user, code, values) {
  const course = await assertTeacher(user, code);
  const material = await Material.create({ ...values, url: values.url || undefined, courseCode: course.code, school: course.school, postedBy: user._id, postedByName: user.name });
  await Course.updateOne({ _id: course._id }, { $inc: { materials: 1 } });
  return material;
}

export async function deleteMaterial(user, id) {
  const material = await Material.findById(id);
  if (!material) throw new ApiError(404, "Material not found");
  await assertTeacher(user, material.courseCode);
  await material.deleteOne();
  await Course.updateOne({ code: material.courseCode, materials: { $gt: 0 } }, { $inc: { materials: -1 } });
}

// ---------- assignments ----------
export async function addAssignment(user, code, values) {
  const course = await assertTeacher(user, code);
  const assignment = await Assignment.create({ ...values, courseCode: course.code, school: course.school, postedBy: user._id });
  const students = await Student.find({ school: course.school, userId: { $ne: null } }).select("userId");
  notify(students.map((s) => s.userId), { title: `New assignment in ${course.name}`, message: assignment.title, link: `/lms/${course.code}` });
  return assignment;
}

export async function deleteAssignment(user, id) {
  const assignment = await Assignment.findById(id);
  if (!assignment) throw new ApiError(404, "Assignment not found");
  await assertTeacher(user, assignment.courseCode);
  await Promise.all([Submission.deleteMany({ assignmentId: assignment._id }), assignment.deleteOne()]);
}

export async function submit(user, id, { text, link }) {
  if (user.role !== ROLES.STUDENT) throw new ApiError(403, "Only students can submit work");
  const [assignment, student] = await Promise.all([Assignment.findById(id), Student.findOne({ userId: user._id })]);
  if (!student) throw new ApiError(404, "Your student record has not been created yet");
  if (!assignment || assignment.school !== student.school) throw new ApiError(404, "Assignment not found");
  const late = new Date() > assignment.dueDate;
  const existing = await Submission.findOne({ assignmentId: id, studentId: student._id });
  if (existing?.marks !== undefined && existing?.marks !== null) throw new ApiError(409, "This work has already been graded");
  if (existing) {
    Object.assign(existing, { text: text || undefined, link: link || undefined, late });
    await existing.save();
    return existing;
  }
  return Submission.create({ assignmentId: id, studentId: student._id, text: text || undefined, link: link || undefined, late });
}

export async function listSubmissions(user, id) {
  const assignment = await Assignment.findById(id);
  if (!assignment) throw new ApiError(404, "Assignment not found");
  await assertTeacher(user, assignment.courseCode);
  const [subs, roster] = await Promise.all([Submission.find({ assignmentId: id }), Student.find({ school: assignment.school }).sort({ enrollmentNo: 1 })]);
  const by = new Map(subs.map((s) => [String(s.studentId), s]));
  return {
    assignment: assignment.toJSON(),
    rows: roster.map((st) => ({ studentId: String(st._id), name: st.name, enrollmentNo: st.enrollmentNo, submission: by.get(String(st._id))?.toJSON() || null })),
  };
}

export async function gradeSubmission(user, id, { marks, feedback }) {
  const sub = await Submission.findById(id);
  if (!sub) throw new ApiError(404, "Submission not found");
  const assignment = await Assignment.findById(sub.assignmentId);
  await assertTeacher(user, assignment.courseCode);
  if (marks > assignment.marks) throw new ApiError(400, `Marks cannot be more than ${assignment.marks}`);
  Object.assign(sub, { marks, feedback: feedback || undefined, gradedBy: user._id });
  await sub.save();
  const student = await Student.findById(sub.studentId);
  if (student?.userId) notify(student.userId, { title: "Assignment graded", message: `${assignment.title}: ${marks}/${assignment.marks}`, link: `/lms/${assignment.courseCode}`, type: "success" });
  return sub;
}

// ---------- quizzes ----------
export async function addQuiz(user, code, values) {
  const course = await assertTeacher(user, code);
  return Quiz.create({ ...values, courseCode: course.code, school: course.school, postedBy: user._id });
}

export async function deleteQuiz(user, id) {
  const quiz = await Quiz.findById(id);
  if (!quiz) throw new ApiError(404, "Quiz not found");
  await assertTeacher(user, quiz.courseCode);
  await Promise.all([QuizAttempt.deleteMany({ quizId: quiz._id }), quiz.deleteOne()]);
}

// Students get the questions WITHOUT the right answers. Teachers get everything.
export async function getQuiz(user, id) {
  const quiz = await Quiz.findById(id);
  if (!quiz) throw new ApiError(404, "Quiz not found");
  const course = await loadCourse(user, quiz.courseCode);
  const teacher = await canTeach(user, course);
  const student = user.role === ROLES.STUDENT ? await Student.findOne({ userId: user._id }) : null;
  const attempt = student ? await QuizAttempt.findOne({ quizId: id, studentId: student._id }) : null;
  const base = { id: String(quiz._id), title: quiz.title, durationMin: quiz.durationMin, courseCode: quiz.courseCode };
  if (teacher) return { ...base, questions: quiz.questions.map((q) => q.toObject ? q.toObject() : q) };
  if (attempt) {
    // after attempting, show the answers so the student can learn from them
    return { ...base, questions: quiz.questions.map((q) => ({ text: q.text, options: q.options, correct: q.correct })), attempt: attempt.toJSON() };
  }
  return { ...base, questions: quiz.questions.map((q) => ({ text: q.text, options: q.options })) };
}

export async function attemptQuiz(user, id, answers) {
  if (user.role !== ROLES.STUDENT) throw new ApiError(403, "Only students can attempt quizzes");
  const [quiz, student] = await Promise.all([Quiz.findById(id), Student.findOne({ userId: user._id })]);
  if (!student) throw new ApiError(404, "Your student record has not been created yet");
  if (!quiz || quiz.school !== student.school) throw new ApiError(404, "Quiz not found");
  if (answers.length !== quiz.questions.length) throw new ApiError(400, "Answer every question (leave a question blank by choosing none)");
  const score = quiz.questions.reduce((n, q, i) => n + (answers[i] === q.correct ? 1 : 0), 0);
  try {
    return await QuizAttempt.create({ quizId: id, studentId: student._id, answers, score, total: quiz.questions.length });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, "You have already attempted this quiz");
    throw err;
  }
}

export async function listAttempts(user, id) {
  const quiz = await Quiz.findById(id);
  if (!quiz) throw new ApiError(404, "Quiz not found");
  await assertTeacher(user, quiz.courseCode);
  const attempts = await QuizAttempt.find({ quizId: id }).sort({ score: -1 });
  const students = await Student.find({ _id: { $in: attempts.map((a) => a.studentId) } }).select("name enrollmentNo");
  const by = new Map(students.map((s) => [String(s._id), s]));
  return { quiz: { id: String(quiz._id), title: quiz.title }, attempts: attempts.map((a) => ({ ...a.toJSON(), name: by.get(String(a.studentId))?.name, enrollmentNo: by.get(String(a.studentId))?.enrollmentNo })) };
}

