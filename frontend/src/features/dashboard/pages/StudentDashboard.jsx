import { useSelector } from "react-redux";
import { ClipboardCheck, Award, BedDouble, FileText } from "lucide-react";

import PageHeader from "../../../components/common/PageHeader";
import StatCard from "../../../components/common/StatCard";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import LoadError from "../../../components/common/LoadError";
import { PageSkeleton } from "../../../components/common/Skeleton";
import { getSchoolName } from "../../../config/schools";
import { DAYS, PASS_MARK } from "../../../utils/demoData";
import { attendanceTone, formatDate } from "../../../utils/helpers";
import { useStudentDashboard } from "../dashboardQueries";
import NoticesCard from "../components/NoticesCard";

const BAR = { green: "bg-emerald-500", amber: "bg-amber-400", red: "bg-red-500" };

export default function StudentDashboard() {
  const user = useSelector((s) => s.auth.user);
  const query = useStudentDashboard(user);

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) return <LoadError error={query.error} onRetry={query.refetch} />;

  const { day, rows, overall, classes, cgpa, hostel, assignments } = query.data;

  return (
    <div>
      <PageHeader title={`Welcome, ${user.name}`} subtitle={`${getSchoolName(user.school)} · ${user.department}`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Attendance" value={`${overall}%`} icon={ClipboardCheck} tone={attendanceTone(overall)} />
        <StatCard label="CGPA" value={cgpa} icon={Award} />
        <StatCard
          label="Hostel"
          value={hostel?.resident ? `Room ${hostel.room}` : "Day scholar"}
          hint={hostel?.resident ? hostel.hostel.name : undefined}
          icon={BedDouble}
          tone="amber"
        />
        <StatCard label="Assignments due soon" value={assignments.length} icon={FileText} tone="red" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={`${day.label}'s timetable · ${DAYS[day.index]}`}>
          <ul className="divide-y">
            {classes.map((c) => (
              <li key={c.period} className="flex items-center gap-4 py-3 text-sm">
                <span className="w-28 shrink-0 rounded-md bg-brand-50 py-1 text-center text-xs font-semibold text-brand-700">{c.period}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{c.subjectName}</span>
                <span className="text-xs text-slate-400">Room {c.room}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Attendance by subject">
          <ul className="space-y-4">
            {rows.map((r) => (
              <li key={r.code}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="truncate">{r.name}</span>
                  <span className={r.percent < PASS_MARK ? "font-semibold text-red-600" : "text-slate-600"}>{r.percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${BAR[attendanceTone(r.percent)]}`} style={{ width: `${r.percent}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-400">Red means below the {PASS_MARK}% minimum.</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Upcoming assignments">
          <ul className="divide-y">
            {assignments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="min-w-0 truncate">{a.title}</span>
                <Badge tone="amber">{formatDate(a.due)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <NoticesCard />
      </div>
    </div>
  );
}
