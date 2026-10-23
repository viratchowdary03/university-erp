// Demo data for the university. It is generated the same way every time, so the app looks
// identical on every run. Replace it with real API calls when the backend modules are ready.
import { SCHOOLS } from "../config/schools";
import { ROLES } from "../config/roles";

// ---------- small deterministic random generator ----------
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seeded(2026);
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (list) => list[Math.floor(rand() * list.length)];
const pad = (n, width = 3) => String(n).padStart(width, "0");
const slug = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
const phone = () => `9${between(100000000, 999999999)}`;
const hash = (text) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const SEMESTER = 3;
export const BATCH = "2025-29";
export const PASS_MARK = 75; // minimum attendance percentage

const MALE = ["Aarav", "Vihaan", "Arjun", "Rohan", "Karthik", "Rahul", "Siddharth", "Aditya", "Manish", "Harsh", "Nikhil", "Yash", "Pranav", "Dev", "Ishaan", "Varun", "Tejas", "Kunal", "Ritvik", "Sai"];
const FEMALE = ["Ananya", "Diya", "Isha", "Kavya", "Meera", "Priya", "Riya", "Sneha", "Tanvi", "Aditi", "Neha", "Pooja", "Shruti", "Anjali", "Divya", "Nisha", "Pallavi", "Swati", "Lakshmi", "Bhavna"];
const LAST = ["Patel", "Shah", "Reddy", "Nair", "Sharma", "Mehta", "Desai", "Chowdary", "Iyer", "Rao", "Gupta", "Joshi", "Kulkarni", "Verma", "Singh", "Menon", "Bhat", "Pillai", "Naidu", "Trivedi"];
const GUARDIANS = ["Ramesh", "Suresh", "Mahesh", "Dinesh", "Anita", "Sunita", "Geeta", "Lalit", "Mukesh", "Vimala"];
const CITIES = ["Surat", "Ahmedabad", "Vadodara", "Rajkot", "Mumbai", "Pune", "Hyderabad", "Bengaluru", "Chennai", "Jaipur"];

// ---------- subjects: six per school, all Semester 3 ----------
const SUBJECT_NAMES = {
  ENG: ["Data Structures & Algorithms", "Engineering Mathematics III", "Digital Electronics", "Object Oriented Programming", "Engineering Mechanics", "Programming Lab"],
  NUR: ["Anatomy & Physiology", "Fundamentals of Nursing", "Microbiology", "Nutrition & Dietetics", "Community Health Nursing", "Clinical Skills Lab"],
  ARC: ["Architectural Design Studio III", "Building Materials & Construction", "History of Architecture", "Structural Systems", "Environmental Design", "Computer Aided Drafting Lab"],
  DES: ["Design Thinking", "Visual Communication", "Color Theory & Typography", "Ergonomics", "Digital Prototyping", "Design Studio Lab"],
  CHE: ["Chemical Process Calculations", "Organic Chemistry", "Fluid Mechanics", "Heat Transfer", "Chemical Thermodynamics", "Chemistry Lab"],
  PHA: ["Pharmaceutical Chemistry", "Pharmacology I", "Pharmaceutics", "Pharmacognosy", "Pathophysiology", "Pharmaceutical Analysis Lab"],
  MGT: ["Principles of Management", "Financial Accounting", "Marketing Management", "Business Statistics", "Organizational Behaviour", "Business Communication Lab"],
  LAW: ["Constitutional Law", "Law of Contracts", "Criminal Law", "Legal Methods", "Jurisprudence", "Moot Court Practice"],
  CAI: ["Python Programming", "Database Systems", "Machine Learning Fundamentals", "Discrete Mathematics", "Web Technologies", "AI Lab"],
  SCI: ["Classical Mechanics", "Linear Algebra", "Organic Chemistry Basics", "Cell Biology", "Statistics for Science", "Science Practical Lab"],
  AGR: ["Crop Physiology", "Soil Science", "Agricultural Economics", "Plant Pathology", "Irrigation Engineering", "Field Practice Lab"],
  HOS: ["Food & Beverage Service", "Front Office Operations", "Culinary Arts", "Tourism Geography", "Hospitality Law", "Kitchen Practical Lab"],
  HUM: ["Introduction to Sociology", "English Literature", "Psychology Basics", "Political Science", "Research Methods", "Communication Skills Lab"],
  EDU: ["Educational Psychology", "Pedagogy of Teaching", "Curriculum Development", "Educational Technology", "Assessment & Evaluation", "Teaching Practice Lab"],
};

