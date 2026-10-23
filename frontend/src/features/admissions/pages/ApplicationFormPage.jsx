import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import Logo from "../../../components/common/Logo";
import InputField from "../../../components/common/InputField";
import Select from "../../../components/common/Select";
import Button from "../../../components/common/Button";
import Badge from "../../../components/common/Badge";
import Tabs from "../../../components/common/Tabs";
import api from "../../../api/axios";
import { realOnly } from "../../../api/demo";
import { useData } from "../../../api/resource";
import { getErrorMessage, humanize, formatDate } from "../../../utils/helpers";
import { STATUS_TONE } from "../components/statusTone";

const EMPTY = {
  name: "", email: "", phone: "", gender: "", dateOfBirth: "", school: "", program: "", previousSchool: "",
  percentage: "", guardianName: "", guardianPhone: "", city: "", statement: "",
};

// Public page (no sign-in): apply for admission, or check how an application is going
export default function ApplicationFormPage() {
  const [tab, setTab] = useState("apply");
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 to-brand-900 p-4">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center"><Logo /></div>
          <h1 className="text-xl font-semibold text-slate-900">Admissions</h1>
          <p className="mt-1 text-sm text-slate-500">Apply online. No account is needed.</p>
        </div>
        <Tabs value={tab} onChange={setTab} tabs={[{ id: "apply", label: "Apply now" }, { id: "status", label: "Check my application" }]} />
        {tab === "apply" ? <ApplyForm onCheck={() => setTab("status")} /> : <StatusCheck />}
        <Link to="/login" className="mt-6 flex items-center justify-center gap-1 text-sm font-medium text-brand-600 hover:underline">
          <ArrowLeft size={16} /> Back to sign in
        </Link>
      </div>
    </div>
  );
}

function ApplyForm({ onCheck }) {
  const options = useData(["admissions", "options"], "/admissions/options");
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value, ...(name === "school" ? { program: "" } : {}) }));
  const school = (options.data ?? []).find((s) => s.code === values.school);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const data = await realOnly(() => api.post("/admissions/apply", values));
      setDone(data);
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit the application"));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="py-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={44} />
        <h2 className="text-lg font-semibold text-slate-900">Application submitted</h2>
        <p className="mt-2 text-sm text-slate-600">Your application number is</p>
        <p className="my-2 text-2xl font-bold tracking-wide text-brand-700">{done.applicationNo}</p>
        <p className="text-sm text-slate-500">Keep it safe. You need it, with your email, to check the status.</p>
        <Button variant="secondary" className="mt-5" onClick={onCheck}>Check status</Button>
      </div>
    );
  }
  if (options.isError) {
    return <p role="alert" className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-700">{getErrorMessage(options.error)}</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Full name *" required value={values.name} onChange={set("name")} />
        <InputField label="Email *" type="email" required value={values.email} onChange={set("email")} />
        <InputField label="Phone *" type="tel" required value={values.phone} onChange={set("phone")} />
        <Select label="Gender *" required value={values.gender} onChange={set("gender")}>
          <option value="">Select</option><option value="M">Male</option><option value="F">Female</option>
        </Select>
        <InputField label="Date of birth *" type="date" required value={values.dateOfBirth} onChange={set("dateOfBirth")} />
        <InputField label="City *" required value={values.city} onChange={set("city")} />
        <Select label="School *" required value={values.school} onChange={set("school")}>
          <option value="">{options.isPending ? "Loading..." : "Select a school"}</option>
          {(options.data ?? []).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </Select>
        <Select label="Program *" required value={values.program} onChange={set("program")} disabled={!school}>
          <option value="">{school ? "Select a program" : "Choose a school first"}</option>
          {(school?.programs ?? []).map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <InputField label="Previous school or college *" required value={values.previousSchool} onChange={set("previousSchool")} />
        <InputField label="Percentage in last exam *" type="number" min="0" max="100" step="0.1" required value={values.percentage} onChange={set("percentage")} />
        <InputField label="Guardian name *" required value={values.guardianName} onChange={set("guardianName")} />
        <InputField label="Guardian phone *" type="tel" required value={values.guardianPhone} onChange={set("guardianPhone")} />
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Why do you want to join? (optional)</span>
        <textarea rows={3} maxLength={1000} value={values.statement} onChange={set("statement")} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
      </label>
      <Button type="submit" loading={busy} className="w-full">{busy ? "Submitting..." : "Submit application"}</Button>
    </form>
  );
}

function StatusCheck() {
  const [form, setForm] = useState({ applicationNo: "", email: "" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const check = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      setResult(await realOnly(() => api.post("/admissions/status", form)));
    } catch (err) {
      setError(getErrorMessage(err, "Could not find the application"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form onSubmit={check} className="grid gap-4 sm:grid-cols-2">
        <InputField label="Application number" required placeholder="APP2026-0001" value={form.applicationNo} onChange={(e) => setForm({ ...form, applicationNo: e.target.value })} />
        <InputField label="Email used to apply" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Button type="submit" loading={busy} className="sm:col-span-2">Check status</Button>
      </form>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {result && (
        <div className="mt-5 rounded-xl border p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{result.name}</p>
              <p className="text-sm text-slate-500">{result.program}</p>
            </div>
            <Badge tone={STATUS_TONE[result.status]}>{humanize(result.status)}</Badge>
          </div>
          {result.remarks && <p className="mt-3 text-sm text-slate-600">Note from admissions: {result.remarks}</p>}
          <p className="mt-3 text-xs text-slate-400">Last updated {formatDate(result.updatedAt)}</p>
        </div>
      )}
    </div>
  );
}
