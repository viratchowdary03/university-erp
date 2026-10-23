import { useMemo, useState } from "react";
import DataTable from "../../../components/common/DataTable";
import FilterSelect from "../../../components/common/FilterSelect";
import Button from "../../../components/common/Button";
import FormModal from "../../../components/common/FormModal";
import { Plus, Trash2 } from "lucide-react";
import { useSend } from "../../../api/resource";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";
import { getErrorMessage } from "../../../utils/helpers";

const COLUMNS = [
  { key: "program", header: "Program", render: (r) => <span className="font-medium text-slate-800">{r.program}</span> },
  { key: "schoolName", header: "School" },
  { key: "students", header: "Students enrolled", className: "text-right" },
];

export default function ProgramsTab({ programs, schools, manage = false }) {
  const [school, setSchool] = useState("");
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const remove = async (r) => {
    if (!(await confirm({ title: "Remove this program?", message: `${r.program} (${r.schoolName})`, tone: "danger" }))) return;
    send.mutateAsync({ method: "delete", url: `/academic/schools/${r.school}/programs`, body: { program: r.program } }).then(() => toast.success("Program removed")).catch((e) => toast.error(getErrorMessage(e)));
  };
  const columns = manage ? [...COLUMNS, { key: "act", header: "", render: (r) => <button type="button" aria-label={`Remove ${r.program}`} onClick={() => remove(r)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"><Trash2 size={16} /></button> }] : COLUMNS;
  const rows = useMemo(() => programs.filter((p) => !school || p.school === school), [programs, school]);

  return (
    <>
    {manage && <div className="mb-4 flex justify-end"><Button onClick={() => setAdding(true)}><Plus size={16} /> Add program</Button></div>}
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      getSearchText={(r) => `${r.program} ${r.schoolName}`}
      searchPlaceholder="Search programs"
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
      open={adding}
      onClose={() => setAdding(false)}
      title="Add a program"
      fields={[
        { name: "school", label: "School", type: "select", required: true, options: schools.map((s) => ({ value: s.code, label: s.name })) },
        { name: "program", label: "Program name", required: true, placeholder: "B.Tech Data Science" },
      ]}
      onSubmit={async (v) => { await send.mutateAsync({ method: "post", url: `/academic/schools/${v.school}/programs`, body: { program: v.program } }); toast.success("Program added"); setAdding(false); }}
    />
    </>
  );
}