export const subjects = SCHOOLS.flatMap((school) =>
  SUBJECT_NAMES[school.code].map((name, i) => ({
    code: `${school.code}${301 + i}`,
    name,
    school: school.code,
    type: i === 5 ? "Lab" : "Theory",
    credits: i === 5 ? 2 : 3 + (i % 2),
    semester: SEMESTER,
    facultyId: `F-${school.code}-${Math.floor(i / 2) + 1}`, // each teacher takes two subjects
  }))
);

// ---------- faculty: three per school, the first one is the head of school ----------
const DESIGNATIONS = ["Professor", "Associate Professor", "Assistant Professor"];
const QUALIFICATIONS = ["Ph.D.", "Ph.D.", "Master's degree"];

export const faculty = SCHOOLS.flatMap((school, s) =>
  [0, 1, 2].map((k) => {
    const gender = (s + k) % 2 === 0 ? "M" : "F";
    const first = (gender === "M" ? MALE : FEMALE)[(s * 3 + k + 5) % 20];
    const last = LAST[(s * 5 + k * 7 + 3) % 20];
    return {
      id: `F-${school.code}-${k + 1}`,
      employeeId: `VCUF${school.code}${pad(k + 1, 2)}`,
      name: `${k < 2 ? "Dr. " : ""}${first} ${last}`,
      gender,
      email: `${slug(first)}.${slug(last)}@vcu.edu`,
      phone: phone(),
      school: school.code,
      designation: DESIGNATIONS[k],
      qualification: QUALIFICATIONS[k],
      department: school.programs[k % school.programs.length],
      experienceYears: [18, 11, 6][k],
      isHod: k === 0,
      subjectCodes: subjects.filter((x) => x.school === school.code && x.facultyId === `F-${school.code}-${k + 1}`).map((x) => x.code),
    };
  })
);

// ---------- students: six per school, all in Semester 3 ----------
export const students = SCHOOLS.flatMap((school, s) =>
  Array.from({ length: 6 }, (_, i) => {
    const gender = i % 2 === 0 ? "M" : "F";
    const first = (gender === "M" ? MALE : FEMALE)[(s * 3 + (i >> 1)) % 20];
    const last = LAST[(s * 7 + i * 3 + 1) % 20];
    return {
      id: `S-${school.code}-${i + 1}`,
      enrollmentNo: `VCU25${school.code}${pad(i + 1)}`,
      name: `${first} ${last}`,
      gender,
      email: `${slug(first)}.${slug(last)}${pad(s * 6 + i + 1, 2)}@students.vcu.edu`,
      phone: phone(),
      school: school.code,
      program: school.programs[i % school.programs.length],
      year: 2,
      semester: SEMESTER,
      section: i < 3 ? "A" : "B",
      batch: BATCH,
      dateOfBirth: `200${between(4, 6)}-${pad(between(1, 12), 2)}-${pad(between(1, 28), 2)}`,
      guardianName: `${pick(GUARDIANS)} ${last}`,
      guardianPhone: phone(),
      city: pick(CITIES),
      cgpa: Number((6 + rand() * 3.6).toFixed(2)),
      hostelResident: i % 3 !== 2, // four of every six students live in the hostel
    };
  })
);

// ---------- attendance (mutable, so marking attendance changes what students see) ----------
const attendance = {};
students.forEach((st) =>
  subjects
    .filter((sub) => sub.school === st.school)
    .forEach((sub) => {
      const held = between(34, 42);
      attendance[`${st.id}|${sub.code}`] = { held, attended: Math.round(held * (0.58 + rand() * 0.41)) };
    })
);
const markedSessions = new Set();

export const getAttendance = (studentId, subjectCode) => attendance[`${studentId}|${subjectCode}`] || { held: 0, attended: 0 };
// With no classes held yet there is nothing to fall short of, so it counts as 100%
export const percent = (attended, held) => (held ? Math.round((attended / held) * 100) : 100);
export const todayKey = () => new Date().toISOString().slice(0, 10);
export const isMarkedToday = (subjectCode) => markedSessions.has(`${subjectCode}|${todayKey()}`);

