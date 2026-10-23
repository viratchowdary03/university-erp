import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import FilterSelect from "../../../components/common/FilterSelect";
import EmptyState from "../../../components/common/EmptyState";
import QueryState from "../../../components/common/PageLoader";
import { useData } from "../../../api/resource";
import { ROLE_LABELS } from "../../../config/roles";
import { formatDateTime } from "../../../utils/helpers";

const METHOD_TONE = { POST: "green", PUT: "amber", PATCH: "amber", DELETE: "red" };

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState("");
  const [q, setQ] = useState("");
  const query = useData(["audit-logs"], "/audit-logs", { params: { page, method: method || undefined, q: q || undefined, limit: 25 }, staleTime: 0 });

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every change made in the system: who, what and when. Kept for 180 days." />
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input type="search" aria-label="Search the log" placeholder="Search person or address" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
          <FilterSelect label="Action" value={method} onChange={(v) => { setMethod(v); setPage(1); }} options={[{ value: "", label: "All" }, { value: "POST", label: "Created" }, { value: "PUT", label: "Updated (PUT)" }, { value: "PATCH", label: "Updated (PATCH)" }, { value: "DELETE", label: "Deleted" }]} />
        </div>
        <QueryState query={query} table>
          {({ items, total, pages }) => items.length === 0 ? <EmptyState title="No entries" /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2.5 font-medium">When</th><th className="px-3 py-2.5 font-medium">Who</th><th className="px-3 py-2.5 font-medium">Action</th><th className="px-3 py-2.5 font-medium">Result</th></tr></thead>
                  <tbody className="divide-y">
                    {items.map((l) => (
                      <tr key={l.id}>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{formatDateTime(l.createdAt)}</td>
                        <td className="px-3 py-2.5"><p className="font-medium">{l.userName}</p><p className="text-xs text-slate-400">{ROLE_LABELS[l.role] || ""}</p></td>
                        <td className="px-3 py-2.5"><Badge tone={METHOD_TONE[l.method] || "slate"}>{l.method}</Badge> <span className="ml-1 font-mono text-xs text-slate-600">{l.path}</span></td>
                        <td className="px-3 py-2.5"><Badge tone={l.statusCode < 400 ? "green" : "red"}>{l.statusCode}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>{total} entries</span>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border p-1.5 disabled:opacity-40"><ChevronLeft size={16} /></button>
                  <span>Page {page} of {pages}</span>
                  <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded border p-1.5 disabled:opacity-40"><ChevronRight size={16} /></button>
                </div>
              </div>
            </>
          )}
        </QueryState>
      </Card>
    </>
  );
}
