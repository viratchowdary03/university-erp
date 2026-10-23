// Sample data for the dashboards. Replace with API calls once the backend modules exist.

export const notices = [
  { id: 1, title: "Mid-semester exams start on 12 October", date: "28 Sep" },
  { id: 2, title: "Fee payment last date extended to 5 October", date: "26 Sep" },
  { id: 3, title: "Guest lecture on Machine Learning, Seminar Hall", date: "24 Sep" },
  { id: 4, title: "Library will be closed on Sunday", date: "22 Sep" },
];

export const adminData = {
  stats: { students: 4820, faculty: 312, departments: 14, attendance: 86 },
  studentsByDepartment: [
    { name: "CSE", students: 920 },
    { name: "ECE", students: 640 },
    { name: "ME", students: 580 },
    { name: "CE", students: 510 },
    { name: "EE", students: 470 },
    { name: "MBA", students: 380 },
  ],
  feeCollection: [
    { month: "Apr", amount: 42 },
    { month: "May", amount: 38 },
    { month: "Jun", amount: 51 },
    { month: "Jul", amount: 64 },
    { month: "Aug", amount: 58 },
    { month: "Sep", amount: 72 },
  ], // in lakh
  admissions: [
    { name: "Aarav Patel", program: "B.Tech CSE", status: "Approved" },
    { name: "Diya Shah", program: "MBA", status: "Pending" },
    { name: "Rohan Mehta", program: "B.Tech ECE", status: "Pending" },
    { name: "Isha Desai", program: "B.Tech ME", status: "Approved" },
  ],
};

export const facultyData = {
  stats: { classesToday: 4, students: 180, pendingEvaluations: 23, leaveBalance: 8 },
  schedule: [
    { time: "09:00", subject: "Machine Learning", section: "CSE-A", room: "B-204" },
    { time: "10:00", subject: "Data Structures", section: "CSE-B", room: "B-108" },
    { time: "12:00", subject: "ML Lab", section: "CSE-A (G1)", room: "Lab 3" },
    { time: "14:00", subject: "Data Structures", section: "CSE-C", room: "B-110" },
  ],
  attendanceBySubject: [
    { name: "ML", attendance: 88 },
    { name: "DSA-B", attendance: 81 },
    { name: "DSA-C", attendance: 76 },
    { name: "ML Lab", attendance: 92 },
  ],
  tasks: [
    { id: 1, text: "Evaluate Assignment 2 (CSE-A)", due: "Tomorrow" },
    { id: 2, text: "Upload Unit 4 notes", due: "2 Oct" },
    { id: 3, text: "Enter mid-sem marks", due: "15 Oct" },
  ],
};

export const studentData = {
  stats: { attendance: 87, cgpa: 8.4, feesDue: 12500, assignmentsDue: 3 },
  timetable: [
    { time: "09:00", subject: "Machine Learning", room: "B-204" },
    { time: "10:00", subject: "Computer Networks", room: "B-108" },
    { time: "11:00", subject: "Operating Systems", room: "B-110" },
    { time: "14:00", subject: "ML Lab", room: "Lab 3" },
  ],
  attendanceBySubject: [
    { subject: "Machine Learning", percent: 92 },
    { subject: "Computer Networks", percent: 84 },
    { subject: "Operating Systems", percent: 71 },
    { subject: "Software Engineering", percent: 88 },
  ],
  deadlines: [
    { id: 1, title: "ML Assignment 3", due: "1 Oct" },
    { id: 2, title: "CN Lab Report", due: "3 Oct" },
    { id: 3, title: "OS Quiz", due: "6 Oct" },
  ],
};

export const accountantData = {
  stats: { today: 184000, month: 7200000, pending: 2350000, defaulters: 146 },
  monthly: [
    { month: "Apr", amount: 42 },
    { month: "May", amount: 38 },
    { month: "Jun", amount: 51 },
    { month: "Jul", amount: 64 },
    { month: "Aug", amount: 58 },
    { month: "Sep", amount: 72 },
  ], // in lakh
  modes: [
    { name: "Online", value: 58 },
    { name: "UPI", value: 24 },
    { name: "Cash", value: 12 },
    { name: "Cheque", value: 6 },
  ],
  recent: [
    { receipt: "RC-10452", student: "Aarav Patel", amount: 45000, mode: "Online" },
    { receipt: "RC-10451", student: "Diya Shah", amount: 22500, mode: "UPI" },
    { receipt: "RC-10450", student: "Rohan Mehta", amount: 12500, mode: "Cash" },
    { receipt: "RC-10449", student: "Isha Desai", amount: 45000, mode: "Online" },
  ],
};
