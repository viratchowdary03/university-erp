import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import Badge from "../../../components/common/Badge";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { formatIso, getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";

export default function MarksEntryPage() {
  const { id } = useParams();
  const query = useData(["exams", "marks", id], `/exams/${id}/marks`);
  return (
    <>
      <Link to="/exams" className="mb-3 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"><ArrowLeft size={15} /> All exams</Link>
      <QueryState query={query} table>{(data) => <Sheet key={data.exam.id + data.rows.length} data={data} id={id} />}</QueryState>
    </>
  );
}

function Sheet({ data, id }) {
  const toast = useToast();
  const send = useSend();
  const { exam } = data;
  const [rows, setRows] = useState(data.rows);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (studentId, patch) => {
    setDirty(true);
    setRows((rs) => rs.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)));
  };
  const invalid = (r) => !r.absent && r.marks !== null && r.marks !== "" && (Number(r.marks) < 0 || Number(r.marks) > exam.maxMarks);
  const bad = rows.filter(invalid).length;
  const entered = rows.filter((r) => r.absent || (r.marks !== null && r.marks !== "")).length;

  const save = async () => {
    try {
      await send.mutateAsync({
        method: "put", url: `/exams/${id}/marks`,
        body: { entries: rows.map((r) => ({ studentId: r.studentId, absent: r.absent, marks: r.absent || r.marks === "" || r.marks === null ? null : Number(r.marks) })) },
      });
      setDirty(false);
      toast.success("Marks saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title={`${exam.name}: ${exam.subjectName}`}
        subtitle={`${exam.type} - ${formatIso(exam.date)} - maximum ${exam.maxMarks} marks`}
        action={exam.published ? <Badge tone="green">Published (unpublish to edit)</Badge> : <Button onClick={save} loading={send.isPending} disabled={!dirty || bad > 0}><Save size={16} /> Save marks</Button>}
      />
      <Card>
        <p className="mb-4 text-sm text-slate-500">{entered} of {rows.length} entered{bad > 0 && <span className="ml-2 font-medium text-red-600">{bad} mark(s) above {exam.maxMarks}</span>}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b text-xs uppercase tracking-wide text-slate-400">
              <tr><th className="px-3 py-2.5 font-medium">Enrollment</th><th className="px-3 py-2.5 font-medium">Name</th><th className="px-3 py-2.5 font-medium">Marks</th><th className="px-3 py-2.5 font-medium">Absent</th></tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.studentId}>
                  <td className="px-3 py-2 text-slate-500">{r.enrollmentNo}</td>
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min="0" max={exam.maxMarks} step="0.5" aria-label={`Marks for ${r.name}`}
                      disabled={r.absent || exam.published} value={r.marks ?? ""}
                      onChange={(e) => update(r.studentId, { marks: e.target.value === "" ? null : e.target.value })}
                      className={`w-24 rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-4 disabled:bg-slate-50 ${invalid(r) ? "border-red-400 focus:ring-red-100" : "border-slate-300 focus:border-brand-500 focus:ring-brand-100"}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input type="checkbox" aria-label={`${r.name} was absent`} disabled={exam.published} checked={r.absent} onChange={(e) => update(r.studentId, { absent: e.target.checked, marks: e.target.checked ? null : r.marks })} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
