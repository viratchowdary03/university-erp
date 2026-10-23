import { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import FilterSelect from "../../../components/common/FilterSelect";
import FormModal from "../../../components/common/FormModal";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { PERM, canManage } from "../../../config/permissions";
import { SCHOOLS, getSchoolName } from "../../../config/schools";
import { formatIso, getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";

const TYPES = ["Seminar", "Workshop", "Cultural", "Sports", "Placement Drive", "Holiday", "Other"];

export default function EventsPage() {
  const user = useSelector((s) => s.auth.user);
  const manage = canManage(user.role, PERM.EVENTS);
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const [show, setShow] = useState("upcoming");
  const [editing, setEditing] = useState(null);
  const query = useData(["events"], "/events");

  const toggle = (e) => send.mutateAsync({ method: e.registeredByMe ? "delete" : "post", url: `/events/${e.id}/register` })
    .then(() => toast.success(e.registeredByMe ? "Registration cancelled" : "You are registered")).catch((err) => toast.error(getErrorMessage(err)));
  const remove = async (e) => {
    if (!(await confirm({ title: "Delete this event?", message: e.title, tone: "danger" }))) return;
    send.mutateAsync({ method: "delete", url: `/events/${e.id}` }).then(() => toast.success("Event deleted")).catch((err) => toast.error(getErrorMessage(err)));
  };

  return (
    <>
      <PageHeader title="Events" subtitle="What is happening on campus" action={manage && <Button onClick={() => setEditing("new")}><Plus size={16} /> New event</Button>} />
      <div className="mb-4"><FilterSelect label="Show" value={show} onChange={setShow} options={[{ value: "upcoming", label: "Upcoming" }, { value: "past", label: "Past" }, { value: "all", label: "All" }]} /></div>
      <QueryState query={query}>
        {(events) => {
          const rows = events.filter((e) => show === "all" || (show === "past" ? e.past : !e.past)).sort((a, b) => (show === "past" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
          return rows.length === 0 ? <Card><EmptyState icon={CalendarDays} title="No events to show" /></Card> : (
            <div className="grid gap-4 lg:grid-cols-2">
              {rows.map((e) => (
                <Card key={e.id} className={e.past ? "opacity-70" : ""}>
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/events/${e.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{e.title}</Link>
                    <Badge tone={e.type === "Holiday" ? "amber" : "brand"}>{e.type}</Badge>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><CalendarDays size={14} /> {formatIso(e.date)}{e.startTime ? `, ${e.startTime}${e.endTime ? ` - ${e.endTime}` : ""}` : ""}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><MapPin size={14} /> {e.venue || "Venue to be announced"}{e.school ? ` - ${getSchoolName(e.school)}` : ""}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {e.type !== "Holiday" && !e.past && (e.registeredByMe
                      ? <Button variant="secondary" className="px-3 py-1.5" onClick={() => toggle(e)}>Cancel registration</Button>
                      : <Button className="px-3 py-1.5" onClick={() => toggle(e)} disabled={e.full}>{e.full ? "Full" : "Register"}</Button>)}
                    <span className="flex items-center gap-1 text-xs text-slate-400"><Users size={13} /> {e.registered}{e.capacity ? ` / ${e.capacity}` : ""} registered</span>
                    {manage && <span className="ml-auto flex gap-1"><button type="button" aria-label="Edit event" onClick={() => setEditing(e)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button><button type="button" aria-label="Delete event" onClick={() => remove(e)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"><Trash2 size={16} /></button></span>}
                  </div>
                </Card>
              ))}
            </div>
          );
        }}
      </QueryState>
      <FormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New event" : "Edit event"}
        size="lg"
        initial={editing && editing !== "new" ? editing : { type: "Seminar", capacity: 0 }}
        fields={[
          { name: "title", label: "Title", required: true, span: 2 },
          { name: "type", label: "Type", type: "select", required: true, options: TYPES.map((t) => ({ value: t, label: t })) },
          { name: "venue", label: "Venue", required: true },
          { name: "date", label: "Date", type: "date", required: true },
          { name: "capacity", label: "Seats (0 = no limit)", type: "number", min: 0 },
          { name: "startTime", label: "Starts", type: "time" },
          { name: "endTime", label: "Ends", type: "time" },
          { name: "school", label: "Open to", type: "select", placeholder: "Every school", options: SCHOOLS.map((s) => ({ value: s.code, label: s.name })), span: 2 },
          { name: "description", label: "Details", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          if (editing === "new") await send.mutateAsync({ method: "post", url: "/events", body: v });
          else await send.mutateAsync({ method: "put", url: `/events/${editing.id}`, body: v });
          toast.success("Event saved");
          setEditing(null);
        }}
      />
    </>
  );
}
