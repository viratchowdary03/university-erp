// items: [{ label, value }]. Empty values are skipped.
export default function DetailList({ items, columns = 2 }) {
  const visible = items.filter((i) => i.value !== undefined && i.value !== null && i.value !== "");
  return (
    <dl className={`grid gap-x-6 gap-y-3 text-sm ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {visible.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-xs text-slate-400">{label}</dt>
          <dd className="font-medium text-slate-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
