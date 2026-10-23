import { useState } from "react";
import { useSelector } from "react-redux";
import { CheckCircle2 } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import Badge from "../../../components/common/Badge";
import EmptyState from "../../../components/common/EmptyState";
import LoadError from "../../../components/common/LoadError";
import { PageSkeleton, TableSkeleton } from "../../../components/common/Skeleton";
import { formatDate, getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";
import { useMarkOverview, useMarkingSession, useMarkAttendance } from "../attendanceQueries";

export default function MarkAttendancePage() {
  const user = useSelector((s) => s.auth.user);
  const toast = useToast();
  const confirm = useConfirm();

  const overview = useMarkOverview(user);
  const subjects = overview.data?.subjects ?? [];

  const [chosen, setChosen] = useState("");
  const code = chosen || subjects[0]?.code || "";
  const session = useMarkingSession(user, code);
  const save = useMarkAttendance(user);

  // Everyone starts as present. Only the absent students are tracked.
  const [absent, setAbsent] = useState(() => new Set());

  if (overview.isLoading) return <PageSkeleton />;
  if (overview.isError) return <LoadError error={overview.error} onRetry={overview.refetch} />;

  if (subjects.length === 0) {
    return (
      <div>
        <PageHeader title="Mark attendance" />
        <Card><EmptyState title="No subjects assigned" text="Ask your head of school to assign subjects to you." /></Card>
      </div>
    );
  }

  const roster = session.data?.roster ?? [];
  const marked = session.data?.marked ?? false;
  const presentIds = roster.filter((s) => !absent.has(s.id)).map((s) => s.id);
  const subject = subjects.find((s) => s.code === code);

  const chooseSubject = (next) => {
    setChosen(next);
    setAbsent(new Set());
  };

  const setStatus = (id, isPresent) =>
    setAbsent((current) => {
      const next = new Set(current);
      if (isPresent) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    const ok = await confirm({
      title: "Save attendance?",
      message: `${subject.name}: ${presentIds.length} present, ${roster.length - presentIds.length} absent. Attendance can only be saved once a day, so it cannot be changed after this.`,
      confirmLabel: "Save attendance",
    });
    if (!ok) return;
    try {
      await save.mutateAsync({ code, presentIds });
      toast.success(`Attendance saved for ${subject.name}: ${presentIds.length} present, ${roster.length - presentIds.length} absent`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not save attendance"));
    }
  };

  return (
    <div>
      <PageHeader title="Mark attendance" subtitle={`Today, ${formatDate(new Date())}`} />

      <Card className="mb-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-slate-700">Subject</label>
            <select
              id="subject"
              value={code}
              onChange={(e) => chooseSubject(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            >
              {subjects.map((s) => (
                <option key={s.code} value={s.code}>{s.code} · {s.name}</option>
              ))}
            </select>
          </div>
          {!marked && roster.length > 0 && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setAbsent(new Set())}>All present</Button>
              <Button variant="secondary" onClick={() => setAbsent(new Set(roster.map((s) => s.id)))}>All absent</Button>
            </div>
          )}
        </div>

        {session.isLoading && <TableSkeleton rows={4} />}
        {session.isError && <LoadError error={session.error} onRetry={session.refetch} />}

        {marked && (
          <div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>Attendance for this subject is already saved for today.</span>
          </div>
        )}

        {session.isSuccess && (
          <ul className="divide-y rounded-lg border">
            {roster.map((st) => {
              const isPresent = !absent.has(st.id);
              return (
                <li key={st.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{st.name}</p>
                    <p className="font-mono text-xs text-slate-400">{st.enrollmentNo} · Sec. {st.section}</p>
                  </div>
                  <div role="group" aria-label={`Attendance for ${st.name}`} className="flex shrink-0 overflow-hidden rounded-lg border border-slate-300 text-sm">
                    <button
                      type="button"
                      disabled={marked}
                      aria-pressed={isPresent}
                      onClick={() => setStatus(st.id, true)}
                      className={`px-3 py-1.5 font-medium ${isPresent ? "bg-emerald-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"} disabled:opacity-60`}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      disabled={marked}
                      aria-pressed={!isPresent}
                      onClick={() => setStatus(st.id, false)}
                      className={`border-l border-slate-300 px-3 py-1.5 font-medium ${!isPresent ? "bg-red-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"} disabled:opacity-60`}
                    >
                      Absent
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {session.isSuccess && !marked && (
          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm text-slate-500">{presentIds.length} present, {roster.length - presentIds.length} absent</p>
            <Button onClick={submit} loading={save.isPending}>Save attendance</Button>
          </div>
        )}
      </Card>

      <Card title="Class average for your subjects">
        <ul className="space-y-3">
          {overview.data.averages.map((r) => (
            <li key={r.code} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-700">{r.name}</span>
              <Badge tone={r.average < 75 ? "red" : r.average < 85 ? "amber" : "green"}>{r.average}%</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
