import { useState } from "react";
import { useSelector } from "react-redux";
import { Briefcase, Building2, Pencil, Plus, Trash2, Users } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import StatCard from "../../../components/common/StatCard";
import Tabs from "../../../components/common/Tabs";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import DataTable from "../../../components/common/DataTable";
import FormModal from "../../../components/common/FormModal";
import EmptyState from "../../../components/common/EmptyState";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { PERM, canManage } from "../../../config/permissions";
import { ROLES } from "../../../config/roles";
import { SCHOOLS } from "../../../config/schools";
import { formatIso, humanize, getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";

const APP_STATUSES = ["applied", "shortlisted", "interview", "selected", "rejected"];
const APP_TONE = { applied: "slate", shortlisted: "brand", interview: "amber", selected: "green", rejected: "red" };

export default function PlacementsPage() {
  const user = useSelector((s) => s.auth.user);
  const staff = canManage(user.role, PERM.PLACEMENTS);
  const student = user.role === ROLES.STUDENT;
  const [tab, setTab] = useState("jobs");
  return (
    <>
      <PageHeader title="Placements" subtitle={staff ? "Companies, job posts and applicants" : student ? "Open jobs and your applications" : "Open jobs for your students"} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "jobs", label: "Jobs" }, ...(student ? [{ id: "mine", label: "My applications" }] : []), ...(staff ? [{ id: "companies", label: "Companies" }] : [])]} />
      {tab === "jobs" && <Jobs staff={staff} student={student} />}
      {tab === "mine" && <MyApplications />}
      {tab === "companies" && <Companies />}
    </>
  );
}

