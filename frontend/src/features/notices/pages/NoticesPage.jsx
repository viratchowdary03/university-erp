import { useState } from "react";
import { useSelector } from "react-redux";
import { Megaphone, Pencil, Pin, Plus, Trash2 } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import FormModal from "../../../components/common/FormModal";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { PERM, canManage, hasFullAccess } from "../../../config/permissions";
import { ROLES, ROLE_LABELS } from "../../../config/roles";
import { SCHOOLS, getSchoolName } from "../../../config/schools";
import { formatDate, formatIso, getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";

const PRIORITY = { normal: ["slate", "Notice"], important: ["amber", "Important"], urgent: ["red", "Urgent"] };

export default function NoticesPage() {
  const user = useSelector((s) => s.auth.user);
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const canPost = canManage(user.role, PERM.NOTICES);
  const full = hasFullAccess(user.role);
  const [editing, setEditing] = useState(null);
  const query = useData(["notices"], "/notices");

  const remove = async (n) => {
    if (!(await confirm({ title: "Delete this notice?", message: n.title, tone: "danger" }))) return;
    send.mutateAsync({ method: "delete", url: `/notices/${n.id}` }).then(() => toast.success("Notice deleted")).catch((e) => toast.error(getErrorMessage(e)));
  };

  // staff of a school write to students and colleagues of their own school
  const audienceRoles = full ? Object.values(ROLES) : [ROLES.STUDENT, ROLES.FACULTY, ROLES.HOD];

  return (
    <>
      <PageHeader title="Notices" subtitle="Announcements for you" action={canPost && <Button onClick={() => setEditing("new")}><Plus size={16} /> Post a notice</Button>} />
      <QueryState query={query}>
        {(items) => items.length === 0 ? (
          <Card><EmptyState icon={Megaphone} title="No notices right now" /></Card>
        ) : (
          <div className="space-y-4">
            {items.map((n) => (
              <Card key={n.id} className={n.expired ? "opacity-60" : ""}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      {n.pinned && <Pin size={14} className="text-brand-600" aria-label="Pinned" />}
                      <h2 className="font-semibold text-slate-900">{n.title}</h2>
                      <Badge tone={PRIORITY[n.priority][0]}>{PRIORITY[n.priority][1]}</Badge>
                      {n.expired && <Badge>Expired</Badge>}
                    </div>
                    <p className="whitespace-pre-line text-sm text-slate-600">{n.body}</p>
                    <p className="mt-3 text-xs text-slate-400">
                      {n.authorName} ({ROLE_LABELS[n.authorRole]}) - {formatDate(n.createdAt)}
                      {n.school ? ` - ${getSchoolName(n.school)}` : ""}
                      {n.audience.length ? ` - for ${n.audience.map((r) => ROLE_LABELS[r]).join(", ")}` : ""}
                      {n.expiresAt ? ` - until ${formatIso(n.expiresAt)}` : ""}
                    </p>
                  </div>
                  {n.editable && (
                    <div className="flex gap-1">
                      <button type="button" aria-label="Edit notice" onClick={() => setEditing(n)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button>
                      <button type="button" aria-label="Delete notice" onClick={() => remove(n)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryState>

      <FormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Post a notice" : "Edit notice"}
        size="lg"
        initial={editing && editing !== "new" ? editing : { priority: "normal", audience: [], pinned: false }}
        submitLabel={editing === "new" ? "Post" : "Save changes"}
        fields={[
          { name: "title", label: "Title", required: true, span: 2 },
          { name: "body", label: "Message", type: "textarea", required: true, rows: 5 },
          { name: "audience", label: "Who should see it (leave empty for everyone)", type: "checkboxes", options: audienceRoles.map((r) => ({ value: r, label: ROLE_LABELS[r] })) },
          ...(full ? [{ name: "school", label: "School", type: "select", placeholder: "Every school", options: SCHOOLS.map((s) => ({ value: s.code, label: s.name })) }] : []),
          { name: "priority", label: "Priority", type: "select", options: [{ value: "normal", label: "Normal" }, { value: "important", label: "Important (notifies people)" }, { value: "urgent", label: "Urgent (notifies people)" }] },
          { name: "expiresAt", label: "Hide after (optional)", type: "date" },
          { name: "pinned", label: "Pin to the top", type: "checkbox" },
        ]}
        onSubmit={async (v) => {
          if (editing === "new") await send.mutateAsync({ method: "post", url: "/notices", body: v });
          else await send.mutateAsync({ method: "put", url: `/notices/${editing.id}`, body: v });
          toast.success("Notice saved");
          setEditing(null);
        }}
      />
    </>
  );
}
