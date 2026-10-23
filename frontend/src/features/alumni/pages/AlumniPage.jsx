import { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Pencil, Plus, Trash2, Handshake } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import DataTable from "../../../components/common/DataTable";
import FilterSelect from "../../../components/common/FilterSelect";
import FormModal from "../../../components/common/FormModal";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { PERM, canManage } from "../../../config/permissions";
import { SCHOOLS, getSchoolName } from "../../../config/schools";
import { getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";

export const ALUMNI_FIELDS = [
  { name: "name", label: "Name", required: true },
  { name: "email", label: "Email", type: "email" },
  { name: "school", label: "School", type: "select", required: true, options: SCHOOLS.map((s) => ({ value: s.code, label: s.name })) },
  { name: "program", label: "Program" },
  { name: "graduationYear", label: "Graduation year", type: "number", required: true, min: 1950 },
  { name: "company", label: "Company" },
  { name: "designation", label: "Designation" },
  { name: "city", label: "City" },
  { name: "linkedin", label: "LinkedIn address", type: "url" },
  { name: "bio", label: "About", type: "textarea" },
  { name: "mentor", label: "Happy to mentor current students", type: "checkbox" },
];

export default function AlumniPage() {
  const user = useSelector((s) => s.auth.user);
  const manage = canManage(user.role, PERM.ALUMNI);
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const [school, setSchool] = useState("");
  const [mentor, setMentor] = useState("");
  const [editing, setEditing] = useState(null);
  const query = useData(["alumni"], "/alumni");

  const remove = async (a) => {
    if (!(await confirm({ title: "Remove this alumni profile?", message: a.name, tone: "danger" }))) return;
    send.mutateAsync({ method: "delete", url: `/alumni/${a.id}` }).then(() => toast.success("Profile removed")).catch((e) => toast.error(getErrorMessage(e)));
  };

  return (
    <>
      <PageHeader title="Alumni" subtitle="Graduates of the university: find mentors and connections" action={manage && <Button onClick={() => setEditing("new")}><Plus size={16} /> Add alumni</Button>} />
      <QueryState query={query} table>
        {(rows) => (
          <Card>
            <DataTable
              rowKey={(r) => r.id}
              rows={rows.filter((a) => (!school || a.school === school) && (!mentor || a.mentor))}
              getSearchText={(a) => `${a.name} ${a.company || ""} ${a.designation || ""} ${a.city || ""} ${a.graduationYear}`}
              searchPlaceholder="Search name, company, city or year"
              filters={<><FilterSelect label="School" value={school} onChange={setSchool} options={[{ value: "", label: "All" }, ...SCHOOLS.map((s) => ({ value: s.code, label: s.code }))]} /><FilterSelect label="Mentors" value={mentor} onChange={setMentor} options={[{ value: "", label: "Everyone" }, { value: "yes", label: "Open to mentor" }]} /></>}
              columns={[
                { key: "n", header: "Name", render: (a) => <Link to={`/alumni/${a.id}`} className="font-medium text-brand-700 hover:underline">{a.name}</Link> },
                { key: "s", header: "School", render: (a) => <>{getSchoolName(a.school)}<p className="text-xs text-slate-400">Class of {a.graduationYear}</p></> },
                { key: "w", header: "Works at", render: (a) => <>{a.company || "-"}<p className="text-xs text-slate-400">{a.designation}</p></> },
                { key: "c", header: "City", render: (a) => a.city || "-" },
                { key: "m", header: "", render: (a) => a.mentor && <Badge tone="green"><Handshake size={12} className="mr-1" />Mentor</Badge> },
                ...(manage ? [{ key: "x", header: "", render: (a) => <div className="flex justify-end gap-1"><button type="button" aria-label="Edit" onClick={() => setEditing(a)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button><button type="button" aria-label="Remove" onClick={() => remove(a)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"><Trash2 size={16} /></button></div> }] : []),
              ]}
              emptyTitle="No alumni found"
            />
          </Card>
        )}
      </QueryState>
      <FormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add alumni" : "Edit alumni"}
        size="lg"
        initial={editing && editing !== "new" ? editing : { mentor: false }}
        fields={ALUMNI_FIELDS}
        onSubmit={async (v) => {
          if (editing === "new") await send.mutateAsync({ method: "post", url: "/alumni", body: v });
          else await send.mutateAsync({ method: "put", url: `/alumni/${editing.id}`, body: v });
          toast.success("Alumni saved");
          setEditing(null);
        }}
      />
    </>
  );
}
