// tabs: [{ id, label }]
export default function Tabs({ tabs, value, onChange, label = "Sections" }) {
  return (
    <div role="tablist" aria-label={label} className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium outline-none transition focus-visible:bg-brand-50 ${
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
