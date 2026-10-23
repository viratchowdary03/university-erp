import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { GraduationCap, Users, Building2, ClipboardCheck, UserCheck, BedDouble } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

import PageHeader from "../../../components/common/PageHeader";
import StatCard from "../../../components/common/StatCard";
import Card from "../../../components/common/Card";
import { getSchoolName } from "../../../config/schools";
import { hasFullAccess } from "../../../config/permissions";
import { PASS_MARK } from "../../../utils/demoData";
import LoadError from "../../../components/common/LoadError";
import { PageSkeleton } from "../../../components/common/Skeleton";
import { useAdminDashboard } from "../dashboardQueries";
import NoticesCard from "../components/NoticesCard";

const Chart = ({ title, data, dataKey, color = "#0d9488", domain }) => (
  <Card title={title}>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} domain={domain} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </Card>
);

// For the roles that see every school, and for heads of school (their own school only)
export default function AdminDashboard() {
  const user = useSelector((s) => s.auth.user);
  const fullAccess = hasFullAccess(user.role);

  const query = useAdminDashboard(user);

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) return <LoadError error={query.error} onRetry={query.refetch} />;

  const data = query.data;
  const pending = data.pending;
  const head = data.reports[0];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.name}`}
        subtitle={fullAccess ? "University overview across all schools." : `Overview of ${getSchoolName(user.school)}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={data.studentCount} icon={GraduationCap} />
        <StatCard label="Faculty" value={data.facultyCount} icon={Users} tone="green" />
        <StatCard label={fullAccess ? "Schools" : "Subjects"} value={fullAccess ? data.schoolCount : head.subjectRows.length} icon={Building2} tone="amber" />
        <StatCard label="Avg. attendance" value={`${data.average}%`} icon={ClipboardCheck} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {fullAccess ? (
          <>
            <Chart
              title="Average attendance by school (%)"
              data={data.reports.map((r) => ({ name: r.code, average: r.average }))}
              dataKey="average"
              domain={[0, 100]}
            />
            <Chart
              title={`Students below ${PASS_MARK}% attendance, by school`}
              data={data.reports.map((r) => ({ name: r.code, students: r.shortage.length }))}
              dataKey="students"
              color="#f59e0b"
            />
          </>
        ) : (
          <>
            <Chart
              title="Average attendance by subject (%)"
              data={head.subjectRows.map((r) => ({ name: r.code, average: r.average }))}
              dataKey="average"
              domain={[0, 100]}
            />
            <Card title={`Students below ${PASS_MARK}% attendance`}>
              {head.shortage.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">Everyone is above the minimum.</p>
              ) : (
                <ul className="divide-y">
                  {head.shortage.map(({ student, overall }) => (
                    <li key={student.id} className="flex items-center justify-between py-3 text-sm">
                      <span className="font-medium text-slate-800">{student.name}</span>
                      <span className="text-red-600">{overall}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {fullAccess && (
          <div className="space-y-4">
            {pending !== null && (
              <Link to="/users" className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="rounded-lg bg-amber-100 p-3 text-amber-600"><UserCheck size={22} /></div>
                <div>
                  <p className="text-sm text-slate-500">Registration requests waiting for you</p>
                  <p className="text-xl font-semibold text-slate-900">{pending}</p>
                </div>
              </Link>
            )}
            <Link to="/hostel" className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="rounded-lg bg-brand-100 p-3 text-brand-600"><BedDouble size={22} /></div>
              <div>
                <p className="text-sm text-slate-500">Hostel residents</p>
                <p className="text-xl font-semibold text-slate-900">
                  {data.hostelResidents} <span className="text-sm font-normal text-slate-400">of {data.totalStudents} students</span>
                </p>
              </div>
            </Link>
          </div>
        )}
        <NoticesCard />
      </div>
    </div>
  );
}
