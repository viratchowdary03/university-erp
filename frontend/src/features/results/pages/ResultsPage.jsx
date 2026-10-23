import { useState } from "react";
import { useSelector } from "react-redux";
import { Trophy, AlertTriangle } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import DataTable from "../../../components/common/DataTable";
import SchoolFilter from "../../../components/common/SchoolFilter";
import Select from "../../../components/common/Select";
import QueryState from "../../../components/common/PageLoader";
import { useData } from "../../../api/resource";
import { ROLES } from "../../../config/roles";
import ResultView from "../components/ResultView";

export default function ResultsPage() {
  const role = useSelector((s) => s.auth.user.role);
  return role === ROLES.STUDENT ? <MyResults /> : <ClassResults />;
}

function MyResults() {
  const query = useData(["results", "me"], "/results/me");
  return (
    <>
      <PageHeader title="My results" subtitle="Published marks, grades, SGPA and CGPA" />
      <QueryState query={query}>{(r) => <ResultView result={r} pdfUrl="/results/me/marksheet" />}</QueryState>
    </>
  );
}

function ClassResults() {
  const [school, setSchool] = useState("ENG");
  const [studentId, setStudentId] = useState("");
  const summary = useData(["results", "summary"], "/results/summary", { params: { school } });
  const students = useData(["students", "for-results"], "/students");
  const one = useData(["results", "student", studentId], `/results/student/${studentId}`, { enabled: Boolean(studentId) });

  const roster = (students.data ?? []).filter((s) => s.school === (summary.data?.school || school));

  return (
    <>
      <PageHeader title="Results" subtitle="Class overview from published exams, and any student's marksheet" action={<SchoolFilter value={school} onChange={(v) => { setSchool(v); setStudentId(""); }} withAll={false} />} />
      <QueryState query={summary}>
        {(s) => (
          <>
            <p className="mb-4 text-sm text-slate-500">{s.publishedExams} published exam(s) - {s.students} student(s) with a CGPA</p>
            <div className="mb-6 grid gap-5 lg:grid-cols-2">
              <Card title="Pass rate by subject">
                {s.subjectRows.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">Nothing published yet</p> : (
                  <ul className="space-y-3">
                    {s.subjectRows.map((r) => (
                      <li key={r.code}>
                        <div className="mb-1 flex justify-between text-sm"><span>{r.code} - {r.name}</span><span className="font-medium">{r.passPercent}% pass - avg {r.average}%</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${r.passPercent < 60 ? "bg-red-500" : r.passPercent < 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${r.passPercent}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Toppers" action={<Trophy size={18} className="text-amber-500" />}>
                <ol className="space-y-2">
                  {s.toppers.map((t, i) => (
                    <li key={t.id} className="flex items-center justify-between text-sm"><span>{i + 1}. {t.name} <span className="text-xs text-slate-400">{t.enrollmentNo}</span></span><Badge tone="green">{t.cgpa}</Badge></li>
                  ))}
                  {s.toppers.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No CGPA yet</p>}
                </ol>
              </Card>
            </div>
            <Card title="Students with backlogs" action={<AlertTriangle size={18} className="text-red-500" />} className="mb-6">
              <DataTable
                rowKey={(r) => r.id}
                rows={s.backlogs}
                getSearchText={(r) => `${r.name} ${r.enrollmentNo}`}
                columns={[
                  { key: "n", header: "Student", render: (r) => <><p className="font-medium">{r.name}</p><p className="text-xs text-slate-400">{r.enrollmentNo}</p></> },
                  { key: "p", header: "Program", render: (r) => r.program },
                  { key: "b", header: "Backlogs", render: (r) => <Badge tone="red">{r.backlogs}</Badge> },
                  { key: "c", header: "CGPA", render: (r) => r.cgpa ?? "-" },
                ]}
                onRowClick={(r) => setStudentId(r.id)}
                emptyTitle="No backlogs"
                pageSize={5}
              />
            </Card>
          </>
        )}
      </QueryState>

      <Card title="Student marksheet">
        <div className="mb-5 max-w-sm">
          <Select label="Choose a student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Select</option>
            {roster.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.enrollmentNo})</option>)}
          </Select>
        </div>
        {studentId && <QueryState query={one}>{(r) => <ResultView result={r} pdfUrl={`/results/student/${studentId}/marksheet`} />}</QueryState>}
      </Card>
    </>
  );
}