function Jobs({ staff, student }) {
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const jobs = useData(["placements", "jobs"], "/placements/jobs");
  const companies = useData(["placements", "companies"], "/placements/companies", { enabled: staff });
  const stats = useData(["placements", "stats"], "/placements/stats", { enabled: staff });

  const apply = (j) => send.mutateAsync({ method: "post", url: `/placements/jobs/${j.id}/apply` }).then(() => toast.success(`Applied to ${j.title}`)).catch((e) => toast.error(getErrorMessage(e)));
  const remove = async (j) => {
    if (!(await confirm({ title: "Delete this job?", message: `${j.title} - applications are deleted too.`, tone: "danger" }))) return;
    send.mutateAsync({ method: "delete", url: `/placements/jobs/${j.id}` }).then(() => toast.success("Job deleted")).catch((e) => toast.error(getErrorMessage(e)));
  };

  return (
    <>
      {staff && stats.data && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Companies" value={stats.data.companies} icon={Building2} />
          <StatCard label="Open jobs" value={stats.data.openJobs} icon={Briefcase} tone="green" />
          <StatCard label="Applications" value={stats.data.applications} icon={Users} tone="amber" />
          <StatCard label="Selected" value={stats.data.selected} tone="green" />
        </div>
      )}
      {staff && <div className="mb-4 flex justify-end"><Button onClick={() => setEditing("new")} disabled={(companies.data ?? []).length === 0}><Plus size={16} /> Post a job</Button></div>}
      <QueryState query={jobs}>
        {(rows) => rows.length === 0 ? <Card><EmptyState icon={Briefcase} title="No jobs posted yet" /></Card> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {rows.map((j) => (
              <Card key={j.id} className={j.status === "closed" || j.expired ? "opacity-70" : ""}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">{j.title}</h2>
                    <p className="text-sm text-slate-500">{j.companyName} - {j.location || "Location not set"}</p>
                  </div>
                  <Badge tone={j.type === "Internship" ? "amber" : "brand"}>{j.type}</Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">{j.description}</p>
                <p className="mt-3 text-xs text-slate-400">{j.packageLpa ? `₹${j.packageLpa} LPA - ` : ""}{j.openings} opening(s) - min CGPA {j.minCgpa} - {j.schools.length ? j.schools.join(", ") : "all schools"} - apply by {formatIso(j.deadline)}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {student && (j.applied ? <Badge tone="green">Applied</Badge> : j.status !== "open" || j.expired ? <Badge>Closed</Badge> : j.eligible === false ? <Badge tone="red">Not eligible</Badge> : <Button className="px-3 py-1.5" onClick={() => apply(j)}>Apply</Button>)}
                  {staff && (
                    <>
                      <Button variant="secondary" className="px-3 py-1.5" onClick={() => setViewing(j)}><Users size={14} /> {j.applicants} applicant(s)</Button>
                      <button type="button" aria-label="Edit job" onClick={() => setEditing(j)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button>
                      <button type="button" aria-label="Delete job" onClick={() => remove(j)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"><Trash2 size={16} /></button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryState>

      <FormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Post a job" : "Edit job"}
        size="lg"
        initial={editing && editing !== "new" ? editing : { type: "Full-time", openings: 1, minCgpa: 0, status: "open", schools: [] }}
        fields={[
          { name: "companyId", label: "Company", type: "select", required: true, options: (companies.data ?? []).map((c) => ({ value: c.id, label: c.name })) },
          { name: "title", label: "Job title", required: true },
          { name: "type", label: "Type", type: "select", options: ["Full-time", "Internship"].map((t) => ({ value: t, label: t })) },
          { name: "location", label: "Location" },
          { name: "packageLpa", label: "Package (₹ LPA)", type: "number", step: "0.1", min: 0 },
          { name: "openings", label: "Openings", type: "number", min: 1, required: true },
          { name: "minCgpa", label: "Minimum CGPA", type: "number", step: "0.1", min: 0, max: 10 },
          { name: "deadline", label: "Apply by", type: "date", required: true },
          { name: "status", label: "Status", type: "select", options: [{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }] },
          { name: "schools", label: "Open to these schools (none ticked = all)", type: "checkboxes", options: SCHOOLS.map((s) => ({ value: s.code, label: s.code })) },
          { name: "description", label: "Description", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          if (editing === "new") await send.mutateAsync({ method: "post", url: "/placements/jobs", body: v });
          else await send.mutateAsync({ method: "put", url: `/placements/jobs/${editing.id}`, body: v });
          toast.success("Job saved");
          setEditing(null);
        }}
      />
      {viewing && <Applicants job={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

function Applicants({ job, onClose }) {
  const toast = useToast();
  const send = useSend();
  const query = useData(["placements", "applicants", job.id], `/placements/jobs/${job.id}/applications`);
  const set = (a, status) => send.mutateAsync({ method: "patch", url: `/placements/applications/${a.id}`, body: { status } }).then(() => toast.success("Status updated")).catch((e) => toast.error(getErrorMessage(e)));
  return (
    <Modal open onClose={onClose} title={`Applicants: ${job.title}`} size="lg">
      <QueryState query={query} table>
        {(rows) => rows.length === 0 ? <EmptyState title="Nobody has applied yet" /> : (
          <ul className="divide-y">
            {rows.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><p className="font-medium">{a.studentName}</p><p className="text-xs text-slate-400">{a.enrollmentNo} - {a.program} - CGPA {a.cgpa ?? "-"}</p></div>
                <select aria-label={`Status of ${a.studentName}`} value={a.status} onChange={(e) => set(a, e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
                  {APP_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                </select>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </Modal>
  );
}

function MyApplications() {
  const query = useData(["placements", "mine"], "/placements/applications/mine");
  return (
    <QueryState query={query} table>
      {(rows) => (
        <Card>
          <DataTable
            rowKey={(r) => r.id}
            rows={rows}
            columns={[
              { key: "j", header: "Job", render: (r) => <><p className="font-medium">{r.jobTitle}</p><p className="text-xs text-slate-400">{r.companyName}</p></> },
              { key: "p", header: "Package", render: (r) => (r.packageLpa ? `₹${r.packageLpa} LPA` : "-") },
              { key: "s", header: "Status", render: (r) => <Badge tone={APP_TONE[r.status]}>{humanize(r.status)}</Badge> },
              { key: "n", header: "Note", render: (r) => r.note || "-" },
            ]}
            emptyTitle="You have not applied to any job yet"
          />
        </Card>
      )}
    </QueryState>
  );
}

function Companies() {
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const [editing, setEditing] = useState(null);
  const query = useData(["placements", "companies"], "/placements/companies");
  const remove = async (c) => {
    if (!(await confirm({ title: "Delete this company?", message: c.name, tone: "danger" }))) return;
    send.mutateAsync({ method: "delete", url: `/placements/companies/${c.id}` }).then(() => toast.success("Company deleted")).catch((e) => toast.error(getErrorMessage(e)));
  };
  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setEditing("new")}><Plus size={16} /> Add company</Button></div>
      <QueryState query={query} table>
        {(rows) => (
          <Card>
            <DataTable
              rowKey={(r) => r.id}
              rows={rows}
              getSearchText={(c) => `${c.name} ${c.industry || ""}`}
              columns={[
                { key: "n", header: "Company", render: (c) => <><p className="font-medium">{c.name}</p><p className="text-xs text-slate-400">{c.industry}</p></> },
                { key: "c", header: "Contact", render: (c) => <>{c.contactName}<p className="text-xs text-slate-400">{c.contactEmail}</p></> },
                { key: "a", header: "", render: (c) => <div className="flex justify-end gap-1"><button type="button" aria-label="Edit company" onClick={() => setEditing(c)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button><button type="button" aria-label="Delete company" onClick={() => remove(c)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"><Trash2 size={16} /></button></div> },
              ]}
              emptyTitle="No companies yet"
            />
          </Card>
        )}
      </QueryState>
      <FormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add company" : "Edit company"}
        initial={editing && editing !== "new" ? editing : {}}
        fields={[
          { name: "name", label: "Company name", required: true },
          { name: "industry", label: "Industry" },
          { name: "website", label: "Website", type: "url" },
          { name: "contactName", label: "Contact person" },
          { name: "contactEmail", label: "Contact email", type: "email" },
          { name: "description", label: "About", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          if (editing === "new") await send.mutateAsync({ method: "post", url: "/placements/companies", body: v });
          else await send.mutateAsync({ method: "put", url: `/placements/companies/${editing.id}`, body: v });
          toast.success("Company saved");
          setEditing(null);
        }}
      />
    </>
  );
}
