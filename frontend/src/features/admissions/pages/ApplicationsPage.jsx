import { useMemo, useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import StatCard from "../../../components/common/StatCard";
import DataTable from "../../../components/common/DataTable";
import FilterSelect from "../../../components/common/FilterSelect";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import DetailList from "../../../components/common/DetailList";
import FormModal from "../../../components/common/FormModal";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { getSchoolName } from "../../../config/schools";
import { formatDate, getErrorMessage, humanize } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";
import { STATUS_TONE } from "../components/statusTone";

const STATUSES = ["submitted", "under_review", "shortlisted", "approved", "rejected", "enrolled"];

export default function ApplicationsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(null);
  const [deciding, setDeciding] = useState(null);
  const query = useData(["admissions", "list"], "/admissions");

  const run = async (action, success) => {
    try {
      await action();
      toast.success(success);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const enroll = async (a) => {
    if (!(await confirm({ title: `Enroll ${a.name}?`, message: "A student record is created. They then register with the same email to get a login." }))) return;
    run(async () => {
      const result = await send.mutateAsync({ method: "post", url: `/admissions/${a.id}/enroll` });
      setOpen(null);
      toast.success(`Enrollment number ${result.student.enrollmentNo}`);
    }, `${a.name} is enrolled`);
  };

  const remove = async (a) => {
    if (!(await confirm({ title: "Delete this application?", message: a.name, tone: "danger" }))) return;
    run(() => send.mutateAsync({ method: "delete", url: `/admissions/${a.id}` }), "Application deleted");
  };

  return (
    <>
      <PageHeader title="Admissions" subtitle="Applications from the public form. Review, approve, then enroll." />
      <QueryState query={query} table>
        {({ items, counts }) => (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="New" value={counts.submitted || 0} tone="amber" />
              <StatCard label="In review" value={(counts.under_review || 0) + (counts.shortlisted || 0)} />
              <StatCard label="Approved, not enrolled" value={counts.approved || 0} tone="green" />
              <StatCard label="Enrolled" value={counts.enrolled || 0} tone="green" />
            </div>
            <Card>
              <DataTable
                rowKey={(r) => r.id}
                rows={items.filter((a) => !status || a.status === status)}
                getSearchText={(a) => `${a.name} ${a.email} ${a.applicationNo} ${a.program}`}
                searchPlaceholder="Search name, number or program"
                filters={<FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "", label: "All" }, ...STATUSES.map((s) => ({ value: s, label: humanize(s) }))]} />}
                columns={[
                  { key: "no", header: "Number", render: (a) => <span className="font-medium">{a.applicationNo}</span> },
                  { key: "name", header: "Applicant", render: (a) => <><p>{a.name}</p><p className="text-xs text-slate-400">{a.email}</p></> },
                  { key: "program", header: "Program", render: (a) => <><p>{a.program}</p><p className="text-xs text-slate-400">{getSchoolName(a.school)}</p></> },
                  { key: "pct", header: "Marks", render: (a) => `${a.percentage}%` },
                  { key: "date", header: "Applied", render: (a) => formatDate(a.createdAt) },
                  { key: "status", header: "Status", render: (a) => <Badge tone={STATUS_TONE[a.status]}>{humanize(a.status)}</Badge> },
                  { key: "act", header: "", render: (a) => <Button variant="secondary" className="px-3 py-1.5" onClick={() => setOpen(a)}><Eye size={14} /> Open</Button> },
                ]}
                emptyTitle="No applications"
              />
            </Card>
          </>
        )}
      </QueryState>

      <Modal open={Boolean(open)} onClose={() => setOpen(null)} title={open?.name || ""} size="lg">
        {open && (
          <>
            <DetailList items={[
              ["Application", open.applicationNo], ["Status", humanize(open.status)], ["Email", open.email], ["Phone", open.phone],
              ["Program", open.program], ["School", getSchoolName(open.school)], ["Date of birth", open.dateOfBirth], ["City", open.city],
              ["Previous school", open.previousSchool], ["Percentage", `${open.percentage}%`], ["Guardian", `${open.guardianName} (${open.guardianPhone})`],
              ["Statement", open.statement || "-"], ["Remarks", open.remarks || "-"],
            ].map(([label, value]) => ({ label, value }))} />
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {open.status !== "enrolled" && <Button variant="secondary" onClick={() => setDeciding(open)}>Change status</Button>}
              {open.status === "approved" && <Button onClick={() => enroll(open)}>Enroll as student</Button>}
              {open.status !== "enrolled" && <Button variant="danger" onClick={() => { setOpen(null); remove(open); }}><Trash2 size={15} /> Delete</Button>}
            </div>
          </>
        )}
      </Modal>

      <FormModal
        open={Boolean(deciding)}
        onClose={() => setDeciding(null)}
        title={`Update ${deciding?.name || ""}`}
        initial={{ status: deciding?.status, remarks: deciding?.remarks || "" }}
        fields={[
          { name: "status", label: "Status", type: "select", required: true, span: 2, options: ["under_review", "shortlisted", "approved", "rejected"].map((s) => ({ value: s, label: humanize(s) })) },
          { name: "remarks", label: "Note for the applicant (optional)", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          await send.mutateAsync({ method: "patch", url: `/admissions/${deciding.id}/decision`, body: v });
          toast.success("Status updated");
          setDeciding(null);
          setOpen(null);
        }}
      />
    </>
  );
}
