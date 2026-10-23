import { useState } from "react";
import { useSelector } from "react-redux";
import { Check, Info, X } from "lucide-react";

import { usePendingUsers, useApproveUser, useRejectUser } from "../settingsQueries";
import { ROLE_FIELDS } from "../../../config/roleFields";
import { ROLE_LABELS } from "../../../config/roles";
import { getSchoolName } from "../../../config/schools";
import { FULL_ACCESS_ROLES } from "../../../config/permissions";
import { getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import Badge from "../../../components/common/Badge";
import EmptyState from "../../../components/common/EmptyState";
import DetailList from "../../../components/common/DetailList";
import LoadError from "../../../components/common/LoadError";
import { TableSkeleton } from "../../../components/common/Skeleton";

// The answers the person gave for their role, in the order of the registration form
function detailsFor(request) {
  const fields = ROLE_FIELDS[request.role] || [];
  const items = fields.map((f) => {
    const raw = request[f.name] ?? request.profile?.[f.name];
    return { label: f.label, value: f.kind === "school" ? getSchoolName(raw) : raw };
  });
  return [{ label: "Phone", value: request.phone }, ...items];
}

export default function UserApprovalsPage() {
  const user = useSelector((s) => s.auth.user);
  const toast = useToast();
  const confirm = useConfirm();

  const pending = usePendingUsers(user);
  const approve = useApproveUser();
  const reject = useRejectUser();
  const [busyId, setBusyId] = useState(null);

  const run = async (request, mutation, successMessage) => {
    setBusyId(request.id);
    try {
      await mutation.mutateAsync(request.id);
      toast.success(successMessage);
    } catch (err) {
      toast.error(getErrorMessage(err, "That did not work. Please try again"));
    } finally {
      setBusyId(null);
    }
  };

  const onApprove = async (request) => {
    const privileged = FULL_ACCESS_ROLES.includes(request.role);
    if (privileged) {
      const ok = await confirm({
        title: `Give ${request.name} full access?`,
        message: `As ${ROLE_LABELS[request.role]}, ${request.name} will be able to open every module for every school.`,
        confirmLabel: "Approve",
      });
      if (!ok) return;
    }
    run(request, approve, `${request.name} was approved as ${ROLE_LABELS[request.role]}`);
  };

  const onReject = async (request) => {
    const ok = await confirm({
      title: `Reject ${request.name}?`,
      message: `${request.name} will not be able to sign in. They will need to register again.`,
      confirmLabel: "Reject request",
      tone: "danger",
    });
    if (ok) run(request, reject, `${request.name}'s request was rejected`);
  };

  return (
    <div>
      <PageHeader
        title="User approvals"
        subtitle="Everyone who registers waits here. Check their details, then approve or reject the request."
      />

      {user.role !== "super_admin" && (
        <p className="mb-5 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>
            Requests for Super Admin, Registrar and Administrator roles are not shown here. Only a Super Admin can decide on them.
          </span>
        </p>
      )}

      {pending.isLoading && <Card><TableSkeleton rows={3} /></Card>}
      {pending.isError && <LoadError error={pending.error} onRetry={pending.refetch} />}
      {pending.isSuccess && pending.data.length === 0 && (
        <Card><EmptyState title="No requests are waiting" text="New registrations will appear here." /></Card>
      )}

      <div className="space-y-4">
        {pending.data?.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">{r.name}</h2>
                  <Badge tone="brand">{ROLE_LABELS[r.role] || r.role}</Badge>
                </div>
                <p className="text-sm text-slate-500">{r.email}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={busyId === r.id} onClick={() => onReject(r)}>
                  <X size={16} /> Reject
                </Button>
                <Button disabled={busyId === r.id} onClick={() => onApprove(r)}>
                  <Check size={16} /> Approve
                </Button>
              </div>
            </div>
            <div className="mt-4 border-t pt-4">
              <DetailList columns={3} items={detailsFor(r)} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
