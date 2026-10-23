import { useMemo, useState } from "react";
import DataTable from "../../../components/common/DataTable";
import FilterSelect from "../../../components/common/FilterSelect";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import FormModal from "../../../components/common/FormModal";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useData, useSend } from "../../../api/resource";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";
import { getErrorMessage } from "../../../utils/helpers";

const COLUMNS = [
  { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs text-slate-500">{r.code}</span> },
  { key: "name", header: "Subject", render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
  { key: "schoolName", header: "School" },
  { key: "type", header: "Type", render: (r) => <Badge tone={r.type === "Lab" ? "amber" : "slate"}>{r.type}</Badge> },
  { key: "credits", header: "Credits" },
  { key: "facultyName", header: "Taught by" },
];

export default function SubjectsTab({ subjects, schools, manage = false }) {
  const [school, setSchool] = useState("");
  const [editing, setEditing] = useState(null);
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const teachers = useData(["faculty", "all"], "/faculty", { enabled: manage });
  const columns = manage
    ? [...COLUMNS, { key: "act", header: "", render: (r) => (
        <div className="flex justify-end gap-1">
          <button type="button" aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button>
          <button type="button" aria-label={`Delete ${r.name}`} onClick={() => remove(r)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"><Trash2 size={16} /></button>
        </div>
      ) }]
    : COLUMNS;
  const remove = async (r) => {
    if (!(await confirm({ title: "Delete this subject?", message: `${r.code} - ${r.name}`, tone: "danger" }))) return;
    send.mutateAsync({ method: "delete", url: `/academic/subjects/${r.id}` }).then(() => toast.success("Subject deleted")).catch((e) => toast.error(getErrorMessage(e)));
  };
  const teacherOptions = (code) => (teachers.data ?? []).filter((t) => t.school === code).map((t) => ({ value: t.id, label: t.name }));
  const rows = useMemo(() => subjects.filter((s) => !school || s.school === school), [subjects, school]);

  return (
    <>
    {manage && <div className="mb-4 flex justify-end"><Button onClick={() => setEditing("new")}><Plus size={16} /> Add subject</Button></div>}
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.code}
      getSearchText={(r) => `${r.code} ${r.name} ${r.schoolName} ${r.facultyName}`}
      searchPlaceholder="Search subjects"
      pageSize={10}
      filters={
        <FilterSelect
          label="School"
          value={school}
          onChange={setSchool}
          options={[{ value: "", label: "All schools" }, ...schools.map((s) => ({ value: s.code, label: s.name }))]}
        />
      }
    />
    <FormModal
      open={Boolean(editing)}
      onClose={() => setEditing(null)}
      title={editing === "new" ? "Add subject" : `Edit ${editing?.name || ""}`}
      initial={editing && editing !== "new" ? { ...editing, facultyId: editing.facultyId || "" } : { type: "Theory", credits: 3, semester: 3 }}
      fields={[
        ...(editing === "new"
          ? [{ name: "school", label: "School", type: "select", required: true, options: schools.map((s) => ({ value: s.code, label: s.name })) }, { name: "code", label: "Subject code", required: true, placeholder: "ENG301" }]
          : []),
        { name: "name", label: "Subject name", required: true, span: 2 },
        { name: "type", label: "Type", type: "select", required: true, options: ["Theory", "Lab"].map((t) => ({ value: t, label: t })) },
        { name: "credits", label: "Credits", type: "number", required: true, min: 0, max: 12 },
        { name: "semester", label: "Semester", type: "number", required: true, min: 1, max: 10 },
        { name: "facultyId", label: "Taught by (a teacher of the same school)", type: "select", placeholder: "Not assigned yet", options: teacherOptions(editing === "new" ? "" : editing?.school), span: 2, hint: editing === "new" ? "You can assign a teacher after adding the subject." : undefined },
      ]}
      onSubmit={async (v) => {
        if (editing === "new") await send.mutateAsync({ method: "post", url: "/academic/subjects", body: { ...v, facultyId: undefined } });
        else await send.mutateAsync({ method: "put", url: `/academic/subjects/${editing.id}`, body: { name: v.name, type: v.type, credits: v.credits, semester: v.semester, facultyId: v.facultyId || null } });
        toast.success("Subject saved");
        setEditing(null);
      }}
    />
    </>
  );
}
