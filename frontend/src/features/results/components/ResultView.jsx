import { Download } from "lucide-react";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import Badge from "../../../components/common/Badge";
import StatCard from "../../../components/common/StatCard";
import EmptyState from "../../../components/common/EmptyState";
import { downloadFile } from "../../../api/resource";
import { useToast } from "../../../hooks/useToast";
import { getErrorMessage } from "../../../utils/helpers";
import { Award, BookX, GraduationCap } from "lucide-react";

const gradeTone = (g) => (g === "F" ? "red" : g === "O" || g === "A+" ? "green" : "brand");

// One student's published results, semester by semester. `pdfUrl` makes the marksheet button work.
export default function ResultView({ result, pdfUrl }) {
  const toast = useToast();
  const { student, semesters, cgpa, backlogs } = result;
  const save = () => downloadFile(pdfUrl, `marksheet-${student.enrollmentNo}.pdf`).catch((e) => toast.error(getErrorMessage(e)));

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="CGPA" value={cgpa ?? "-"} icon={Award} tone="brand" hint="Out of 10" />
        <StatCard label="Backlogs" value={backlogs} icon={BookX} tone={backlogs ? "red" : "green"} hint={backlogs ? "Subjects below 40%" : "All subjects cleared"} />
        <StatCard label="Semesters published" value={semesters.length} icon={GraduationCap} tone="green" />
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600"><b>{student.name}</b> - {student.enrollmentNo} - {student.program}</p>
        {semesters.length > 0 && <Button variant="secondary" onClick={save}><Download size={16} /> Download marksheet (PDF)</Button>}
      </div>

      {semesters.length === 0 ? (
        <Card><EmptyState title="No results published yet" text="Marks appear here after your teachers publish them." /></Card>
      ) : (
        semesters.map((sem) => (
          <Card key={sem.semester} className="mb-5" title={`Semester ${sem.semester}`} action={<span className="text-sm text-slate-500">SGPA <b className="text-slate-900">{sem.sgpa ?? "-"}</b></span>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-slate-400">
                  <tr><th className="px-3 py-2 font-medium">Subject</th><th className="px-3 py-2 font-medium">Exams</th><th className="px-3 py-2 font-medium">Total</th><th className="px-3 py-2 font-medium">%</th><th className="px-3 py-2 font-medium">Grade</th><th className="px-3 py-2 font-medium">Result</th></tr>
                </thead>
                <tbody className="divide-y">
                  {sem.subjects.map((s) => (
                    <tr key={s.code}>
                      <td className="px-3 py-2.5"><p className="font-medium">{s.name}</p><p className="text-xs text-slate-400">{s.code} - {s.credits} credits</p></td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{s.exams.map((e) => `${e.name}: ${e.absent ? "AB" : e.marks ?? "-"}/${e.max}`).join(", ")}</td>
                      <td className="px-3 py-2.5">{s.obtained}/{s.max}</td>
                      <td className="px-3 py-2.5">{s.percentage}%</td>
                      <td className="px-3 py-2.5"><Badge tone={gradeTone(s.grade)}>{s.grade}</Badge></td>
                      <td className="px-3 py-2.5"><Badge tone={s.passed ? "green" : "red"}>{s.passed ? "Pass" : "Fail"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}
    </>
  );
}
