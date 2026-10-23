import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { PERM, canManage } from "../../../config/permissions";
import { ROLE_LABELS } from "../../../config/roles";
import { formatIso, getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";

export default function EventDetailPage() {
  const { id } = useParams();
  const user = useSelector((s) => s.auth.user);
  const manage = canManage(user.role, PERM.EVENTS);
  const toast = useToast();
  const send = useSend();
  const query = useData(["events", id], `/events/${id}`);
  const people = useData(["events", id, "people"], `/events/${id}/registrations`, { enabled: manage });

  const toggle = (e) => send.mutateAsync({ method: e.registeredByMe ? "delete" : "post", url: `/events/${id}/register` })
    .then(() => toast.success(e.registeredByMe ? "Registration cancelled" : "You are registered")).catch((err) => toast.error(getErrorMessage(err)));

  return (
    <>
      <Link to="/events" className="mb-3 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"><ArrowLeft size={15} /> All events</Link>
      <QueryState query={query}>
        {(e) => (
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <Badge tone="brand">{e.type}</Badge>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">{e.title}</h1>
              <p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><CalendarDays size={16} /> {formatIso(e.date)}{e.startTime ? `, ${e.startTime}${e.endTime ? ` - ${e.endTime}` : ""}` : ""}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><MapPin size={16} /> {e.venue}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><Users size={16} /> {e.registered}{e.capacity ? ` of ${e.capacity}` : ""} registered</p>
              {e.description && <p className="mt-5 whitespace-pre-line text-sm text-slate-700">{e.description}</p>}
              {e.type !== "Holiday" && !e.past && (
                <Button className="mt-6" variant={e.registeredByMe ? "secondary" : "primary"} onClick={() => toggle(e)} disabled={!e.registeredByMe && e.full}>
                  {e.registeredByMe ? "Cancel registration" : e.full ? "Event is full" : "Register"}
                </Button>
              )}
            </Card>
            {manage && (
              <Card title={`Registered (${people.data?.length ?? 0})`}>
                <ul className="max-h-96 divide-y overflow-y-auto text-sm">
                  {(people.data ?? []).map((p) => <li key={p.id} className="py-2"><p className="font-medium">{p.name}</p><p className="text-xs text-slate-400">{ROLE_LABELS[p.role]}</p></li>)}
                  {people.data?.length === 0 && <li className="py-6 text-center text-slate-400">Nobody yet</li>}
                </ul>
              </Card>
            )}
          </div>
        )}
      </QueryState>
    </>
  );
}
