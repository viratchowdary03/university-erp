import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { useData, useSend } from "../../../api/resource";
import { formatDateTime } from "../../../utils/helpers";

// The bell in the top bar: unread count (checked every minute) and the latest notifications
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const navigate = useNavigate();
  const send = useSend();
  const unread = useData(["notifications", "unread"], "/notifications/unread-count", { refetchInterval: 60_000 });
  const list = useData(["notifications", "list"], "/notifications", { enabled: open });

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (unread.isError) return null; // demo mode or the server is away: no bell rather than a broken one
  const count = unread.data?.unread ?? 0;

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) await send.mutateAsync({ method: "patch", url: `/notifications/${n.id}/read` }).catch(() => {});
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
        aria-expanded={open}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
            {count > 0 && (
              <button type="button" onClick={() => send.mutate({ method: "patch", url: "/notifications/read-all" })} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 divide-y overflow-y-auto">
            {(list.data?.items ?? []).slice(0, 8).map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => openItem(n)} className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${n.read ? "" : "bg-brand-50/60"}`}>
                  <p className="text-sm font-medium text-slate-800">{n.title}</p>
                  {n.message && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.message}</p>}
                  <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(n.createdAt)}</p>
                </button>
              </li>
            ))}
            {list.isPending && <li className="px-4 py-6 text-center text-xs text-slate-400">Loading...</li>}
            {list.data && list.data.items.length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-400">You are all caught up</li>}
          </ul>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t px-4 py-2.5 text-center text-xs font-medium text-brand-600 hover:bg-slate-50">
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
