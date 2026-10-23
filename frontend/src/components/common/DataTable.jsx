import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import EmptyState from "./EmptyState";

/**
 * columns: [{ key, header, render?(row), className? }]
 * getSearchText(row) -> string that the search box looks in
 * filters: extra controls shown next to the search box
 */
export default function DataTable({
  columns,
  rows,
  rowKey,
  getSearchText,
  searchPlaceholder = "Search",
  filters,
  pageSize = 8,
  onRowClick,
  emptyTitle = "Nothing to show",
  emptyText,
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !getSearchText) return rows;
    return rows.filter((row) => getSearchText(row).toLowerCase().includes(q));
  }, [rows, query, getSearchText]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);
  const from = filtered.length ? (current - 1) * pageSize + 1 : 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {getSearchText && (
          <label className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <span className="sr-only">{searchPlaceholder}</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </label>
        )}
        {filters}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={emptyTitle} text={emptyText} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b text-xs uppercase tracking-wide text-slate-400">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} scope="col" className={`px-3 py-2.5 font-medium ${col.className || ""}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (e) => e.key === "Enter" && onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={onRowClick ? "cursor-pointer outline-none hover:bg-brand-50/60 focus-visible:bg-brand-50" : ""}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-3 py-3 align-middle ${col.className || ""}`}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            {from} - {Math.min(current * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Previous page"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
              className="rounded-lg border border-slate-300 p-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Next page"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
              className="rounded-lg border border-slate-300 p-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
