import { Home } from "lucide-react";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import DetailList from "../../../components/common/DetailList";
import EmptyState from "../../../components/common/EmptyState";
import { HOSTEL_FACILITIES, HOSTEL_RULES } from "../../../utils/demoData";
import { formatDate } from "../../../utils/helpers";

const FEE_TONE = { Paid: "green", Partial: "amber", Pending: "red" };

// What a student sees about their own hostel
export default function MyHostel({ data }) {
  if (!data.resident) {
    return (
      <Card>
        <EmptyState icon={Home} title="You are a day scholar" text="You do not have a hostel room. Contact the hostel office to apply." />
      </Card>
    );
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title={data.hostel.name}>
        <DetailList
          items={[
            { label: "Room", value: data.room },
            { label: "Bed", value: data.bed },
            { label: "Mess plan", value: data.mess },
            { label: "Check-in", value: formatDate(data.checkIn) },
            { label: "Warden", value: data.hostel.warden },
            { label: "Warden phone", value: data.hostel.wardenPhone },
          ]}
        />
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          Hostel fee <Badge tone={FEE_TONE[data.feeStatus]}>{data.feeStatus}</Badge>
        </p>
        <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Roommates</h3>
        {data.roommates.length ? (
          <ul className="divide-y rounded-lg border">
            {data.roommates.map((m) => (
              <li key={m.id} className="px-3 py-2 text-sm text-slate-700">{m.name} <span className="text-xs text-slate-400">· {m.program}</span></li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No roommates yet.</p>
        )}
      </Card>

      <div className="space-y-6">
        <Card title="Facilities">
          <ul className="flex flex-wrap gap-2">
            {HOSTEL_FACILITIES.map((f) => <li key={f}><Badge tone="brand">{f}</Badge></li>)}
          </ul>
        </Card>
        <Card title="Hostel rules">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            {HOSTEL_RULES.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}