// presentIds: ids of students who were present. Everyone in `roster` gets one more class held.
export function saveAttendance(subjectCode, roster, presentIds) {
  const key = `${subjectCode}|${todayKey()}`;
  if (markedSessions.has(key)) return false;
  roster.forEach((st) => {
    const rec = attendance[`${st.id}|${subjectCode}`];
    if (!rec) return;
    rec.held += 1;
    if (presentIds.includes(st.id)) rec.attended += 1;
  });
  markedSessions.add(key);
  persist();
  return true;
}

// ---------- weekly timetable (the same for every student of a school) ----------
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const PERIODS = [
  "09:00 - 09:50", "10:00 - 10:50", "11:10 - 12:00", "12:10 - 13:00", "14:00 - 14:50", "15:00 - 15:50",
];

export const getFacultyById = (id) => faculty.find((f) => f.id === id);

export function buildTimetable(schoolCode) {
  const list = subjects.filter((s) => s.school === schoolCode);
  return DAYS.map((_, d) =>
    PERIODS.map((_, p) => {
      const subject = list[(d + p) % list.length]; // every subject once a day
      return {
        subjectCode: subject.code,
        subjectName: subject.name,
        type: subject.type,
        facultyId: subject.facultyId,
        facultyName: getFacultyById(subject.facultyId)?.name ?? "Unassigned",
        room: `${schoolCode}-${201 + list.indexOf(subject)}`,
      };
    })
  );
}

// ---------- LMS courses (one per subject) ----------
const UNIT_TITLES = ["Introduction and fundamentals", "Core concepts and methods", "Applications and case studies", "Advanced topics", "Revision and mini project"];

export const daysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

export const courses = subjects.map((subject, i) => {
  const school = SCHOOLS.find((s) => s.code === subject.school);
  const n = i % 6;
  return {
    ...subject,
    schoolName: school.name,
    description: `Semester ${SEMESTER} course in the ${school.name}. Builds a working understanding of ${subject.name.toLowerCase()} through lectures, readings and graded work.`,
    units: UNIT_TITLES.map((title, u) => ({ no: u + 1, title, lessons: 3 + ((n + u) % 4) })),
    materials: 6 + ((n * 3) % 9),
    assignments: [
      { id: `${subject.code}-A1`, title: `Assignment 1: ${subject.name}`, dueInDays: 2 + ((n * 2) % 9), marks: 20 },
      { id: `${subject.code}-A2`, title: `Assignment 2: ${subject.name}`, dueInDays: 12 + ((n * 2) % 9), marks: 20 },
    ],
  };
});

// progress of one student in one course, between 35 and 95 percent
export const getProgress = (studentId, courseCode) => 35 + (hash(`${studentId}${courseCode}`) % 61);

// ---------- hostel ----------
export const hostels = [
  { id: "H1", name: "Aryabhata Boys Hostel", type: "Boys", warden: "Mr. Suresh Kumar", wardenPhone: "+91 98250 11001", floors: 4, roomsPerFloor: 10, sharing: 3 },
  { id: "H2", name: "Vivekananda Boys Hostel", type: "Boys", warden: "Mr. Dinesh Pillai", wardenPhone: "+91 98250 11002", floors: 4, roomsPerFloor: 10, sharing: 3 },
  { id: "H3", name: "Kalpana Chawla Girls Hostel", type: "Girls", warden: "Mrs. Anita Rao", wardenPhone: "+91 98250 11003", floors: 4, roomsPerFloor: 10, sharing: 3 },
  { id: "H4", name: "Savitribai Phule Girls Hostel", type: "Girls", warden: "Mrs. Geeta Nair", wardenPhone: "+91 98250 11004", floors: 4, roomsPerFloor: 10, sharing: 3 },
].map((h) => ({ ...h, capacity: h.floors * h.roomsPerFloor * h.sharing }));

