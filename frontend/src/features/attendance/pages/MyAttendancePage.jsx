import { useSelector } from "react-redux";
import { AlertTriangle } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import { PASS_MARK } from "../../../utils/demoData";
import { attendanceTone } from "../../../utils/helpers";
import LoadError from "../../../components/common/LoadError";
import { PageSkeleton } from "../../../components/common/Skeleton";
import { classesToRecover } from "../attendanceApi";
import { useStudentAttendance } from "../attendanceQueries";

const BAR = { green: "bg-emerald-500", amber: "bg-amber-400", red: "bg-red-500" };

export default function MyAttendancePage() {
  const user = useSelector((s) => s.auth.user);
  const attendance = useStudentAttendance(user);

  if (attendance.isLoading) return <PageSkeleton />;
  if (attendance.isError) return <LoadError error={attendance.error} onRetry={attendance.refetch} />;

  const { rows, overall } = attendance.data;
  const low = rows.filter((r) => r.held > 0 && r.percent < PASS_MARK);

  return (
    <div>
      <PageHeader title="My attendance" subtitle={`Minimum required: ${PASS_MARK}% in every subject.`} />

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-white p-5 shadow-sm">
        <div>
          <p className="text-sm text-slate-500">Overall attendance</p>
          <p className="text-3xl font-bold text-slate-900">{overall}%</p>
        </div>
        <Badge tone={attendanceTone(overall)}>{overall >= PASS_MARK ? "On track" : "Below minimum"}</Badge>
        {low.length > 0 && (
          <p className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle size={16} /> {low.length} subject{low.length > 1 ? "s" : ""} below {PASS_MARK}%
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((r) => {
          const tone = attendanceTone(r.percent);
          const need = classesToRecover(r.attended, r.held);
          return (
            <Card key={r.code}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{r.name}</h2>
                  <p className="font-mono text-xs text-slate-400">{r.code}</p>
                </div>
                <Badge tone={tone}>{r.percent}%</Badge>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${r.percent} percent attendance`}>
                <div className={`h-full rounded-full ${BAR[tone]}`} style={{ width: `${r.percent}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {r.held === 0 ? "No classes held yet" : `Attended ${r.attended} of ${r.held} classes`}
              </p>
              {need > 0 && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  Attend the next {need} classes in a row to reach {PASS_MARK}%.
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
