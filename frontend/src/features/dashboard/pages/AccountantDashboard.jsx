import { useSelector } from "react-redux";
import { Wallet, TrendingUp, Hourglass, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, Legend, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";

import PageHeader from "../../../components/common/PageHeader";
import StatCard from "../../../components/common/StatCard";
import Card from "../../../components/common/Card";
import { formatCurrency } from "../../../utils/helpers";
import { accountantData } from "../dashboardData";
import { MOCK } from "../../../api/demo";
import AccountantLive from "./AccountantLive";

const PIE_COLORS = ["#0d9488", "#f59e0b", "#134e4a", "#94a3b8"];

function AccountantDemo() {
  const user = useSelector((s) => s.auth.user);
  const { stats, monthly, modes, recent } = accountantData;

  return (
    <div>
      <PageHeader title={`Welcome, ${user?.name}`} subtitle="Fee collection summary." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected today" value={formatCurrency(stats.today)} icon={Wallet} tone="green" />
        <StatCard label="This month" value={formatCurrency(stats.month)} icon={TrendingUp} />
        <StatCard label="Pending dues" value={formatCurrency(stats.pending)} icon={Hourglass} tone="amber" />
        <StatCard label="Defaulters" value={stats.defaulters} icon={AlertTriangle} tone="red" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Monthly collection (₹ lakh)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="amount" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Payment modes (%)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={modes} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {modes.map((m, i) => (
                    <Cell key={m.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Recent payments" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-2 font-medium">Receipt</th>
                <th className="pb-2 font-medium">Student</th>
                <th className="pb-2 font-medium">Mode</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recent.map((p) => (
                <tr key={p.receipt}>
                  <td className="py-3 text-slate-500">{p.receipt}</td>
                  <td className="py-3 font-medium">{p.student}</td>
                  <td className="py-3">{p.mode}</td>
                  <td className="py-3 text-right font-medium">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function AccountantDashboard() {
  return MOCK ? <AccountantDemo /> : <AccountantLive />;
}
