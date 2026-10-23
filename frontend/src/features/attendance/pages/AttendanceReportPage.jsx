import { useState } from "react";
import { useSelector } from "react-redux";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import StatCard from "../../../components/common/StatCard";
import Badge from "../../../components/common/Badge";
import EmptyState from "../../../components/common/EmptyState";
import FilterSelect from "../../../components/common/FilterSelect";
import { GraduationCap, ClipboardCheck, AlertTriangle } from "lucide-react";
import { SCHOOLS, getSchoolName } from "../../../config/schools";
import { hasFullAccess } from "../../../config/permissions";
import { PASS_MARK } from "../../../utils/demoData";
import { attendanceTone } from "../../../utils/helpers";
import LoadError from "../../../components/common/LoadError";
import { PageSkeleton } from "../../../components/common/Skeleton";
import { classesToRecover } from "../attendanceApi";
import { useSchoolReport } from "../attendanceQueries";

// For heads of school (own school) and for the roles that see every school
export default function AttendanceReportPage() {
  const user = useSelector((s) => s.auth.user);
  const [requested, setRequested] = useState("ENG");
  const query = useSchoolReport(user, requested);

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) return <LoadError error={query.error} onRetry={query.refetch} />;

  const report = query.data;

  return (
    <div>
      <PageHeader
        title="Attendance report"
        subtitle={getSchoolName(report.school)}
        action={
          hasFullAccess(user.role) && (
            <FilterSelect
              label="School"
              value={requested}
              onChange={setRequested}
              options={SCHOOLS.map((s) => ({ value: s.code, label: s.name }))}
            />
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Students" value={report.studentCount} icon={GraduationCap} />
        <StatCard label="Average attendance" value={`${report.average}%`} icon={ClipboardCheck} tone="green" />
        <StatCard label={`Below ${PASS_MARK}%`} value={report.shortage.length} icon={AlertTriangle} tone="red" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Average by subject">
          <ul className="space-y-4">
            {report.subjectRows.map((r) => (
              <li key={r.code}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-700">{r.name}</span>
                  <span className="font-medium text-slate-800">{r.average}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${r.average < PASS_MARK ? "bg-red-500" : r.average < 85 ? "bg-amber-400" : "bg-emerald-500"}`}
                    style={{ width: `${r.average}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={`Students below ${PASS_MARK}%`}>
          {report.shortage.length === 0 ? (
            <EmptyState title="Everyone is above the minimum" />
          ) : (
            <ul className="divide-y">
              {report.shortage.map(({ student, overall, rows }) => {
                const worst = [...rows].sort((a, b) => a.percent - b.percent)[0];
                const rec = worst;
                return (
                  <li key={student.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{student.name}</p>
                      <p className="truncate text-xs text-slate-400">
                        Lowest: {worst.name} ({classesToRecover(rec.attended, rec.held)} classes to recover)
                      </p>
                    </div>
                    <Badge tone={attendanceTone(overall)}>{overall}%</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
