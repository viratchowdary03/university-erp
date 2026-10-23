import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { CheckCircle2, XCircle } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Tabs from "../../../components/common/Tabs";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import InputField from "../../../components/common/InputField";
import DataTable from "../../../components/common/DataTable";
import FilterSelect from "../../../components/common/FilterSelect";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { setUser } from "../../auth/authSlice";
import { PERM, canManage } from "../../../config/permissions";
import { ROLES, ROLE_LABELS } from "../../../config/roles";
import { formatDateTime, getErrorMessage, humanize } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";

export default function SettingsPage() {
  const user = useSelector((s) => s.auth.user);
  const admin = canManage(user.role, PERM.SETTINGS);
  const [tab, setTab] = useState("profile");
  return (
    <>
      <PageHeader title="Settings" subtitle="Your profile and, for administrators, the university settings" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "profile", label: "My profile" }, ...(admin ? [{ id: "university", label: "University" }, { id: "users", label: "All users" }, { id: "health", label: "Data health" }] : [])]} />
      {tab === "profile" && <Profile />}
      {tab === "university" && <University />}
      {tab === "users" && <Users />}
      {tab === "health" && <Health />}
    </>
  );
}

function Profile() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const toast = useToast();
  const send = useSend();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");

  const save = async (e) => {
    e.preventDefault();
    try {
      const data = await send.mutateAsync({ method: "put", url: "/settings/profile", body: { name, phone } });
      dispatch(setUser(data.user));
      toast.success("Profile updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Card className="max-w-xl">
      <form onSubmit={save} className="space-y-4">
        <InputField label="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
        <InputField label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField label="Email" value={user.email || ""} disabled readOnly />
          <InputField label="Role" value={ROLE_LABELS[user.role] || user.role} disabled readOnly />
        </div>
        <p className="text-xs text-slate-400">Your email and role can only be changed by an administrator.</p>
        <div className="flex items-center gap-4">
          <Button type="submit" loading={send.isPending}>Save changes</Button>
          <Link to="/change-password" className="text-sm font-medium text-brand-600 hover:underline">Change password</Link>
        </div>
      </form>
    </Card>
  );
}

function University() {
  const toast = useToast();
  const send = useSend();
  const query = useData(["settings"], "/settings");
  return (
    <QueryState query={query}>
      {(s) => <SettingsForm key={JSON.stringify(s)} initial={s} onSave={async (v) => { try { await send.mutateAsync({ method: "put", url: "/settings", body: v }); toast.success("Settings saved"); } catch (e) { toast.error(getErrorMessage(e)); } }} saving={send.isPending} />}
    </QueryState>
  );
}

function SettingsForm({ initial, onSave, saving }) {
  const [v, setV] = useState(initial);
  const field = (name, label, hint) => (
    <div>
      <InputField label={label} type="number" min="0" required value={v[name]} onChange={(e) => setV({ ...v, [name]: e.target.value })} />
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
  return (
    <Card title="Library rules" className="max-w-xl">
      <form onSubmit={(e) => { e.preventDefault(); onSave(v); }} className="space-y-4">
        {field("loanDays", "Loan period (days)", "How long a student may keep a book")}
        {field("finePerDay", "Fine per overdue day (₹)", "Charged when a late book is returned")}
        {field("maxBooksPerStudent", "Books per student", "The most books one student can hold at a time")}
        <Button type="submit" loading={saving}>Save settings</Button>
      </form>
    </Card>
  );
}

function Users() {
  const me = useSelector((s) => s.auth.user);
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const query = useData(["users", "all"], "/users", { params: { role: role || undefined, status: status || undefined } });

  const toggle = async (u) => {
    const next = u.status === "active" ? "suspended" : "active";
    if (!(await confirm({ title: next === "suspended" ? `Suspend ${u.name}?` : `Re-activate ${u.name}?`, message: next === "suspended" ? "They will be signed out and cannot sign in until re-activated." : "They can sign in again.", tone: next === "suspended" ? "danger" : "default" }))) return;
    send.mutateAsync({ method: "patch", url: `/users/${u.id}/status`, body: { status: next } }).then(() => toast.success(`Account ${next === "active" ? "re-activated" : "suspended"}`)).catch((e) => toast.error(getErrorMessage(e)));
  };

  return (
    <QueryState query={query} table>
      {({ users }) => (
        <Card>
          <DataTable
            rowKey={(u) => u.id}
            rows={users}
            getSearchText={(u) => `${u.name} ${u.email}`}
            searchPlaceholder="Search name or email"
            filters={<><FilterSelect label="Role" value={role} onChange={setRole} options={[{ value: "", label: "All" }, ...Object.values(ROLES).map((r) => ({ value: r, label: ROLE_LABELS[r] }))]} /><FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "", label: "All" }, { value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }]} /></>}
            columns={[
              { key: "n", header: "User", render: (u) => <><p className="font-medium">{u.name}</p><p className="text-xs text-slate-400">{u.email}</p></> },
              { key: "r", header: "Role", render: (u) => ROLE_LABELS[u.role] },
              { key: "s", header: "Status", render: (u) => <Badge tone={u.status === "active" ? "green" : "red"}>{humanize(u.status)}</Badge> },
              { key: "l", header: "Last sign-in", render: (u) => (u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never") },
              { key: "a", header: "", render: (u) => u.id !== me.id && <Button variant="secondary" className="px-3 py-1.5" onClick={() => toggle(u)}>{u.status === "active" ? "Suspend" : "Re-activate"}</Button> },
            ]}
            emptyTitle="No users"
          />
        </Card>
      )}
    </QueryState>
  );
}

function Health() {
  const query = useData(["settings", "health"], "/settings/health", { staleTime: 0 });
  return (
    <QueryState query={query}>
      {({ counts, checks }) => (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Consistency checks">
            <ul className="space-y-2">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-sm">
                  {c.ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-red-500" />}
                  <span className={c.ok ? "text-slate-600" : "font-medium text-red-700"}>{c.label}{c.ok ? "" : `: ${c.broken}`}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-400">Read-only. These count records that point at something that no longer exists.</p>
          </Card>
          <Card title="Records in the database">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {counts.map((c) => (<div key={c.name} className="flex justify-between border-b border-slate-100 py-1"><dt className="text-slate-500">{c.name}</dt><dd className="font-medium">{c.count}</dd></div>))}
            </dl>
          </Card>
        </div>
      )}
    </QueryState>
  );
}
