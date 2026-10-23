import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import InputField from "./InputField";
import Select from "./Select";

/**
 * A form in a pop-up, described by its fields.
 *   fields: [{ name, label, type = "text" | "number" | "date" | "time" | "email" | "tel" | "url" | "textarea" | "select" | "checkbox",
 *              options: [{ value, label }] (select, checkboxes), required, placeholder, hint, span: 2 (full width), min, max, step }]
 *   initial: starting values (an edit) - the form resets whenever the pop-up opens
 *   onSubmit(values): may throw; the message is shown in the form
 */
export default function FormModal({ open, onClose, title, fields, initial = {}, onSubmit, submitLabel = "Save", size = "md", description }) {
  const blank = () => Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? (f.type === "checkbox" ? false : f.type === "checkboxes" ? [] : "")]));
  const [values, setValues] = useState(blank);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) { setValues(blank()); setError(null); } }, [open]);

  if (!open) return null;
  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size={size}>
      <form onSubmit={submit} className="space-y-4">
        {description && <p className="text-sm text-slate-500">{description}</p>}
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.filter((f) => !f.hidden?.(values)).map((f) => (
            <div key={f.name} className={f.span === 2 || f.type === "textarea" || f.type === "checkboxes" ? "sm:col-span-2" : ""}>
              <Field field={f} value={values[f.name]} onChange={(v) => set(f.name, v)} />
              {f.hint && <p className="mt-1 text-xs text-slate-400">{f.hint}</p>}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ field: f, value, onChange }) {
  const common = { label: f.label + (f.required ? " *" : ""), required: f.required, placeholder: f.placeholder };
  if (f.type === "select") {
    return (
      <Select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{f.placeholder || "Select"}</option>
        {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    );
  }
  if (f.type === "textarea") {
    return (
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">{common.label}</span>
        <textarea
          rows={f.rows || 3}
          required={f.required}
          placeholder={f.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />
      </label>
    );
  }
  if (f.type === "checkboxes") {
    return (
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">{f.label}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {f.options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={value.includes(o.value)} onChange={(e) => onChange(e.target.checked ? [...value, o.value] : value.filter((x) => x !== o.value))} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (f.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
        {f.label}
      </label>
    );
  }
  return (
    <InputField
      {...common}
      type={f.type || "text"}
      value={value}
      min={f.min}
      max={f.max}
      step={f.step}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
