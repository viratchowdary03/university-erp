import {
  LayoutDashboard, GraduationCap, Users, Building2, CalendarDays,
  ClipboardCheck, FileText, Award, Wallet, Library, Megaphone,
  BookOpen, UserPlus, UserCheck, BedDouble, Bus, CalendarOff, BarChart3, Settings,
  Briefcase, Network, PartyPopper, LifeBuoy, ScrollText, MessageSquare, LineChart, History, TrendingUp,
} from "lucide-react";
import { PERM as P } from "./permissions";

// Who sees each item is decided by its permission (see config/permissions.js).
// `group` only decides the heading in the side menu.
export const NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, permission: P.DASHBOARD, group: "Main" },
  { label: "Messages", path: "/messages", icon: MessageSquare, permission: P.MESSAGES, group: "Main" },
  { label: "Notices", path: "/notices", icon: Megaphone, permission: P.NOTICES, group: "Main" },
  { label: "Events", path: "/events", icon: PartyPopper, permission: P.EVENTS, group: "Main" },

  { label: "User Approvals", path: "/users", icon: UserCheck, permission: P.USERS, group: "Administration" },
  { label: "Academic Setup", path: "/academic", icon: Building2, permission: P.ACADEMIC, group: "Administration" },
  { label: "Admissions", path: "/admissions", icon: UserPlus, permission: P.ADMISSIONS, group: "Administration" },
  { label: "Students", path: "/students", icon: GraduationCap, permission: P.STUDENTS, group: "Administration" },
  { label: "Faculty", path: "/faculty", icon: Users, permission: P.FACULTY, group: "Administration" },

  { label: "Timetable", path: "/timetable", icon: CalendarDays, permission: P.TIMETABLE, group: "Academics" },
  { label: "Attendance", path: "/attendance", icon: ClipboardCheck, permission: P.ATTENDANCE, group: "Academics" },
  { label: "Attendance Planner", path: "/attendance-planner", icon: TrendingUp, permission: P.ATTENDANCE, group: "Academics" },
  { label: "LMS", path: "/lms", icon: BookOpen, permission: P.LMS, group: "Academics" },
  { label: "Exams", path: "/exams", icon: FileText, permission: P.EXAMS, group: "Academics" },
  { label: "Results", path: "/results", icon: Award, permission: P.RESULTS, group: "Academics" },
  { label: "Leave", path: "/leave", icon: CalendarOff, permission: P.LEAVE, group: "Academics" },

  { label: "Fees", path: "/fees", icon: Wallet, permission: P.FEES, group: "Campus services" },
  { label: "Library", path: "/library", icon: Library, permission: P.LIBRARY, group: "Campus services" },
  { label: "Hostel", path: "/hostel", icon: BedDouble, permission: P.HOSTEL, group: "Campus services" },
  { label: "Transport", path: "/transport", icon: Bus, permission: P.TRANSPORT, group: "Campus services" },
  { label: "Certificates", path: "/certificates", icon: ScrollText, permission: P.CERTIFICATES, group: "Campus services" },
  { label: "Grievance", path: "/grievance", icon: LifeBuoy, permission: P.GRIEVANCE, group: "Campus services" },

  { label: "Placements", path: "/placements", icon: Briefcase, permission: P.PLACEMENTS, group: "Careers" },
  { label: "Alumni", path: "/alumni", icon: Network, permission: P.ALUMNI, group: "Careers" },

  { label: "Analytics", path: "/analytics", icon: LineChart, permission: P.ANALYTICS, group: "Insights" },
  { label: "Reports", path: "/reports", icon: BarChart3, permission: P.REPORTS, group: "Insights" },
  { label: "Audit Log", path: "/audit-logs", icon: History, permission: P.AUDIT, group: "Insights" },
  { label: "Settings", path: "/settings", icon: Settings, permission: P.SETTINGS, group: "Insights" },
];
