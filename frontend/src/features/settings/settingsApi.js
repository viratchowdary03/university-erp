import api from "../../api/axios";
import { canApprove, approvableRoles } from "../../config/permissions";

const MOCK = import.meta.env.VITE_MOCK_AUTH === "true";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const STORAGE_KEY = "demo-pending-requests";

// Sample registration requests shown in demo mode (same shape the backend returns)
const SAMPLE_REQUESTS = [
  { id: "d1", name: "Dr. Meera Nair", email: "meera.nair@example.com", phone: "9876543210", role: "faculty", school: "NUR", department: "B.Sc Nursing", profile: { employeeId: "VCU-F-2031", designation: "Associate Professor", qualification: "Ph.D. Nursing", specialization: "Community Health", experienceYears: 9 } },
  { id: "d2", name: "Prof. Arjun Reddy", email: "arjun.reddy@example.com", phone: "9123456780", role: "hod", school: "ENG", department: "B.Tech Computer Science", profile: { employeeId: "VCU-H-1007", qualification: "Ph.D. Computer Science", specialization: "Machine Learning", experienceYears: 17 } },
  { id: "d3", name: "Kavya Shah", email: "kavya.shah@example.com", phone: "9988776655", role: "student", school: "DES", department: "B.Des Product Design", profile: { year: 1, dateOfBirth: "2007-03-14", guardianName: "Mahesh Shah", guardianPhone: "9898989898" } },
  { id: "d4", name: "Sunil Verma", email: "sunil.verma@example.com", phone: "9811122233", role: "accountant", profile: { employeeId: "VCU-A-3302", qualification: "M.Com", experienceYears: 6 } },
  { id: "d5", name: "Rakesh Joshi", email: "rakesh.joshi@example.com", phone: "9822334455", role: "admin", profile: { employeeId: "VCU-AD-4410", designation: "Administrative Officer", officeName: "Hostel Office", experienceYears: 5 } },
  { id: "d6", name: "Dr. Shalini Rao", email: "shalini.rao@example.com", phone: "9833445566", role: "registrar", profile: { employeeId: "VCU-R-5001", designation: "Deputy Registrar", qualification: "Ph.D. Public Administration", experienceYears: 14 } },
  { id: "d7", name: "Vikram Singh", email: "vikram.singh@example.com", phone: "9844556677", role: "super_admin", profile: { employeeId: "VCU-X-0002", designation: "Director, IT & Systems", reason: "Needs full access to manage the ERP rollout across all schools" } },
];

const load = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : SAMPLE_REQUESTS;
  } catch {
    return SAMPLE_REQUESTS;
  }
};
const save = (list) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage can be blocked; the list then lasts until the page reloads */
  }
};

// Demo mode: a new registration joins the list so you can approve it yourself
export function addDemoRequest(payload) {
  const { name, email, phone, role, school, department, password, confirmPassword, ...profile } = payload;
  void password;
  void confirmPassword;
  save([...load(), { id: `r${Date.now()}`, name, email, phone, role, school, department, profile }]);
}

// Only the requests this approver is allowed to decide on
export async function listPendingUsers(approverRole) {
  if (MOCK) {
    await delay(200);
    return load().filter((u) => canApprove(approverRole, u.role));
  }
  const { data } = await api.get("/users/pending");
  return data.data.users;
}

export const countPendingRequests = (approverRole) =>
  MOCK ? load().filter((u) => approvableRoles(approverRole).includes(u.role)).length : null;

async function decide(id, action) {
  if (MOCK) {
    await delay(250);
    save(load().filter((u) => u.id !== id));
    return;
  }
  await api.patch(`/users/${id}/${action}`);
}

export const approveUser = (id) => decide(id, "approve");
export const rejectUser = (id) => decide(id, "reject");
