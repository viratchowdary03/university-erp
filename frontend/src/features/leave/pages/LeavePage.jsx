import { useState } from "react";
import { useSelector } from "react-redux";
import { Plus, Check, X } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Tabs from "../../../components/common/Tabs";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import DataTable from "../../../components/common/DataTable";
import FilterSelect from "../../../components/common/FilterSelect";
import FormModal from "../../../components/common/FormModal";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { ROLES, ROLE_LABELS } from "../../../config/roles";
import { formatIso, humanize, getErrorMessage, todayIso } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";

const TYPES = ["Casual", "Sick", "Medical", "Duty", "Other"];
const TONE = { pending: "amber", approved: "green", rejected: "red", cancelled: "slate" };
const APPLICANTS = [ROLES.STUDENT, ROLES.FACULTY, ROLES.HOD];
const DECIDERS = [ROLES.FACULTY, ROLES.HOD, ROLES.SUPER_ADMIN, ROLES.REGISTRAR, ROLES.ADMIN];

export default function LeavePage() {
  const role = useSelector((s) => s.auth.user.role);
  const canApply = APPLICANTS.includes(role);
  const canDecide = DECIDERS.includes(role);
  const [tab, setTab] = useState(canApply ? "mine" : "requests");
  return (
    <>
      <PageHeader title="Leave" subtitle={canDecide ? "Apply for leave and decide on requests" : "Apply for leave and follow its status"} />
      <Tabs value={tab} onChange={setTab} tabs={[...(canApply ? [{ id: "mine", label: "My leave" }] : []), ...(canDecide ? [{ id: "requests", label: "Requests to decide" }] : [])]} />
      {tab === "mine" ? <MyLeave /> : <Requests />}
    </>
  );
}

function MyLeave() {
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const [open, setOpen] = useState(false);
  const query = useData(["leave", "mine"], "/leave/mine");

  const cancel = async (l) => {
    if (!(await confirm({ title: "Cancel this request?", message: `${formatIso(l.fromDate)} to ${formatIso(l.toDate)}`, tone: "danger" }))) return;
    send.mutateAsync({ method: "patch", url: `/leave/${l.id}/cancel` }).then(() => toast.success("Request cancelled")).catch((e) => toast.error(getErrorMessage(e)));
  };

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setOpen(true)}><Plus size={16} /> Apply for leave</Button></div>
      <QueryState query={query} table>
        {(rows) => (
          <Card>
            <DataTable
              rowKey={(r) => r.id}
              rows={rows}
              columns={[
                { key: "t", header: "Type", render: (l) => l.type },
                { key: "d", header: "Dates", render: (l) => <>{formatIso(l.fromDate)} to {formatIso(l.toDate)}<p className="text-xs text-slate-400">{l.days} day(s)</p></> },
                { key: "r", header: "Reason", render: (l) => l.reason },
                { key: "s", header: "Status", render: (l) => <><Badge tone={TONE[l.status]}>{humanize(l.status)}</Badge>{l.decidedByName && <p className="mt-1 text-xs text-slate-400">by {l.decidedByName}{l.decisionNote ? `: ${l.decisionNote}` : ""}</p>}</> },
                { key: "a", header: "", render: (l) => l.status === "pending" && <Button variant="secondary" className="px-3 py-1.5" onClick={() => cancel(l)}>Cancel</Button> },
              ]}
              emptyTitle="No leave requests yet"
            />
          </Card>
        )}
      </QueryState>
      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title="Apply for leave"
        initial={{ type: "Casual", fromDate: todayIso(), toDate: todayIso() }}
        submitLabel="Send request"
        fields={[
          { name: "type", label: "Type", type: "select", required: true, options: TYPES.map((t) => ({ value: t, label: t })), span: 2 },
          { name: "fromDate", label: "From", type: "date", required: true },
          { name: "toDate", label: "To", type: "date", required: true },
          { name: "reason", label: "Reason", type: "textarea", required: true },
        ]}
        onSubmit={async (v) => { await send.mutateAsync({ method: "post", url: "/leave", body: v }); toast.success("Leave request sent"); setOpen(false); }}
      />
    </>
  );
}

function Requests() {
  const toast = useToast();
  const send = useSend();
  const [status, setStatus] = useState("pending");
  const [deciding, setDeciding] = useState(null); // { leave, status }
  const query = useData(["leave", "requests"], "/leave/requests");

  return (
    <>
      <QueryState query={query} table>
        {(rows) => (
          <Card>
            <DataTable
              rowKey={(r) => r.id}
              rows={rows.filter((r) => !status || r.status === status)}
              getSearchText={(r) => `${r.applicantName} ${r.type} ${r.reason}`}
              searchPlaceholder="Search name or reason"
              filters={<FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }, { value: "", label: "All" }]} />}
              columns={[
                { key: "n", header: "Applicant", render: (l) => <><p className="font-medium">{l.applicantName}</p><p className="text-xs text-slate-400">{ROLE_LABELS[l.applicantRole]} - {l.school}</p></> },
                { key: "t", header: "Type", render: (l) => l.type },
                { key: "d", header: "Dates", render: (l) => <>{formatIso(l.fromDate)} to {formatIso(l.toDate)}<p className="text-xs text-slate-400">{l.days} day(s)</p></> },
                { key: "r", header: "Reason", render: (l) => l.reason },
                { key: "s", header: "Status", render: (l) => <Badge tone={TONE[l.status]}>{humanize(l.status)}</Badge> },
                { key: "a", header: "", render: (l) => l.status === "pending" && (
                  <div className="flex justify-end gap-1">
                    <Button className="px-2.5 py-1.5" onClick={() => setDeciding({ leave: l, status: "approved" })}><Check size={14} /> Approve</Button>
                    <Button variant="secondary" className="px-2.5 py-1.5" onClick={() => setDeciding({ leave: l, status: "rejected" })}><X size={14} /> Reject</Button>
                  </div>
                ) },
              ]}
              emptyTitle="Nothing to decide"
            />
          </Card>
        )}
      </QueryState>
      <FormModal
        open={Boolean(deciding)}
        onClose={() => setDeciding(null)}
        title={`${deciding?.status === "approved" ? "Approve" : "Reject"} leave of ${deciding?.leave.applicantName || ""}`}
        submitLabel={deciding?.status === "approved" ? "Approve" : "Reject"}
        fields={[{ name: "note", label: "Note (optional)", type: "textarea" }]}
        onSubmit={async (v) => {
          await send.mutateAsync({ method: "patch", url: `/leave/${deciding.leave.id}/decision`, body: { status: deciding.status, note: v.note } });
          toast.success(`Leave ${deciding.status}`);
          setDeciding(null);
        }}
      />
    </>
  );
}
