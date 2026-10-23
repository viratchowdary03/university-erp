import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import DataTable from "../../../components/common/DataTable";
import FilterSelect from "../../../components/common/FilterSelect";
import FormModal from "../../../components/common/FormModal";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { formatDate, humanize } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";

export const CATEGORIES = ["Academic", "Fees", "Hostel", "Library", "Transport", "IT / Portal", "Harassment", "Other"];
export const STATUS_TONE = { open: "amber", in_progress: "brand", resolved: "green", closed: "slate" };
const PRIORITY_TONE = { low: "slate", medium: "amber", high: "red" };

export default function GrievancePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const send = useSend();
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const query = useData(["grievance"], "/grievance");
  return (
    <>
      <PageHeader title="Grievance" subtitle="Raise a problem and follow it until it is solved" action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Raise a ticket</Button>} />
      <QueryState query={query} table>
        {(rows) => (
          <Card>
            <DataTable
              rowKey={(r) => r.id}
              rows={rows.filter((t) => !status || t.status === status)}
              getSearchText={(t) => `${t.ticketNo} ${t.subject} ${t.name} ${t.category}`}
              searchPlaceholder="Search ticket"
              filters={<FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "", label: "All" }, ...["open", "in_progress", "resolved", "closed"].map((s) => ({ value: s, label: humanize(s) }))]} />}
              onRowClick={(t) => navigate(`/grievance/${t.id}`)}
              columns={[
                { key: "no", header: "Ticket", render: (t) => <span className="font-medium">{t.ticketNo}</span> },
                { key: "s", header: "Subject", render: (t) => <><p>{t.subject}</p><p className="text-xs text-slate-400">{t.category} - {t.name}</p></> },
                { key: "p", header: "Priority", render: (t) => <Badge tone={PRIORITY_TONE[t.priority]}>{humanize(t.priority)}</Badge> },
                { key: "st", header: "Status", render: (t) => <Badge tone={STATUS_TONE[t.status]}>{humanize(t.status)}</Badge> },
                { key: "c", header: "Replies", render: (t) => t.commentCount },
                { key: "d", header: "Raised", render: (t) => formatDate(t.createdAt) },
              ]}
              emptyTitle="No tickets"
            />
          </Card>
        )}
      </QueryState>
      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title="Raise a ticket"
        initial={{ priority: "medium" }}
        submitLabel="Submit"
        fields={[
          { name: "category", label: "Category", type: "select", required: true, options: CATEGORIES.map((c) => ({ value: c, label: c })) },
          { name: "priority", label: "Priority", type: "select", options: ["low", "medium", "high"].map((p) => ({ value: p, label: humanize(p) })) },
          { name: "subject", label: "Subject", required: true, span: 2 },
          { name: "description", label: "What happened?", type: "textarea", required: true, rows: 5 },
        ]}
        onSubmit={async (v) => {
          const t = await send.mutateAsync({ method: "post", url: "/grievance", body: v });
          toast.success(`Ticket ${t.ticketNo} raised`);
          setOpen(false);
          navigate(`/grievance/${t.id}`);
        }}
      />
    </>
  );
}
