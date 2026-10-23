import { useState } from "react";
import { useSelector } from "react-redux";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import StatCard from "../../../components/common/StatCard";
import Badge from "../../../components/common/Badge";
import DataTable from "../../../components/common/DataTable";
import SchoolFilter from "../../../components/common/SchoolFilter";
import QueryState from "../../../components/common/PageLoader";
import { useData } from "../../../api/resource";
import { ROLES } from "../../../config/roles";
import { attendanceTone } from "../../../utils/helpers";

// Students: "how many classes must I attend (or can I skip)?"  Staff: who is short and how far.
export default function AttendancePlannerPage() {
  const role = useSelector((s) => s.auth.user.role);
  const [school, setSchool] = useState("ENG");
  const query = useData(["analytics", "planner"], "/analytics/attendance-prediction", { params: role === ROLES.STUDENT ? undefined : { school } });
  return (
    <>
      <PageHeader
        title="Attendance planner"
        subtitle="Works out how many classes in a row you need to reach the 75% minimum, or how many you can still miss"
        action={role !== ROLES.STUDENT && <SchoolFilter value={school} onChange={setSchool} withAll={false} />}
      />
      <QueryState query={query}>
        {(d) => d.mode === "student" ? (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <StatCard label="Overall attendance" value={`${d.overall}%`} tone={d.overall < d.target ? "red" : "green"} icon={d.overall < d.target ? AlertTriangle : CheckCircle2} />
              <StatCard label="Minimum needed" value={`${d.target}%`} />
              <StatCard label="Classes to attend in a row" value={d.overallNeeded} hint={d.overallNeeded ? "To reach the minimum overall" : "You are above the minimum"} tone={d.overallNeeded ? "amber" : "green"} />
            </div>
            <Card title="Subject by subject">
              <DataTable
                rowKey={(r) => r.code}
                rows={d.rows}
                columns={[
                  { key: "s", header: "Subject", render: (r) => <><p className="font-medium">{r.name}</p><p className="text-xs text-slate-400">{r.code}</p></> },
                  { key: "a", header: "Attended", render: (r) => `${r.attended} / ${r.held}` },
                  { key: "p", header: "Percent", render: (r) => <Badge tone={attendanceTone(r.percent)}>{r.percent}%</Badge> },
                  { key: "n", header: "What to do", render: (r) => r.held === 0 ? "No classes held yet" : r.needed > 0 ? <span className="font-medium text-red-700">Attend the next {r.needed} class(es) in a row</span> : <span className="text-emerald-700">You can miss {r.canMiss} more class(es) and stay above 75%</span> },
                ]}
                emptyTitle="No subjects yet"
                pageSize={10}
              />
            </Card>
          </>
        ) : (
          <Card title={`Students below 85% - ${d.school}`}>
            <DataTable
              rowKey={(r) => r.id}
              rows={d.rows}
              getSearchText={(r) => `${r.name} ${r.enrollmentNo}`}
              columns={[
                { key: "n", header: "Student", render: (r) => <><p className="font-medium">{r.name}</p><p className="text-xs text-slate-400">{r.enrollmentNo} - {r.program}</p></> },
                { key: "a", header: "Attended", render: (r) => `${r.attended} / ${r.held}` },
                { key: "p", header: "Percent", render: (r) => <Badge tone={attendanceTone(r.percent)}>{r.percent}%</Badge> },
                { key: "w", header: "To reach 75%", render: (r) => (r.needed ? <b className="text-red-700">{r.needed} class(es) in a row</b> : "Above the minimum") },
              ]}
              emptyTitle="Everyone is at 85% or above"
              pageSize={10}
            />
          </Card>
        )}
      </QueryState>
    </>
  );
}
