import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { formatDateTime } from "../../../utils/helpers";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const send = useSend();
  const query = useData(["notifications", "list"], "/notifications");

  const open = async (n) => {
    if (!n.read) await send.mutateAsync({ method: "patch", url: `/notifications/${n.id}/read` });
    if (n.link) navigate(n.link);
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Things that happened to your fees, leave, results, tickets and more"
        action={<Button variant="secondary" onClick={() => send.mutate({ method: "patch", url: "/notifications/read-all" })}><CheckCheck size={16} /> Mark all read</Button>}
      />
      <QueryState query={query}>
        {({ items }) => (
          <Card>
            {items.length === 0 ? (
              <EmptyState icon={Bell} title="No notifications yet" text="They appear here when something needs your attention." />
            ) : (
              <ul className="divide-y">
                {items.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 py-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-slate-200" : "bg-brand-500"}`} aria-label={n.read ? "Read" : "Unread"} />
                    <button type="button" onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                      <p className={`text-sm ${n.read ? "text-slate-600" : "font-medium text-slate-900"}`}>{n.title}</p>
                      {n.message && <p className="text-xs text-slate-500">{n.message}</p>}
                      <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(n.createdAt)}</p>
                    </button>
                    <button type="button" aria-label="Remove notification" onClick={() => send.mutate({ method: "delete", url: `/notifications/${n.id}` })} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </QueryState>
    </>
  );
}