export const HOSTEL_FACILITIES = ["24x7 Wi-Fi", "Mess with veg and non-veg menu", "Laundry", "Study hall", "Common room", "Power backup", "CCTV security"];
export const HOSTEL_RULES = [
  "Gate closes at 9:30 PM. Late entry needs the warden's written approval.",
  "Visitors are allowed in the visitor room from 10 AM to 6 PM.",
  "Silence hours: 10 PM to 6 AM.",
  "Electrical appliances such as heaters and irons are not allowed in rooms.",
];

const counters = {};
export const residents = students
  .filter((st) => st.hostelResident)
  .map((st) => {
    const schoolIndex = SCHOOLS.findIndex((s) => s.code === st.school);
    const odd = schoolIndex % 2 === 1;
    const hostelId = st.gender === "M" ? (odd ? "H2" : "H1") : odd ? "H4" : "H3";
    const hostel = hostels.find((h) => h.id === hostelId);
    const c = counters[hostelId] ?? 0;
    counters[hostelId] = c + 1;
    const roomIndex = Math.floor(c / hostel.sharing);
    const room = (Math.floor(roomIndex / hostel.roomsPerFloor) + 1) * 100 + (roomIndex % hostel.roomsPerFloor) + 1;
    return {
      studentId: st.id,
      hostelId,
      room: String(room),
      bed: "ABC"[c % hostel.sharing],
      mess: pick(["Veg", "Non-Veg"]),
      feeStatus: pick(["Paid", "Paid", "Partial", "Pending"]),
      checkIn: `2025-07-${pad(between(8, 20), 2)}`,
    };
  });

// ---------- lookups (functions, because people can be added and removed) ----------
export const getStudent = (id) => students.find((s) => s.id === id);
export const getResident = (studentId) => residents.find((r) => r.studentId === studentId);

// ---------- the people you can sign in as in demo mode ----------
const STAFF = {
  [ROLES.SUPER_ADMIN]: { name: "Dr. Anil Kumar", email: "anil.kumar@vcu.edu" },
  [ROLES.REGISTRAR]: { name: "Dr. Lakshmi Narayan", email: "lakshmi.narayan@vcu.edu" },
  [ROLES.ADMIN]: { name: "Rakesh Menon", email: "rakesh.menon@vcu.edu" },
  [ROLES.ACCOUNTANT]: { name: "Sunita Agarwal", email: "sunita.agarwal@vcu.edu" },
  [ROLES.LIBRARIAN]: { name: "Prakash Iyer", email: "prakash.iyer@vcu.edu" },
};

export function getDemoUser(role, schoolCode = "ENG") {
  if (role === ROLES.STUDENT) {
    const st = students.find((s) => s.school === schoolCode) || students[0];
    return { id: st.id, name: st.name, email: st.email, role, school: st.school, department: st.program };
  }
  if (role === ROLES.FACULTY || role === ROLES.HOD) {
    const list = faculty.filter((f) => f.school === schoolCode);
    const f = (role === ROLES.HOD ? list[0] : list[1]) || faculty[0];
    return { id: f.id, name: f.name, email: f.email, role, school: f.school, department: f.department };
  }
  const staff = STAFF[role] || STAFF[ROLES.ADMIN];
  return { id: `staff-${role}`, name: staff.name, email: staff.email, role };
}

// ---------- keeping changes while the tab is open ----------
// Without a backend, additions and edits are kept in this browser tab so a refresh does not lose them.
const STORAGE_KEY = "demo-university-data";

const replaceContents = (target, source) => {
  if (Array.isArray(target)) target.splice(0, target.length, ...source);
  else {
    Object.keys(target).forEach((k) => delete target[k]);
    Object.assign(target, source);
  }
};

export function persist() {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ students, faculty, subjects, residents, attendance, marked: [...markedSessions] })
    );
  } catch {
    /* storage can be blocked; changes then last until the page reloads */
  }
}

(function hydrate() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    replaceContents(students, saved.students);
    replaceContents(faculty, saved.faculty);
    replaceContents(subjects, saved.subjects);
    replaceContents(residents, saved.residents);
    replaceContents(attendance, saved.attendance);
    markedSessions.clear();
    saved.marked.forEach((m) => markedSessions.add(m));
  } catch {
    /* nothing saved, or storage is unavailable */
  }
})();

// Small helpers the "server" functions use when people are added or removed
export const attendanceStore = attendance;
