import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GraduationCap, Percent, Wallet, BedDouble } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import StatCard from "../../../components/common/StatCard";
import Badge from "../../../components/common/Badge";
import DataTable from "../../../components/common/DataTable";
import SchoolFilter from "../../../components/common/SchoolFilter";
import QueryState from "../../../components/common/PageLoader";
import { useData } from "../../../api/resource";
import { formatMoney } from "../../../utils/helpers";

const COLORS = ["#dc2626", "#f59e0b", "#10b981", "#0d9488"];

function Distribution({ title, data }) {
  return (
    <Card title={title}>
      <div className="h-56" role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${d.count}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>{data.map((d, i) => <Cell key={d.label} fill={COLORS[i]} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [school, setSchool] = useState("");
  const query = useData(["analytics", "insights"], "/analytics/insights", { params: { school: school || undefined } });
  return (
    <>
      <PageHeader title="Analytics" subtitle="Where students stand and who needs attention" action={<SchoolFilter value={school} onChange={setSchool} />} />
      <QueryState query={query}>
        {(d) => (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Students" value={d.studentCount} icon={GraduationCap} />
              <StatCard label="Average attendance" value={`${d.averageAttendance}%`} icon={Percent} tone={d.averageAttendance < 75 ? "red" : "green"} />
              <StatCard label="Fees collected" value={`${d.fees.rate}%`} hint={`${formatMoney(d.fees.collected)} of ${formatMoney(d.fees.billed)}`} icon={Wallet} tone="amber" />
              {d.hostel && <StatCard label="Hostel occupancy" value={d.hostel.capacity ? `${Math.round((d.hostel.residents / d.hostel.capacity) * 100)}%` : "-"} hint={`${d.hostel.residents} of ${d.hostel.capacity} beds`} icon={BedDouble} />}
            </div>
            <div className="mb-6 grid gap-5 lg:grid-cols-2">
              <Distribution title="Attendance spread" data={d.attendanceBuckets} />
              <Distribution title="CGPA spread" data={d.cgpaBands} />
            </div>
            {d.enrollmentBySchool && (
              <Card title="Students per school" className="mb-6">
                <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                  {d.enrollmentBySchool.map((s) => <li key={s.code} className="flex justify-between border-b border-slate-100 py-1 text-sm"><span className="text-slate-600">{s.name}</span><b>{s.count}</b></li>)}
                </ul>
              </Card>
            )}
            <Card title="Students who need attention">
              <DataTable
                rowKey={(r) => r.id}
                rows={d.atRisk}
                getSearchText={(r) => `${r.name} ${r.enrollmentNo}`}
                columns={[
                  { key: "n", header: "Student", render: (r) => <><p className="font-medium">{r.name}</p><p className="text-xs text-slate-400">{r.enrollmentNo} - {r.program}</p></> },
                  { key: "a", header: "Attendance", render: (r) => <Badge tone={r.attendance < 75 ? "red" : "green"}>{r.attendance}%</Badge> },
                  { key: "c", header: "CGPA", render: (r) => r.cgpa ?? "-" },
                  { key: "w", header: "Why", render: (r) => r.reason },
                ]}
                emptyTitle="Nobody is at risk"
                pageSize={8}
              />
            </Card>
          </>
        )}
      </QueryState>
    </>
  );
}
