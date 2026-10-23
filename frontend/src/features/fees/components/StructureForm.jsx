import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import InputField from "../../../components/common/InputField";
import Select from "../../../components/common/Select";
import { useData } from "../../../api/resource";
import { formatMoney } from "../../../utils/helpers";

// A fee made of several parts (tuition, lab ...). `structure` is null for a new fee.
export default function StructureForm({ open, structure, onClose, onSubmit }) {
  const [values, setValues] = useState({ title: "", school: "", program: "", dueDate: "", components: [{ name: "", amount: "" }] });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // schools and programs come from the database, so programs added in Academic Setup appear here
  const options = useData(["admissions", "options"], "/admissions/options");
  const schools = options.data ?? [];

  useEffect(() => {
    if (!open) return;
    setError(null);
    setValues(structure
      ? { title: structure.title, school: structure.school, program: structure.program || "", dueDate: structure.dueDate, components: structure.components.map((c) => ({ ...c })) }
      : { title: "", school: "", program: "", dueDate: "", components: [{ name: "", amount: "" }] });
  }, [open, structure]);

  const total = values.components.reduce((n, c) => n + (Number(c.amount) || 0), 0);
  const programs = schools.find((s) => s.code === values.school)?.programs ?? [];
  const setComponent = (i, patch) => setValues((v) => ({ ...v, components: v.components.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit({ ...values, components: values.components.map((c) => ({ name: c.name, amount: Number(c.amount) })) });
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={structure ? "Edit fee" : "New fee"} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><InputField label="Title *" required placeholder="Semester 3 tuition fee" value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} /></div>
          <Select label="School *" required value={values.school} onChange={(e) => setValues({ ...values, school: e.target.value, program: "" })}>
            <option value="">Select</option>{schools.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </Select>
          <Select label="Program (optional)" value={values.program} onChange={(e) => setValues({ ...values, program: e.target.value })} disabled={!values.school}>
            <option value="">Every program</option>{programs.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <InputField label="Due date *" type="date" required value={values.dueDate} onChange={(e) => setValues({ ...values, dueDate: e.target.value })} />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">Parts of the fee</legend>
          <div className="space-y-2">
            {values.components.map((c, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1"><InputField label={i === 0 ? "Name" : ""} aria-label="Part name" required placeholder="Tuition" value={c.name} onChange={(e) => setComponent(i, { name: e.target.value })} /></div>
                <div className="w-32"><InputField label={i === 0 ? "Amount (₹)" : ""} aria-label="Part amount" type="number" min="0" required value={c.amount} onChange={(e) => setComponent(i, { amount: e.target.value })} /></div>
                <button type="button" aria-label="Remove part" disabled={values.components.length === 1} onClick={() => setValues((v) => ({ ...v, components: v.components.filter((_, j) => j !== i) }))} className="mb-1 rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-30"><X size={16} /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setValues((v) => ({ ...v, components: [...v.components, { name: "", amount: "" }] }))} className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"><Plus size={14} /> Add a part</button>
          <p className="mt-3 text-right text-sm text-slate-500">Total: <b className="text-slate-900">{formatMoney(total)}</b></p>
        </fieldset>

        <div className="flex justify-end gap-3"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>{structure ? "Save changes" : "Create fee"}</Button></div>
      </form>
    </Modal>
  );
}
