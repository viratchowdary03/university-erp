import { Link } from "react-router-dom";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import { MOCK } from "../../../api/demo";
import { useData } from "../../../api/resource";
import { formatDate } from "../../../utils/helpers";
import { notices as demoNotices } from "../dashboardData";

// The latest notices that are meant for this person (real ones from the database; demo mode shows samples)
export default function NoticesCard() {
  const query = useData(["notices", "latest"], "/notices", { params: { limit: 5 }, enabled: !MOCK });
  const items = MOCK ? demoNotices.map((n) => ({ id: n.id, title: n.title, createdAt: n.date, priority: "normal" })) : query.data ?? [];

  return (
    <Card title="Notices" action={!MOCK && <Link to="/notices" className="text-sm font-medium text-brand-600 hover:underline">All notices</Link>}>
      <ul className="divide-y">
        {items.map((n) => (
          <li key={n.id} className="flex items-start justify-between gap-4 py-3 text-sm">
            <span>{n.title} {n.priority && n.priority !== "normal" && <Badge tone={n.priority === "urgent" ? "red" : "amber"}>{n.priority}</Badge>}</span>
            <span className="shrink-0 text-xs text-slate-400">{MOCK ? n.createdAt : formatDate(n.createdAt)}</span>
          </li>
        ))}
        {!MOCK && query.isPending && <li className="py-4 text-center text-sm text-slate-400">Loading...</li>}
        {!MOCK && query.isError && <li className="py-4 text-center text-sm text-red-600">Could not load notices</li>}
        {!MOCK && query.data && items.length === 0 && <li className="py-4 text-center text-sm text-slate-400">No notices right now</li>}
      </ul>
    </Card>
  );
}
