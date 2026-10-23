import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Layout from "../components/layout/Layout";
import ProtectedRoute from "./ProtectedRoute";
import PlaceholderPage from "../components/common/PlaceholderPage";
import { Skeleton } from "../components/common/Skeleton";
import { NAV_ITEMS } from "../config/navigation";
import { ROLES } from "../config/roles";
import { PERM } from "../config/permissions";

// Every page is downloaded the first time it is opened, which keeps the first load small
const UnauthorizedPage = lazy(() => import("./UnauthorizedPage"));
const LoginPage = lazy(() => import("../features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("../features/auth/pages/RegisterPage"));
const VerifyOtpPage = lazy(() => import("../features/auth/pages/VerifyOtpPage"));
const ForgotPasswordPage = lazy(() => import("../features/auth/pages/ForgotPasswordPage"));
const ChangePasswordPage = lazy(() => import("../features/auth/pages/ChangePasswordPage"));
const DashboardPage = lazy(() => import("../features/dashboard/pages/DashboardPage"));
const UserApprovalsPage = lazy(() => import("../features/settings/pages/UserApprovalsPage"));
const DepartmentsPage = lazy(() => import("../features/academic/pages/DepartmentsPage"));
const StudentListPage = lazy(() => import("../features/students/pages/StudentListPage"));
const FacultyListPage = lazy(() => import("../features/faculty/pages/FacultyListPage"));
const TimetablePage = lazy(() => import("../features/timetable/pages/TimetablePage"));
const MyAttendancePage = lazy(() => import("../features/attendance/pages/MyAttendancePage"));
const MarkAttendancePage = lazy(() => import("../features/attendance/pages/MarkAttendancePage"));
const AttendanceReportPage = lazy(() => import("../features/attendance/pages/AttendanceReportPage"));
const CoursesPage = lazy(() => import("../features/lms/pages/CoursesPage"));
const HostelPage = lazy(() => import("../features/hostel/pages/HostelPage"));
const ApplicationFormPage = lazy(() => import("../features/admissions/pages/ApplicationFormPage"));
const ApplicationsPage = lazy(() => import("../features/admissions/pages/ApplicationsPage"));
const ExamsPage = lazy(() => import("../features/exams/pages/ExamsPage"));
const MarksEntryPage = lazy(() => import("../features/exams/pages/MarksEntryPage"));
const ResultsPage = lazy(() => import("../features/results/pages/ResultsPage"));
const FeesPage = lazy(() => import("../features/fees/pages/FeesPage"));
const OnlinePaymentPage = lazy(() => import("../features/payments/pages/OnlinePaymentPage"));
const PaymentStatusPage = lazy(() => import("../features/payments/pages/PaymentStatusPage"));
const LibraryPage = lazy(() => import("../features/library/pages/LibraryPage"));
const TransportPage = lazy(() => import("../features/transport/pages/TransportPage"));
const LeavePage = lazy(() => import("../features/leave/pages/LeavePage"));
const NoticesPage = lazy(() => import("../features/notices/pages/NoticesPage"));
const ReportsPage = lazy(() => import("../features/reports/pages/ReportsPage"));
const SettingsPage = lazy(() => import("../features/settings/pages/SettingsPage"));
const PlacementsPage = lazy(() => import("../features/placements/pages/PlacementsPage"));
const AlumniPage = lazy(() => import("../features/alumni/pages/AlumniPage"));
const AlumniProfilePage = lazy(() => import("../features/alumni/pages/AlumniProfilePage"));
const EventsPage = lazy(() => import("../features/events/pages/EventsPage"));
const EventDetailPage = lazy(() => import("../features/events/pages/EventDetailPage"));
const GrievancePage = lazy(() => import("../features/grievance/pages/GrievancePage"));
const TicketPage = lazy(() => import("../features/grievance/pages/TicketPage"));
const CertificatesPage = lazy(() => import("../features/certificates/pages/CertificatesPage"));
const MessagesPage = lazy(() => import("../features/messaging/pages/MessagesPage"));
const AnalyticsPage = lazy(() => import("../features/analytics/pages/AnalyticsPage"));
const AttendancePlannerPage = lazy(() => import("../features/attendance/pages/AttendancePlannerPage"));
const AuditLogsPage = lazy(() => import("../features/auditLogs/pages/AuditLogsPage"));
const NotificationsPage = lazy(() => import("../features/notifications/pages/NotificationsPage"));
const CourseDetailPage = lazy(() => import("../features/lms/pages/CourseDetailPage"));
const QuizPage = lazy(() => import("../features/lms/pages/QuizPage"));

// Shows a different page for different roles on the same address
const byRole = (pages, Fallback) =>
  function RolePage() {
    const role = useSelector((s) => s.auth.user?.role);
    const Page = pages[role] || Fallback;
    return <Page />;
  };

// The page behind each menu item (the path comes from config/navigation.js)
const BUILT_PAGES = {
  "/users": UserApprovalsPage,
  "/academic": DepartmentsPage,
  "/students": StudentListPage,
  "/faculty": FacultyListPage,
  "/timetable": TimetablePage,
  "/attendance": byRole({ [ROLES.STUDENT]: MyAttendancePage, [ROLES.FACULTY]: MarkAttendancePage }, AttendanceReportPage),
  "/lms": CoursesPage,
  "/hostel": HostelPage,
  "/admissions": ApplicationsPage,
  "/exams": ExamsPage,
  "/results": ResultsPage,
  "/fees": FeesPage,
  "/library": LibraryPage,
  "/transport": TransportPage,
  "/leave": LeavePage,
  "/notices": NoticesPage,
  "/reports": ReportsPage,
  "/settings": SettingsPage,
  "/placements": PlacementsPage,
  "/alumni": AlumniPage,
  "/events": EventsPage,
  "/grievance": GrievancePage,
  "/certificates": CertificatesPage,
  "/messages": MessagesPage,
  "/analytics": AnalyticsPage,
  "/attendance-planner": AttendancePlannerPage,
  "/audit-logs": AuditLogsPage,
};

// Pages opened from inside another page (a record's own page). Same permission as their parent module.
const DETAIL_ROUTES = [
  { path: "/exams/:id/marks", permission: PERM.EXAMS, Page: MarksEntryPage },
  { path: "/lms/quiz/:id", permission: PERM.LMS, Page: QuizPage },
  { path: "/lms/:code", permission: PERM.LMS, Page: CourseDetailPage },
  { path: "/fees/pay/:structureId", permission: PERM.FEES, Page: OnlinePaymentPage },
  { path: "/payments/status/:orderId", permission: PERM.FEES, Page: PaymentStatusPage },
  { path: "/events/:id", permission: PERM.EVENTS, Page: EventDetailPage },
  { path: "/grievance/:id", permission: PERM.GRIEVANCE, Page: TicketPage },
  { path: "/messages/:id", permission: PERM.MESSAGES, Page: MessagesPage },
  { path: "/alumni/:id", permission: PERM.ALUMNI, Page: AlumniProfilePage },
];

const FullPageLoading = () => (
  <div role="status" aria-label="Loading" className="flex min-h-screen items-center justify-center bg-slate-50">
    <Skeleton className="h-10 w-48" />
  </div>
);

export default function AppRoutes() {
  const moduleRoutes = NAV_ITEMS.filter((item) => item.path !== "/");

  return (
    <Suspense fallback={<FullPageLoading />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/apply" element={<ApplicationFormPage />} />

        {/* Logged-in area */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="change-password" element={<ChangePasswordPage />} />
            <Route path="unauthorized" element={<UnauthorizedPage />} />
            <Route path="notifications" element={<NotificationsPage />} />

            {DETAIL_ROUTES.map(({ path, permission, Page }) => (
              <Route key={path} element={<ProtectedRoute permission={permission} />}>
                <Route path={path} element={<Page />} />
              </Route>
            ))}

            {moduleRoutes.map((item) => {
              const Page = BUILT_PAGES[item.path];
              return (
                <Route key={item.path} element={<ProtectedRoute permission={item.permission} />}>
                  <Route path={item.path} element={Page ? <Page /> : <PlaceholderPage title={item.label} />} />
                </Route>
              );
            })}
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
