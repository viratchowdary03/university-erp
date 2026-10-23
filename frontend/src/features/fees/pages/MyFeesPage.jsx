import { Link } from "react-router-dom";
import { Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import StatCard from "../../../components/common/StatCard";
import Badge from "../../../components/common/Badge";
import EmptyState from "../../../components/common/EmptyState";
import QueryState from "../../../components/common/PageLoader";
import { useData } from "../../../api/resource";
import { formatMoney, formatIso, formatDate } from "../../../utils/helpers";
import ReceiptButton from "../components/ReceiptButton";

export default function MyFeesPage() {
  const query = useData(["fees", "me"], "/fees/me");
  return (
    <>
      <PageHeader title="My fees" subtitle="What you owe, what you paid, and your receipts" />
      <QueryState query={query}>
        {({ items, payments, total, paid, balance }) => (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <StatCard label="Total fees" value={formatMoney(total)} icon={Wallet} />
              <StatCard label="Paid" value={formatMoney(paid)} icon={CheckCircle2} tone="green" />
              <StatCard label="Balance" value={formatMoney(balance)} icon={AlertCircle} tone={balance ? "red" : "green"} />
            </div>

            <Card title="Fee details" className="mb-6">
              {items.length === 0 ? <EmptyState title="No fees assigned to you yet" /> : (
                <ul className="divide-y">
                  {items.map((f) => (
                    <li key={f.id} className="py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{f.title}</p>
                          <p className="text-xs text-slate-400">Due {formatIso(f.dueDate)} - {f.components.map((c) => `${c.name} ${formatMoney(c.amount)}`).join(", ")}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {f.balance === 0 ? <Badge tone="green">Paid</Badge> : f.overdue ? <Badge tone="red">Overdue</Badge> : f.paid > 0 ? <Badge tone="amber">Part paid</Badge> : <Badge tone="slate">Due</Badge>}
                          {f.balance > 0 && <Link to={`/fees/pay/${f.id}`} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">Pay {formatMoney(f.balance)}</Link>}
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${f.total ? Math.round((f.paid / f.total) * 100) : 0}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{formatMoney(f.paid)} of {formatMoney(f.total)} paid</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Payment history">
              {payments.length === 0 ? <EmptyState title="No payments yet" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2 font-medium">Receipt</th><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Mode</th><th className="px-3 py-2 font-medium">Amount</th><th /></tr></thead>
                    <tbody className="divide-y">
                      {payments.map((p) => (
                        <tr key={p.id}><td className="px-3 py-2.5 font-medium">{p.receiptNo}</td><td className="px-3 py-2.5">{formatDate(p.paidAt)}</td><td className="px-3 py-2.5">{p.mode}</td><td className="px-3 py-2.5">{formatMoney(p.amount)}</td><td className="px-3 py-2.5 text-right"><ReceiptButton payment={p} /></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </QueryState>
    </>
  );
}
