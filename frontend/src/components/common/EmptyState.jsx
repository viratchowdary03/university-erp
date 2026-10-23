import { Inbox } from "lucide-react";

export default function EmptyState({ title = "Nothing to show", text, icon: Icon = Inbox }) {
  return (
    <div className="py-12 text-center text-slate-400">
      <Icon className="mx-auto mb-2" size={28} />
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {text && <p className="mt-1 text-xs">{text}</p>}
    </div>
  );
}
