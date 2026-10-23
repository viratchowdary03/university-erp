import { useState } from "react";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { PERM, canManage } from "../../../config/permissions";
import { ROLE_LABELS } from "../../../config/roles";
import { formatDateTime, humanize, getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { STATUS_TONE } from "./GrievancePage";

export default function TicketPage() {
  const { id } = useParams();
  const user = useSelector((s) => s.auth.user);
  const handler = canManage(user.role, PERM.GRIEVANCE);
  const toast = useToast();
  const send = useSend();
  const [text, setText] = useState("");
  const query = useData(["grievance", id], `/grievance/${id}`);

  const act = (req, ok) => send.mutateAsync(req).then(() => ok && toast.success(ok)).catch((e) => toast.error(getErrorMessage(e)));
  const comment = async (e) => {
    e.preventDefault();
    await act({ method: "post", url: `/grievance/${id}/comments`, body: { text } });
    setText("");
  };

  return (
    <>
      <Link to="/grievance" className="mb-3 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"><ArrowLeft size={15} /> All tickets</Link>
      <QueryState query={query}>
        {(t) => {
          const owner = t.userId === user.id;
          return (
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="space-y-5 lg:col-span-2">
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-xs text-slate-400">{t.ticketNo} - {t.category}</p><h1 className="text-xl font-semibold text-slate-900">{t.subject}</h1></div>
                    <Badge tone={STATUS_TONE[t.status]}>{humanize(t.status)}</Badge>
                  </div>
                  <p className="mt-4 whitespace-pre-line text-sm text-slate-700">{t.description}</p>
                  <p className="mt-4 text-xs text-slate-400">Raised by {t.name} ({ROLE_LABELS[t.role]}) on {formatDateTime(t.createdAt)}</p>
                </Card>
                <Card title="Conversation">
                  <ul className="space-y-4">
                    {t.comments.map((c) => (
                      <li key={c._id || c.at} className={`rounded-lg p-3 text-sm ${c.userId === t.userId ? "bg-slate-50" : "bg-brand-50"}`}>
                        <p className="mb-1 text-xs text-slate-500"><b>{c.name}</b> ({ROLE_LABELS[c.role]}) - {formatDateTime(c.at)}</p>
                        <p className="whitespace-pre-line text-slate-700">{c.text}</p>
                      </li>
                    ))}
                    {t.comments.length === 0 && <li className="py-4 text-center text-sm text-slate-400">No replies yet</li>}
                  </ul>
                  {t.status !== "closed" && (
                    <form onSubmit={comment} className="mt-5">
                      <label className="sr-only" htmlFor="reply">Your reply</label>
                      <textarea id="reply" required rows={3} maxLength={1500} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
                      <div className="mt-2 flex justify-end"><Button type="submit" loading={send.isPending}>Send reply</Button></div>
                    </form>
                  )}
                </Card>
              </div>
              <Card title="Status">
                {handler ? (
                  <select aria-label="Ticket status" value={t.status} onChange={(e) => act({ method: "patch", url: `/grievance/${id}/status`, body: { status: e.target.value } }, "Status updated")} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    {["open", "in_progress", "resolved", "closed"].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                  </select>
                ) : owner && t.status !== "closed" ? (
                  <Button variant="secondary" className="w-full" onClick={() => act({ method: "patch", url: `/grievance/${id}/status`, body: { status: "closed" } }, "Ticket closed")}>Close this ticket</Button>
                ) : <p className="text-sm text-slate-500">{humanize(t.status)}</p>}
              </Card>
            </div>
          );
        }}
      </QueryState>
    </>
  );
}
