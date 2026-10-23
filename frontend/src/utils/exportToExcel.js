// Saves rows as a .csv file, which Excel opens directly.
// columns: [{ key, header }]   rows: [{ [key]: value }]
export function exportToExcel(filename, columns, rows) {
  const cell = (v) => {
    const text = v === null || v === undefined ? "" : String(v);
    // a leading = + - @ would be run as a formula by spreadsheet programs
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const lines = [columns.map((c) => cell(c.header)).join(","), ...rows.map((r) => columns.map((c) => cell(r[c.key])).join(","))];
  const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
