import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { BookOpen, AlertTriangle, Library as LibraryIcon, Layers } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import StatCard from "../../../components/common/StatCard";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import QueryState from "../../../components/common/PageLoader";
import { useData } from "../../../api/resource";
import { formatDate, formatMoney } from "../../../utils/helpers";

export default function LibrarianDashboard() {
  const user = useSelector((s) => s.auth.user);
  const query = useData(["dashboard", "librarian"], "/dashboard/librarian");
  return (
    <div>
      <PageHeader title={`Welcome, ${user?.name}`} subtitle="Library at a glance" />
      <QueryState query={query}>
        {({ summary, overdue, recent, categories }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Titles" value={summary.titles} icon={LibraryIcon} />
              <StatCard label="Copies" value={summary.copies} icon={Layers} />
              <StatCard label="Issued now" value={summary.issued} icon={BookOpen} tone="amber" />
              <StatCard label="Overdue" value={summary.overdue} icon={AlertTriangle} tone={summary.overdue ? "red" : "green"} />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card title="Overdue books" action={<Link to="/library" className="text-sm font-medium text-brand-600 hover:underline">Open library</Link>}>
                <ul className="divide-y text-sm">
                  {overdue.map((o) => <li key={o.id} className="flex items-center justify-between gap-3 py-2.5"><span>{o.title}<span className="block text-xs text-slate-400">{o.studentName} - due {formatDate(o.dueDate)}</span></span><Badge tone="red">{o.overdueDays}d - {formatMoney(o.fineNow)}</Badge></li>)}
                  {overdue.length === 0 && <li className="py-6 text-center text-slate-400">Nothing is overdue</li>}
                </ul>
              </Card>
              <Card title="Recently issued">
                <ul className="divide-y text-sm">
                  {recent.map((o) => <li key={o.id} className="flex justify-between py-2.5"><span>{o.title}<span className="block text-xs text-slate-400">{o.studentName}</span></span><span className="text-xs text-slate-400">due {formatDate(o.dueDate)}</span></li>)}
                  {recent.length === 0 && <li className="py-6 text-center text-slate-400">No books issued</li>}
                </ul>
              </Card>
            </div>
            <Card title="Largest categories" className="mt-6">
              <ul className="grid gap-x-8 sm:grid-cols-2">
                {categories.map((c) => <li key={c.category} className="flex justify-between border-b border-slate-100 py-2 text-sm"><span>{c.category}</span><span className="text-slate-500">{c.titles} titles, {c.copies} copies</span></li>)}
              </ul>
            </Card>
          </>
        )}
      </QueryState>
    </div>
  );
}
