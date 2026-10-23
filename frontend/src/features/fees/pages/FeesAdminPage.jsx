import { useState } from "react";
import { Pencil, Plus, Trash2, HandCoins } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import StatCard from "../../../components/common/StatCard";
import Tabs from "../../../components/common/Tabs";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import DataTable from "../../../components/common/DataTable";
import FilterSelect from "../../../components/common/FilterSelect";
import SchoolFilter from "../../../components/common/SchoolFilter";
import FormModal from "../../../components/common/FormModal";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { getSchoolName } from "../../../config/schools";
import { formatMoney, formatIso, formatDate, getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";
import StructureForm from "../components/StructureForm";
import ReceiptButton from "../components/ReceiptButton";

const MODES = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"];
const TONE = { Paid: "green", Partial: "amber", Pending: "red" };

export default function FeesAdminPage() {
  const [tab, setTab] = useState("students");
  return (
    <>
      <PageHeader title="Fees" subtitle="Collect fees, set fee structures and look up receipts" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "students", label: "Student dues" }, { id: "structures", label: "Fee structures" }, { id: "payments", label: "Payments" }]} />
      {tab === "students" && <DuesTab />}
      {tab === "structures" && <StructuresTab />}
      {tab === "payments" && <PaymentsTab />}
    </>
  );
}

function DuesTab() {
  const [school, setSchool] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(null);
  const query = useData(["fees", "students"], "/fees/students", { params: { school: school || undefined, status: status || undefined } });
  return (
    <>
      <QueryState query={query} table>
        {({ rows, summary }) => (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total billed" value={formatMoney(summary.total)} />
              <StatCard label="Collected" value={formatMoney(summary.paid)} tone="green" />
              <StatCard label="Outstanding" value={formatMoney(summary.balance)} tone="red" />
              <StatCard label="Defaulters" value={summary.defaulters} hint="Past the due date" tone="amber" />
            </div>
            <Card>
              <DataTable
                rowKey={(r) => r.id}
                rows={rows}
                getSearchText={(r) => `${r.name} ${r.enrollmentNo}`}
                searchPlaceholder="Search student"
                filters={<><SchoolFilter value={school} onChange={setSchool} /><FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "", label: "All" }, { value: "Pending", label: "Pending" }, { value: "Partial", label: "Part paid" }, { value: "Paid", label: "Paid" }]} /></>}
                columns={[
                  { key: "n", header: "Student", render: (r) => <><p className="font-medium">{r.name}</p><p className="text-xs text-slate-400">{r.enrollmentNo} - {getSchoolName(r.school)}</p></> },
                  { key: "t", header: "Total", render: (r) => formatMoney(r.total) },
                  { key: "p", header: "Paid", render: (r) => formatMoney(r.paid) },
                  { key: "b", header: "Balance", render: (r) => <b className={r.balance ? "text-red-600" : ""}>{formatMoney(r.balance)}</b> },
                  { key: "s", header: "Status", render: (r) => <span className="flex gap-1"><Badge tone={TONE[r.status]}>{r.status}</Badge>{r.overdue && <Badge tone="red">Overdue</Badge>}</span> },
                  { key: "a", header: "", render: (r) => <Button variant="secondary" className="px-3 py-1.5" onClick={() => setOpen(r.id)}><HandCoins size={14} /> Collect</Button> },
                ]}
                emptyTitle="No students found"
              />
            </Card>
          </>
        )}
      </QueryState>
      {open && <CollectModal studentId={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function CollectModal({ studentId, onClose }) {
  const toast = useToast();
  const send = useSend();
  const query = useData(["fees", "student", studentId], `/fees/students/${studentId}`);
  const [form, setForm] = useState(null); // the fee being paid
  const data = query.data;

  return (
    <Modal open onClose={onClose} title={data ? `${data.student.name} (${data.student.enrollmentNo})` : "Fees"} size="lg">
      <QueryState query={query} table>
        {() => (
          <>
            <ul className="divide-y">
              {data.items.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div><p className="font-medium">{f.title}</p><p className="text-xs text-slate-400">Due {formatIso(f.dueDate)} - paid {formatMoney(f.paid)} of {formatMoney(f.total)}</p></div>
                  {f.balance > 0 ? <Button className="px-3 py-1.5" onClick={() => setForm(f)}>Collect {formatMoney(f.balance)}</Button> : <Badge tone="green">Paid</Badge>}
                </li>
              ))}
              {data.items.length === 0 && <li className="py-6 text-center text-sm text-slate-400">No fee structure applies to this student yet</li>}
            </ul>
            {data.payments.length > 0 && (
              <div className="mt-5"><h3 className="mb-2 text-sm font-semibold text-slate-700">Receipts</h3>
                <ul className="divide-y text-sm">{data.payments.map((p) => <li key={p.id} className="flex items-center justify-between py-2"><span>{p.receiptNo} - {formatDate(p.paidAt)} - {p.mode}</span><span className="flex items-center gap-2"><b>{formatMoney(p.amount)}</b><ReceiptButton payment={p} /></span></li>)}</ul>
              </div>
            )}
          </>
        )}
      </QueryState>
      <FormModal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={`Collect: ${form?.title || ""}`}
        initial={{ amount: form?.balance, mode: "Cash" }}
        submitLabel="Record payment"
        fields={[
          { name: "amount", label: `Amount (balance ${formatMoney(form?.balance)})`, type: "number", required: true, min: 1, max: form?.balance },
          { name: "mode", label: "Mode", type: "select", required: true, options: MODES.map((m) => ({ value: m, label: m })) },
          { name: "reference", label: "Reference (UPI / cheque no.)", span: 2 },
          { name: "note", label: "Note", span: 2 },
        ]}
        onSubmit={async (v) => {
          await send.mutateAsync({ method: "post", url: "/fees/payments", body: { ...v, studentId, structureId: form.id } });
          toast.success("Payment recorded");
          setForm(null);
        }}
      />
    </Modal>
  );
}

function StructuresTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const [editing, setEditing] = useState(null);
  const query = useData(["fees", "structures"], "/fees/structures");

  const remove = async (f) => {
    if (!(await confirm({ title: "Delete this fee?", message: f.title, tone: "danger" }))) return;
    send.mutateAsync({ method: "delete", url: `/fees/structures/${f.id}` }).then(() => toast.success("Fee deleted")).catch((e) => toast.error(getErrorMessage(e)));
  };

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setEditing("new")}><Plus size={16} /> New fee</Button></div>
      <QueryState query={query} table>
        {(rows) => (
          <Card>
            <DataTable
              rowKey={(r) => r.id}
              rows={rows}
              getSearchText={(r) => `${r.title} ${r.school} ${r.program}`}
              columns={[
                { key: "t", header: "Fee", render: (r) => <><p className="font-medium">{r.title}</p><p className="text-xs text-slate-400">{r.components.map((c) => `${c.name} ${formatMoney(c.amount)}`).join(", ")}</p></> },
                { key: "s", header: "Applies to", render: (r) => <>{getSchoolName(r.school)}<p className="text-xs text-slate-400">{r.program || "Every program"}</p></> },
                { key: "tot", header: "Total", render: (r) => <b>{formatMoney(r.total)}</b> },
                { key: "d", header: "Due", render: (r) => formatIso(r.dueDate) },
                { key: "a", header: "", render: (r) => <div className="flex justify-end gap-1"><button type="button" aria-label="Edit fee" onClick={() => setEditing(r)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button><button type="button" aria-label="Delete fee" onClick={() => remove(r)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"><Trash2 size={16} /></button></div> },
              ]}
              emptyTitle="No fees set up"
            />
          </Card>
        )}
      </QueryState>
      <StructureForm
        open={Boolean(editing)}
        structure={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSubmit={async (v) => {
          if (editing === "new") await send.mutateAsync({ method: "post", url: "/fees/structures", body: v });
          else await send.mutateAsync({ method: "put", url: `/fees/structures/${editing.id}`, body: v });
          toast.success("Fee saved");
          setEditing(null);
        }}
      />
    </>
  );
}

function PaymentsTab() {
  const query = useData(["fees", "payments"], "/fees/payments");
  return (
    <QueryState query={query} table>
      {(rows) => (
        <Card>
          <DataTable
            rowKey={(r) => r.id}
            rows={rows}
            getSearchText={(r) => `${r.receiptNo} ${r.studentName} ${r.enrollmentNo} ${r.feeTitle}`}
            searchPlaceholder="Search receipt or student"
            columns={[
              { key: "r", header: "Receipt", render: (r) => <span className="font-medium">{r.receiptNo}</span> },
              { key: "s", header: "Student", render: (r) => <>{r.studentName}<p className="text-xs text-slate-400">{r.enrollmentNo}</p></> },
              { key: "f", header: "Fee", render: (r) => r.feeTitle },
              { key: "d", header: "Date", render: (r) => formatDate(r.paidAt) },
              { key: "m", header: "Mode", render: (r) => r.mode },
              { key: "a", header: "Amount", render: (r) => <b>{formatMoney(r.amount)}</b> },
              { key: "x", header: "", render: (r) => <ReceiptButton payment={r} /> },
            ]}
            emptyTitle="No payments yet"
          />
        </Card>
      )}
    </QueryState>
  );
}
