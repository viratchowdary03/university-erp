import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Search, Send, MessageSquarePlus, ArrowLeft } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Modal from "../../../components/common/Modal";
import EmptyState from "../../../components/common/EmptyState";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { ROLE_LABELS } from "../../../config/roles";
import { formatDateTime, getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";

// Inbox on the left, the open chat on the right (one column on a phone)
export default function MessagesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);
  const list = useData(["messages", "conversations"], "/messages/conversations", { refetchInterval: 15_000 });

  return (
    <>
      <PageHeader title="Messages" subtitle="Private messages with teachers, staff and administrators" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className={`lg:col-span-1 ${id ? "hidden lg:block" : ""}`} title="Chats" action={<button type="button" onClick={() => setPicking(true)} className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"><MessageSquarePlus size={16} /> New</button>}>
          <QueryState query={list} table>
            {(chats) => chats.length === 0 ? <EmptyState title="No chats yet" text="Start one with New." /> : (
              <ul className="-mx-2 divide-y">
                {chats.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => navigate(`/messages/${c.id}`)} className={`flex w-full items-start gap-3 rounded-lg px-2 py-3 text-left hover:bg-slate-50 ${c.id === id ? "bg-brand-50" : ""}`}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700" aria-hidden="true">{c.with.name.charAt(0)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium text-slate-900">{c.with.name}</span>{c.unread > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">{c.unread}</span>}</span>
                        <span className="block truncate text-xs text-slate-500">{c.mine ? "You: " : ""}{c.lastMessage || "No messages yet"}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </Card>
        <div className={`lg:col-span-2 ${id ? "" : "hidden lg:block"}`}>
          {id ? <Chat key={id} id={id} onBack={() => navigate("/messages")} /> : <Card><EmptyState title="Choose a chat" text="Pick a conversation or start a new one." /></Card>}
        </div>
      </div>
      {picking && <PickPerson onClose={() => setPicking(false)} onPick={(chatId) => { setPicking(false); navigate(`/messages/${chatId}`); }} />}
    </>
  );
}

function Chat({ id, onBack }) {
  const toast = useToast();
  const send = useSend();
  const [text, setText] = useState("");
  const end = useRef(null);
  const query = useData(["messages", "chat", id], `/messages/conversations/${id}`, { refetchInterval: 5_000, staleTime: 0 });
  const count = query.data?.messages.length;

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [count]);

  const submit = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    try {
      await send.mutateAsync({ method: "post", url: `/messages/conversations/${id}/messages`, body: { body } });
      setText("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Card className="flex h-[70vh] flex-col !p-0">
      <QueryState query={query} table>
        {({ with: other, messages }) => (
          <>
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <button type="button" onClick={onBack} aria-label="Back to chats" className="rounded p-1 text-slate-500 hover:bg-slate-100 lg:hidden"><ArrowLeft size={18} /></button>
              <div><p className="text-sm font-semibold text-slate-900">{other.name}</p><p className="text-xs text-slate-400">{ROLE_LABELS[other.role] || ""}</p></div>
            </div>
            <ul className="flex-1 space-y-2 overflow-y-auto px-4 py-4" aria-live="polite">
              {messages.map((m) => (
                <li key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.mine ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-slate-100 text-slate-800"}`}>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`mt-1 text-[10px] ${m.mine ? "text-brand-100" : "text-slate-400"}`}>{formatDateTime(m.at)}</p>
                  </div>
                </li>
              ))}
              {messages.length === 0 && <li className="py-10 text-center text-sm text-slate-400">Say hello</li>}
              <li ref={end} />
            </ul>
            <form onSubmit={submit} className="flex gap-2 border-t p-3">
              <label className="sr-only" htmlFor="message">Message</label>
              <input id="message" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Type a message" autoComplete="off" className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
              <button type="submit" disabled={!text.trim() || send.isPending} aria-label="Send" className="rounded-lg bg-brand-600 px-4 text-white hover:bg-brand-700 disabled:opacity-50"><Send size={16} /></button>
            </form>
          </>
        )}
      </QueryState>
    </Card>
  );
}

function PickPerson({ onClose, onPick }) {
  const toast = useToast();
  const send = useSend();
  const [q, setQ] = useState("");
  const people = useData(["messages", "people", q], "/messages/people", { params: { q: q || undefined }, staleTime: 5_000 });
  const start = (userId) => send.mutateAsync({ method: "post", url: "/messages/conversations", body: { userId } }).then((r) => onPick(r.id)).catch((e) => toast.error(getErrorMessage(e)));
  return (
    <Modal open onClose={onClose} title="New message">
      <label className="relative mb-4 block">
        <span className="sr-only">Search people</span>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
      </label>
      <QueryState query={people} table>
        {(list) => (
          <ul className="max-h-72 divide-y overflow-y-auto">
            {list.map((p) => (
              <li key={p.id}><button type="button" onClick={() => start(p.id)} className="flex w-full items-center justify-between px-2 py-2.5 text-left hover:bg-slate-50"><span className="text-sm font-medium">{p.name}</span><span className="text-xs text-slate-400">{ROLE_LABELS[p.role]}{p.school ? ` - ${p.school}` : ""}</span></button></li>
            ))}
            {list.length === 0 && <li className="py-6 text-center text-sm text-slate-400">Nobody found</li>}
          </ul>
        )}
      </QueryState>
    </Modal>
  );
}
