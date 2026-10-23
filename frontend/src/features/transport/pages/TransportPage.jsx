import { useState } from "react";
import { useSelector } from "react-redux";
import { Bus, MapPin, Phone, Pencil, Plus, Trash2, UserMinus } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Tabs from "../../../components/common/Tabs";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import DataTable from "../../../components/common/DataTable";
import FormModal from "../../../components/common/FormModal";
import EmptyState from "../../../components/common/EmptyState";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { ROLES } from "../../../config/roles";
import { formatMoney, formatIso, getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";

export default function TransportPage() {
  const role = useSelector((s) => s.auth.user.role);
  return role === ROLES.STUDENT ? <MyTransport /> : <TransportAdmin />;
}

function MyTransport() {
  const query = useData(["transport", "me"], "/transport/me");
  return (
    <>
      <PageHeader title="My transport" subtitle="Your bus route, stop and driver" />
      <QueryState query={query}>
        {(t) => !t.rider ? (
          <Card><EmptyState icon={Bus} title="You are not using the university bus" text="Ask the transport office if you would like a seat." /></Card>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title={t.route.name} action={<Badge tone="green">{formatMoney(t.route.fee)} / semester</Badge>}>
              <p className="mb-3 text-sm text-slate-600">You board at <b>{t.stop}</b> (since {formatIso(t.since)}).</p>
              <ol className="relative ml-2 space-y-4 border-l-2 border-brand-100 pl-5">
                {t.route.stops.map((s) => (
                  <li key={s.name} className="relative">
                    <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ${s.name === t.stop ? "bg-brand-600 ring-4 ring-brand-100" : "bg-slate-300"}`} />
                    <p className={`text-sm ${s.name === t.stop ? "font-semibold text-brand-700" : "text-slate-700"}`}>{s.name}</p>
                    {s.time && <p className="text-xs text-slate-400">{s.time}</p>}
                  </li>
                ))}
              </ol>
            </Card>
            <Card title="Vehicle and driver">
              <p className="text-lg font-semibold">{t.vehicle?.number}</p>
              <p className="mb-4 text-sm text-slate-500">{t.vehicle?.type}, {t.vehicle?.capacity} seats</p>
              <p className="text-sm"><b>{t.vehicle?.driverName}</b></p>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-600"><Phone size={14} /> {t.vehicle?.driverPhone}</p>
            </Card>
          </div>
        )}
      </QueryState>
    </>
  );
}

function TransportAdmin() {
  const [tab, setTab] = useState("routes");
  const query = useData(["transport", "overview"], "/transport/overview");
  return (
    <>
      <PageHeader title="Transport" subtitle="Routes, vehicles and who rides where" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "routes", label: "Routes" }, { id: "vehicles", label: "Vehicles" }, { id: "riders", label: "Riders" }]} />
      <QueryState query={query} table>
        {(data) => tab === "routes" ? <Routes data={data} /> : tab === "vehicles" ? <Vehicles data={data} /> : <Riders data={data} />}
      </QueryState>
    </>
  );
}

function useCrud(base, label) {
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const save = async (editing, v) => {
    if (editing === "new") await send.mutateAsync({ method: "post", url: base, body: v });
    else await send.mutateAsync({ method: "put", url: `${base}/${editing.id}`, body: v });
    toast.success(`${label} saved`);
  };
  const remove = async (row, name) => {
    if (!(await confirm({ title: `Delete ${label.toLowerCase()}?`, message: name, tone: "danger" }))) return;
    send.mutateAsync({ method: "delete", url: `${base}/${row.id}` }).then(() => toast.success(`${label} deleted`)).catch((e) => toast.error(getErrorMessage(e)));
  };
  return { save, remove };
}

function Routes({ data }) {
  const [editing, setEditing] = useState(null);
  const { save, remove } = useCrud("/transport/routes", "Route");
  const open = (r) => setEditing(r);
  // "Race Course @ 07:40" per line  <->  { name, time }
  const toText = (stops) => stops.map((s) => `${s.name}${s.time ? ` @ ${s.time}` : ""}`).join("\n");
  const toStops = (text) => text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [name, time] = l.split("@").map((x) => x.trim()); return { name, time: time || "" }; });

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => open("new")} disabled={data.vehicles.length === 0}><Plus size={16} /> New route</Button></div>
      {data.vehicles.length === 0 && <p className="mb-4 text-sm text-amber-700">Add a vehicle first, then create routes.</p>}
      <Card>
        <DataTable
          rowKey={(r) => r.id}
          rows={data.routes}
          getSearchText={(r) => `${r.name} ${r.stops.map((s) => s.name).join(" ")}`}
          columns={[
            { key: "n", header: "Route", render: (r) => <><p className="font-medium">{r.name}</p><p className="text-xs text-slate-400"><MapPin size={11} className="inline" /> {r.stops.map((s) => s.name).join(" → ")}</p></> },
            { key: "v", header: "Vehicle", render: (r) => r.vehicle?.number || "-" },
            { key: "o", header: "Seats", render: (r) => <Badge tone={r.occupied >= r.capacity ? "red" : "green"}>{r.occupied} / {r.capacity}</Badge> },
            { key: "f", header: "Fee", render: (r) => formatMoney(r.fee) },
            { key: "a", header: "", render: (r) => <div className="flex justify-end gap-1"><button type="button" aria-label="Edit route" onClick={() => open(r)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button><button type="button" aria-label="Delete route" onClick={() => remove(r, r.name)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"><Trash2 size={16} /></button></div> },
          ]}
          emptyTitle="No routes yet"
        />
      </Card>
      <FormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New route" : "Edit route"}
        initial={editing && editing !== "new" ? { ...editing, stopsText: toText(editing.stops) } : {}}
        fields={[
          { name: "name", label: "Route name", required: true, span: 2 },
          { name: "vehicleId", label: "Vehicle", type: "select", required: true, options: data.vehicles.map((v) => ({ value: v.id, label: `${v.number} (${v.capacity} seats)` })) },
          { name: "fee", label: "Fee per semester (₹)", type: "number", required: true, min: 0 },
          { name: "stopsText", label: "Stops, one per line (optional time after @)", type: "textarea", rows: 5, hint: "Example: Alkapuri Circle @ 07:30", required: true },
        ]}
        onSubmit={async ({ stopsText, ...v }) => { await save(editing, { ...v, stops: toStops(stopsText) }); setEditing(null); }}
      />
    </>
  );
}

function Vehicles({ data }) {
  const [editing, setEditing] = useState(null);
  const { save, remove } = useCrud("/transport/vehicles", "Vehicle");
  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setEditing("new")}><Plus size={16} /> Add vehicle</Button></div>
      <Card>
        <DataTable
          rowKey={(r) => r.id}
          rows={data.vehicles}
          columns={[
            { key: "n", header: "Vehicle", render: (v) => <><p className="font-medium">{v.number}</p><p className="text-xs text-slate-400">{v.type}</p></> },
            { key: "c", header: "Seats", render: (v) => v.capacity },
            { key: "d", header: "Driver", render: (v) => <>{v.driverName}<p className="text-xs text-slate-400">{v.driverPhone}</p></> },
            { key: "a", header: "", render: (v) => <div className="flex justify-end gap-1"><button type="button" aria-label="Edit vehicle" onClick={() => setEditing(v)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button><button type="button" aria-label="Delete vehicle" onClick={() => remove(v, v.number)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"><Trash2 size={16} /></button></div> },
          ]}
          emptyTitle="No vehicles yet"
        />
      </Card>
      <FormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add vehicle" : "Edit vehicle"}
        initial={editing && editing !== "new" ? editing : { type: "Bus" }}
        fields={[
          { name: "number", label: "Registration number", required: true, placeholder: "GJ-06-AB-1234" },
          { name: "type", label: "Type", type: "select", required: true, options: ["Bus", "Mini Bus", "Van"].map((t) => ({ value: t, label: t })) },
          { name: "capacity", label: "Seats", type: "number", required: true, min: 1, max: 100 },
          { name: "driverName", label: "Driver name", required: true },
          { name: "driverPhone", label: "Driver phone", type: "tel", required: true },
        ]}
        onSubmit={async (v) => { await save(editing, v); setEditing(null); }}
      />
    </>
  );
}

function Riders({ data }) {
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const [adding, setAdding] = useState(false);
  const free = useData(["transport", "allocatable"], "/transport/allocatable", { enabled: adding });
  const routeBy = new Map(data.routes.map((r) => [r.id, r]));

  const release = async (r) => {
    if (!(await confirm({ title: "Release this seat?", message: r.studentName, tone: "danger" }))) return;
    send.mutateAsync({ method: "delete", url: `/transport/allocations/${r.studentId}` }).then(() => toast.success("Seat released")).catch((e) => toast.error(getErrorMessage(e)));
  };

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setAdding(true)} disabled={data.routes.length === 0}><Plus size={16} /> Assign a seat</Button></div>
      <Card>
        <DataTable
          rowKey={(r) => r.id}
          rows={data.riders}
          getSearchText={(r) => `${r.studentName} ${r.enrollmentNo} ${routeBy.get(r.routeId)?.name} ${r.stop}`}
          searchPlaceholder="Search student, route or stop"
          columns={[
            { key: "s", header: "Student", render: (r) => <><p className="font-medium">{r.studentName}</p><p className="text-xs text-slate-400">{r.enrollmentNo}</p></> },
            { key: "r", header: "Route", render: (r) => routeBy.get(r.routeId)?.name },
            { key: "st", header: "Stop", render: (r) => r.stop },
            { key: "d", header: "Since", render: (r) => formatIso(r.since) },
            { key: "a", header: "", render: (r) => <button type="button" aria-label={`Release seat of ${r.studentName}`} onClick={() => release(r)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"><UserMinus size={16} /></button> },
          ]}
          emptyTitle="Nobody has a seat yet"
        />
      </Card>
      <FormModal
        open={adding}
        onClose={() => setAdding(false)}
        title="Assign a seat"
        submitLabel="Assign"
        fields={[
          { name: "studentId", label: "Student", type: "select", required: true, span: 2, options: (free.data ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.enrollmentNo})` })) },
          { name: "routeId", label: "Route", type: "select", required: true, options: data.routes.map((r) => ({ value: r.id, label: `${r.name} (${r.capacity - r.occupied} free)` })) },
          { name: "stop", label: "Stop (as written on the route)", required: true, hint: "Example: Race Course" },
        ]}
        onSubmit={async (v) => { await send.mutateAsync({ method: "post", url: "/transport/allocations", body: v }); toast.success("Seat assigned"); setAdding(false); }}
      />
    </>
  );
}
