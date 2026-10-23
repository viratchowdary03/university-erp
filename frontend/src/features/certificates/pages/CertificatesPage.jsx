import { useState } from "react";
import { useSelector } from "react-redux";
import { Download, Plus, Check, X, Stamp } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import DataTable from "../../../components/common/DataTable";
import FilterSelect from "../../../components/common/FilterSelect";
import FormModal from "../../../components/common/FormModal";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend, downloadFile } from "../../../api/resource";
import { PERM, canManage } from "../../../config/permissions";
import { formatDate, humanize, getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";

const TYPES = ["Bonafide Certificate", "Character Certificate", "Transcript", "Transfer Certificate", "No Objection Certificate", "Migration Certificate"];
const TONE = { pending: "amber", approved: "brand", rejected: "red", issued: "green" };

export default function CertificatesPage() {
  const role = useSelector((s) => s.auth.user.role);
  return canManage(role, PERM.CERTIFICATES) ? <Admin /> : <Mine />;
}

function PdfButton({ row }) {
  const toast = useToast();
  return <Button variant="secondary" className="px-3 py-1.5" onClick={() => downloadFile(`/certificates/${row.id}/pdf`, `${row.requestNo}.pdf`).catch((e) => toast.error(getErrorMessage(e)))}><Download size={14} /> PDF</Button>;
}

function Mine() {
  const toast = useToast();
  const send = useSend();
  const [open, setOpen] = useState(false);
  const query = useData(["certificates", "mine"], "/certificates/mine");
  return (
    <>
      <PageHeader title="Certificates" subtitle="Request a certificate. Once issued you can download it here." action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Request a certificate</Button>} />
      <QueryState query={query} table>
        {(rows) => (
          <Card>
            <DataTable
              rowKey={(r) => r.id}
              rows={rows}
              columns={[
                { key: "t", header: "Certificate", render: (r) => <><p className="font-medium">{r.type}</p><p className="text-xs text-slate-400">{r.requestNo} - {r.purpose}</p></> },
                { key: "d", header: "Requested", render: (r) => formatDate(r.createdAt) },
                { key: "s", header: "Status", render: (r) => <><Badge tone={TONE[r.status]}>{humanize(r.status)}</Badge>{r.remarks && <p className="mt-1 text-xs text-slate-400">{r.remarks}</p>}</> },
                { key: "n", header: "Number", render: (r) => r.certificateNo || "-" },
                { key: "a", header: "", render: (r) => r.status === "issued" && <PdfButton row={r} /> },
              ]}
              emptyTitle="You have not requested any certificate"
            />
          </Card>
        )}
      </QueryState>
      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title="Request a certificate"
        submitLabel="Send request"
        fields={[
          { name: "type", label: "Certificate", type: "select", required: true, span: 2, options: TYPES.map((t) => ({ value: t, label: t })) },
          { name: "purpose", label: "Purpose", required: true, span: 2, placeholder: "Bank account, passport, scholarship..." },
        ]}
        onSubmit={async (v) => { await send.mutateAsync({ method: "post", url: "/certificates", body: v }); toast.success("Request sent"); setOpen(false); }}
      />
    </>
  );
}

function Admin() {
  const toast = useToast();
  const send = useSend();
  const [status, setStatus] = useState("pending");
  const [deciding, setDeciding] = useState(null);
  const query = useData(["certificates", "all"], "/certificates");
  const issue = (r) => send.mutateAsync({ method: "post", url: `/certificates/${r.id}/issue` }).then(() => toast.success("Certificate issued")).catch((e) => toast.error(getErrorMessage(e)));
  return (
    <>
      <PageHeader title="Certificate requests" subtitle="Approve, then issue. Students download issued certificates themselves." />
      <QueryState query={query} table>
        {(rows) => (
          <Card>
            <DataTable
              rowKey={(r) => r.id}
              rows={rows.filter((r) => !status || r.status === status)}
              getSearchText={(r) => `${r.studentName} ${r.enrollmentNo} ${r.type} ${r.requestNo}`}
              filters={<FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "issued", label: "Issued" }, { value: "rejected", label: "Rejected" }, { value: "", label: "All" }]} />}
              columns={[
                { key: "s", header: "Student", render: (r) => <><p className="font-medium">{r.studentName}</p><p className="text-xs text-slate-400">{r.enrollmentNo}</p></> },
                { key: "t", header: "Certificate", render: (r) => <>{r.type}<p className="text-xs text-slate-400">{r.purpose}</p></> },
                { key: "d", header: "Requested", render: (r) => formatDate(r.createdAt) },
                { key: "st", header: "Status", render: (r) => <Badge tone={TONE[r.status]}>{humanize(r.status)}</Badge> },
                { key: "a", header: "", render: (r) => (
                  <div className="flex justify-end gap-1">
                    {r.status === "pending" && <><Button className="px-2.5 py-1.5" onClick={() => setDeciding({ r, status: "approved" })}><Check size={14} /> Approve</Button><Button variant="secondary" className="px-2.5 py-1.5" onClick={() => setDeciding({ r, status: "rejected" })}><X size={14} /> Reject</Button></>}
                    {r.status === "approved" && <Button className="px-2.5 py-1.5" onClick={() => issue(r)}><Stamp size={14} /> Issue</Button>}
                    {r.status === "issued" && <PdfButton row={r} />}
                  </div>
                ) },
              ]}
              emptyTitle="No requests"
            />
          </Card>
        )}
      </QueryState>
      <FormModal
        open={Boolean(deciding)}
        onClose={() => setDeciding(null)}
        title={`${deciding?.status === "approved" ? "Approve" : "Reject"} ${deciding?.r.type || ""}`}
        submitLabel={deciding?.status === "approved" ? "Approve" : "Reject"}
        fields={[{ name: "remarks", label: "Remarks (optional)", type: "textarea" }]}
        onSubmit={async (v) => { await send.mutateAsync({ method: "patch", url: `/certificates/${deciding.r.id}/decision`, body: { status: deciding.status, remarks: v.remarks } }); toast.success("Decision saved"); setDeciding(null); }}
      />
    </>
  );
}
