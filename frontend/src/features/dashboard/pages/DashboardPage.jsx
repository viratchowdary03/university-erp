import { lazy, Suspense } from "react";
import { useSelector } from "react-redux";
import { ROLES, ROLE_LABELS } from "../../../config/roles";
import { can, ROLE_SUMMARY } from "../../../config/permissions";
import { NAV_ITEMS } from "../../../config/navigation";
import { getSchoolName } from "../../../config/schools";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import { PageSkeleton } from "../../../components/common/Skeleton";

// Each dashboard (and the chart library it uses) is only downloaded for the roles that need it
const AdminDashboard = lazy(() => import("./AdminDashboard"));
const FacultyDashboard = lazy(() => import("./FacultyDashboard"));
const StudentDashboard = lazy(() => import("./StudentDashboard"));
const AccountantDashboard = lazy(() => import("./AccountantDashboard"));
const LibrarianDashboard = lazy(() => import("./LibrarianDashboard"));

const DASHBOARDS = {
  [ROLES.SUPER_ADMIN]: AdminDashboard,
  [ROLES.REGISTRAR]: AdminDashboard,
  [ROLES.ADMIN]: AdminDashboard,
  [ROLES.HOD]: AdminDashboard,
  [ROLES.FACULTY]: FacultyDashboard,
  [ROLES.STUDENT]: StudentDashboard,
  [ROLES.ACCOUNTANT]: AccountantDashboard,
  [ROLES.LIBRARIAN]: LibrarianDashboard,
};

function DefaultDashboard() {
  const user = useSelector((s) => s.auth.user);
  return <PageHeader title={`Welcome, ${user?.name}`} subtitle="Use the menu on the left to get started." />;
}

// Shows the right dashboard for the logged-in role, plus what that role can open
export default function DashboardPage() {
  const user = useSelector((s) => s.auth.user);
  const role = user?.role;
  const View = DASHBOARDS[role] || DefaultDashboard;
  const modules = NAV_ITEMS.filter((i) => i.path !== "/" && can(role, i.permission));

  return (
    <div>
      <Suspense fallback={<PageSkeleton />}>
        <View />
      </Suspense>

      <Card title="Your access" className="mt-6">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{ROLE_LABELS[role]}</span>
          {user?.school ? ` · ${getSchoolName(user.school)}` : ""}
        </p>
        <p className="mt-1 text-sm text-slate-500">{ROLE_SUMMARY[role]}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {modules.map((m) => (
            <span key={m.path} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              {m.label}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
