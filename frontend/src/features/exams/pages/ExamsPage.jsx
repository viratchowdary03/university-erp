import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Pencil, Plus, Trash2, ClipboardEdit, Eye, EyeOff } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import Badge from "../../../components/common/Badge";
import DataTable from "../../../components/common/DataTable";
import FilterSelect from "../../../components/common/FilterSelect";
import SchoolFilter from "../../../components/common/SchoolFilter";
import FormModal from "../../../components/common/FormModal";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { PERM, canManage } from "../../../config/permissions";
import { ROLES } from "../../../config/roles";
import { formatIso, getErrorMessage, todayIso } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";

const TYPES = ["Internal", "Midterm", "Final", "Practical"];

export default function ExamsPage() {
  const user = useSelector((s) => s.auth.user);
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const staff = canManage(user.role, PERM.EXAMS);
  const isStudent = user.role === ROLES.STUDENT;

  const [school, setSchool] = useState("");
  const [when, setWhen] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | an exam
  const exams = useData(["exams"], "/exams", { params: school ? { school } : undefined });
  // subjects the person can set exams for (the course list is already limited by school and role)
  const mySubjects = useData(["lms", "courses", "for-exams"], "/lms/courses", { enabled: staff, params: school ? { school } : undefined });

  const subjectOptions = useMemo(() => {
    // faculty can only set exams for the subjects they teach
    const list = (mySubjects.data?.courses ?? []).filter((c) => user.role !== ROLES.FACULTY || c.teaching);
    return list.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` }));
  }, [mySubjects.data, user.role]);

  const fail = (err) => toast.error(getErrorMessage(err));

  const remove = async (e) => {
    if (!(await confirm({ title: "Delete this exam?", message: `${e.name} - ${e.subjectName}. Entered marks are deleted too.`, tone: "danger" }))) return;
    send.mutateAsync({ method: "delete", url: `/exams/${e.id}` }).then(() => toast.success("Exam deleted")).catch(fail);
  };

  const togglePublish = async (e) => {
    const next = !e.published;
    if (!(await confirm({ title: next ? "Publish results?" : "Hide results?", message: next ? "Students will see their marks and results." : "Students will no longer see these marks.", tone: next ? "default" : "danger" }))) return;
    send.mutateAsync({ method: "patch", url: `/exams/${e.id}/publish`, body: { published: next } })
      .then(() => toast.success(next ? "Results published" : "Results hidden")).catch(fail);
  };

  const today = todayIso();
  const columns = [
    { key: "date", header: "Date", render: (e) => <><p className="font-medium">{formatIso(e.date)}</p><p className="text-xs text-slate-400">{e.startTime || ""}</p></> },
    { key: "exam", header: "Exam", render: (e) => <><p className="font-medium">{e.name}</p><p className="text-xs text-slate-400">{e.type}</p></> },
    { key: "subject", header: "Subject", render: (e) => `${e.subjectCode} - ${e.subjectName}` },
    { key: "venue", header: "Venue", render: (e) => e.venue || "-" },
    { key: "max", header: "Max marks", render: (e) => e.maxMarks },
    isStudent
      ? { key: "mine", header: "Your marks", render: (e) => (e.myMarks ? (e.myMarks.absent ? <Badge tone="red">Absent</Badge> : <b>{e.myMarks.marks ?? "-"} / {e.maxMarks}</b>) : e.date <= today ? <span className="text-xs text-slate-400">Awaiting results</span> : <Badge tone="brand">Upcoming</Badge>) }
      : { key: "state", header: "Results", render: (e) => <Badge tone={e.published ? "green" : "amber"}>{e.published ? "Published" : "Not published"}</Badge> },
    ...(staff ? [{
      key: "act", header: "", render: (e) => e.manageable && (
        <div className="flex justify-end gap-1">
          <Link to={`/exams/${e.id}/marks`} title="Enter marks" aria-label="Enter marks" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"><ClipboardEdit size={16} /></Link>
          <button type="button" title={e.published ? "Hide results" : "Publish results"} aria-label={e.published ? "Hide results" : "Publish results"} onClick={() => togglePublish(e)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600">{e.published ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          <button type="button" title="Edit" aria-label="Edit exam" onClick={() => setEditing(e)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button>
          <button type="button" title="Delete" aria-label="Delete exam" onClick={() => remove(e)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"><Trash2 size={16} /></button>
        </div>
      ),
    }] : []),
  ];

  const fields = [
    { name: "name", label: "Exam name", required: true, placeholder: "Internal Test 2" },
    { name: "type", label: "Type", type: "select", required: true, options: TYPES.map((t) => ({ value: t, label: t })) },
    editing === "new"
      ? { name: "subjectCode", label: "Subject", type: "select", required: true, options: subjectOptions }
      : { name: "subjectCode", label: "Subject", type: "select", required: true, options: subjectOptions, hint: "The subject cannot be changed" },
    { name: "maxMarks", label: "Maximum marks", type: "number", required: true, min: 1, max: 500 },
    { name: "date", label: "Date", type: "date", required: true },
    { name: "startTime", label: "Start time", type: "time" },
    { name: "venue", label: "Venue", span: 2 },
  ];

  return (
    <>
      <PageHeader
        title="Exams"
        subtitle={isStudent ? "Your exam schedule and marks" : "Schedule exams, enter marks and publish results"}
        action={staff && <Button onClick={() => setEditing("new")}><Plus size={16} /> New exam</Button>}
      />
      <QueryState query={exams} table>
        {(rows) => (
          <Card>
            <DataTable
              rowKey={(r) => r.id}
              rows={rows.filter((e) => !when || (when === "upcoming" ? e.date >= today : e.date < today))}
              getSearchText={(e) => `${e.name} ${e.subjectCode} ${e.subjectName} ${e.type}`}
              searchPlaceholder="Search exam or subject"
              filters={<>
                <SchoolFilter value={school} onChange={setSchool} />
                <FilterSelect label="When" value={when} onChange={setWhen} options={[{ value: "", label: "All" }, { value: "upcoming", label: "Upcoming" }, { value: "past", label: "Past" }]} />
              </>}
              columns={columns}
              emptyTitle="No exams yet"
              emptyText={staff ? "Use New exam to schedule one." : undefined}
            />
          </Card>
        )}
      </QueryState>

      <FormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New exam" : "Edit exam"}
        fields={fields}
        initial={editing && editing !== "new" ? editing : { type: "Internal", maxMarks: 30 }}
        submitLabel={editing === "new" ? "Create exam" : "Save changes"}
        onSubmit={async (v) => {
          if (editing === "new") await send.mutateAsync({ method: "post", url: "/exams", body: v });
          else await send.mutateAsync({ method: "put", url: `/exams/${editing.id}`, body: v });
          toast.success(editing === "new" ? "Exam created" : "Exam updated");
          setEditing(null);
        }}
      />
    </>
  );
}
