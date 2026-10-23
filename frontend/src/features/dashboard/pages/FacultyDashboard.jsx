import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { CalendarDays, BookOpen, GraduationCap, ClipboardCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

import PageHeader from "../../../components/common/PageHeader";
import StatCard from "../../../components/common/StatCard";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import LoadError from "../../../components/common/LoadError";
import { PageSkeleton } from "../../../components/common/Skeleton";
import { getSchoolName } from "../../../config/schools";
import { DAYS } from "../../../utils/demoData";
import { useFacultyDashboard } from "../dashboardQueries";
import NoticesCard from "../components/NoticesCard";

export default function FacultyDashboard() {
  const user = useSelector((s) => s.auth.user);
  const query = useFacultyDashboard(user);

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) return <LoadError error={query.error} onRetry={query.refetch} />;

  const { day, classes, todaysSubjects, subjectCount, averages, average, studentCount } = query.data;

  return (
    <div>
      <PageHeader title={`Welcome, ${user.name}`} subtitle={`${getSchoolName(user.school)} · your classes and tasks.`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={day.isToday ? "Classes today" : "Classes next Monday"} value={classes.length} icon={CalendarDays} />
        <StatCard label="My subjects" value={subjectCount} icon={BookOpen} tone="green" />
        <StatCard label="Students in school" value={studentCount} icon={GraduationCap} tone="amber" />
        <StatCard label="Avg. attendance (mine)" value={`${average}%`} icon={ClipboardCheck} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={`${day.label}'s schedule · ${DAYS[day.index]}`}>
          {classes.length === 0 ? (
            <p className="py-4 text-sm text-slate-400">You have no classes on this day.</p>
          ) : (
            <ul className="divide-y">
              {classes.map((c) => (
                <li key={c.period} className="flex items-center gap-4 py-3 text-sm">
                  <span className="w-28 shrink-0 rounded-md bg-brand-50 py-1 text-center text-xs font-semibold text-brand-700">{c.period}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{c.subjectName}</span>
                  <span className="text-xs text-slate-400">Room {c.room}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Average attendance of my subjects (%)">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={averages.map((r) => ({ name: r.code, average: r.average }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="average" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Attendance to mark" action={<Link to="/attendance" className="text-sm font-medium text-brand-600 hover:underline">Open</Link>}>
          {todaysSubjects.length === 0 ? (
            <p className="py-4 text-sm text-slate-400">No classes to mark.</p>
          ) : (
            <ul className="divide-y">
              {todaysSubjects.map((s) => (
                <li key={s.code} className="flex items-center justify-between py-3 text-sm">
                  <span>{s.name}</span>
                  <Badge tone={s.marked ? "green" : "amber"}>{s.marked ? "Marked" : "Pending"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <NoticesCard />
      </div>
    </div>
  );
}
