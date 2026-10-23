import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Wallet, TrendingUp, Hourglass, AlertTriangle } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, Legend, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import PageHeader from "../../../components/common/PageHeader";
import StatCard from "../../../components/common/StatCard";
import Card from "../../../components/common/Card";
import EmptyState from "../../../components/common/EmptyState";
import QueryState from "../../../components/common/PageLoader";
import { useData } from "../../../api/resource";
import { formatMoney, formatDate } from "../../../utils/helpers";

const PIE_COLORS = ["#0d9488", "#f59e0b", "#134e4a", "#94a3b8", "#6366f1", "#ef4444"];

// Accountant dashboard from the real database
export default function AccountantLive() {
  const user = useSelector((s) => s.auth.user);
  const query = useData(["dashboard", "accountant"], "/dashboard/accountant");
  return (
    <div>
      <PageHeader title={`Welcome, ${user?.name}`} subtitle="Fee collection summary" />
      <QueryState query={query}>
        {({ summary, monthly, byMode, defaulters, recent }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Collected today" value={formatMoney(summary.collectedToday)} icon={Wallet} tone="green" />
              <StatCard label="This month" value={formatMoney(summary.collectedThisMonth)} icon={TrendingUp} />
              <StatCard label="Pending dues" value={formatMoney(summary.balance)} icon={Hourglass} tone="amber" />
              <StatCard label="Defaulters" value={summary.defaulters} icon={AlertTriangle} tone="red" hint="Past the due date" />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card title="Monthly collection (₹)">
                {monthly.length === 0 ? <EmptyState title="No payments yet" /> : (
                  <div className="h-64" role="img" aria-label={`Monthly collection: ${monthly.map((m) => `${m.label} ${formatMoney(m.amount)}`).join(", ")}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthly}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                        <Tooltip formatter={(v) => formatMoney(v)} />
                        <Bar dataKey="amount" fill="#0d9488" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
              <Card title="Payment modes">
                {byMode.length === 0 ? <EmptyState title="No payments yet" /> : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byMode} dataKey="amount" nameKey="mode" innerRadius={55} outerRadius={85} paddingAngle={3}>
                          {byMode.map((m, i) => <Cell key={m.mode} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => formatMoney(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card title="Biggest overdue balances" action={<Link to="/fees" className="text-sm font-medium text-brand-600 hover:underline">Collect fees</Link>}>
                <ul className="divide-y text-sm">
                  {defaulters.map((d) => <li key={d.id} className="flex justify-between py-2.5"><span>{d.name} <span className="text-xs text-slate-400">{d.enrollmentNo}</span></span><b className="text-red-600">{formatMoney(d.balance)}</b></li>)}
                  {defaulters.length === 0 && <li className="py-6 text-center text-slate-400">Nobody is overdue</li>}
                </ul>
              </Card>
              <Card title="Recent payments">
                <ul className="divide-y text-sm">
                  {recent.map((p) => <li key={p.id} className="flex justify-between py-2.5"><span>{p.studentName} <span className="text-xs text-slate-400">{p.receiptNo} - {p.mode} - {formatDate(p.paidAt)}</span></span><b>{formatMoney(p.amount)}</b></li>)}
                  {recent.length === 0 && <li className="py-6 text-center text-slate-400">No payments yet</li>}
                </ul>
              </Card>
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
