// Grades on a 10-point scale. A subject is passed from 40% upwards.
export const PASS_PERCENT = 40;

const BANDS = [
  { min: 90, grade: "O", points: 10 },
  { min: 80, grade: "A+", points: 9 },
  { min: 70, grade: "A", points: 8 },
  { min: 60, grade: "B+", points: 7 },
  { min: 50, grade: "B", points: 6 },
  { min: PASS_PERCENT, grade: "C", points: 5 },
  { min: 0, grade: "F", points: 0 },
];

export function gradeFor(percentage) {
  const p = Number.isFinite(percentage) ? percentage : 0;
  return BANDS.find((b) => p >= b.min);
}

const round = (n, digits = 2) => Number(n.toFixed(digits));

// exams: [{ marks, maxMarks }] for ONE subject. Marks that were not entered or are absent count as 0.
export function subjectResult(exams) {
  const max = exams.reduce((n, e) => n + e.maxMarks, 0);
  const got = exams.reduce((n, e) => n + (e.marks || 0), 0);
  const percentage = max ? round((got / max) * 100, 1) : 0;
  const { grade, points } = gradeFor(percentage);
  return { obtained: got, max, percentage, grade, points, passed: percentage >= PASS_PERCENT };
}

// subjects: [{ points, credits }] -> grade point average (null when there is nothing to average)
export function gradePointAverage(subjects) {
  const credits = subjects.reduce((n, s) => n + s.credits, 0);
  if (!credits) return null;
  return round(subjects.reduce((n, s) => n + s.points * s.credits, 0) / credits);
}
