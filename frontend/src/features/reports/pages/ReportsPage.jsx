import { useState } from "react";
import { Download } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import DataTable from "../../../components/common/DataTable";
import FilterSelect from "../../../components/common/FilterSelect";
import SchoolFilter from "../../../components/common/SchoolFilter";
import QueryState from "../../../components/common/PageLoader";
import { useData } from "../../../api/resource";
import { exportToExcel } from "../../../utils/exportToExcel";
import { formatMoney } from "../../../utils/helpers";

const MONEY = new Set(["total", "paid", "balance"]);

export default function ReportsPage() {
  const types = useData(["reports", "types"], "/reports");
  const [type, setType] = useState("");
  const [school, setSchool] = useState("");
  const chosen = type || types.data?.[0]?.id || "";
  const report = useData(["reports", chosen, school], `/reports/${chosen}`, { params: { school: school || undefined }, enabled: Boolean(chosen) });

  return (
    <>
      <PageHeader title="Reports" subtitle="Live lists from the database. Download any of them for Excel." />
      <QueryState query={types} table>
        {(list) => (
          <Card>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <FilterSelect label="Report" value={chosen} onChange={setType} options={list.map((t) => ({ value: t.id, label: t.title }))} />
              <SchoolFilter value={school} onChange={setSchool} />
              {report.data && (
                <Button variant="secondary" className="ml-auto" onClick={() => exportToExcel(`${chosen}-${report.data.generatedOn}`, report.data.columns, report.data.rows)}>
                  <Download size={16} /> Download CSV
                </Button>
              )}
            </div>
            <QueryState query={report} table>
              {(r) => (
                <>
                  <p className="mb-3 text-sm text-slate-500">{r.title} - {r.rows.length} row(s) - {r.generatedOn}</p>
                  <DataTable
                    rowKey={(row) => `${row.enrollmentNo}-${row.name}-${row.hostel || ""}`}
                    rows={r.rows}
                    getSearchText={(row) => Object.values(row).join(" ")}
                    pageSize={10}
                    columns={r.columns.map((c) => ({ key: c.key, header: c.header, render: (row) => (MONEY.has(c.key) ? formatMoney(row[c.key]) : row[c.key] ?? "-") }))}
                    emptyTitle="Nothing to report"
                  />
                </>
              )}
            </QueryState>
          </Card>
        )}
      </QueryState>
    </>
  );
}
