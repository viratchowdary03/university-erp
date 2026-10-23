export default function PlaceholderPage({ title }) {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        The {title} module will be built here.
      </div>
    </div>
  );
}
