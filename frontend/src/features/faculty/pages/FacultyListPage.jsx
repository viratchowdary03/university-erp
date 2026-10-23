import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Pencil, Plus, Trash2 } from "lucide-react";

import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import DataTable from "../../../components/common/DataTable";
import FilterSelect from "../../../components/common/FilterSelect";
import Badge from "../../../components/common/Badge";
import Modal from "../../../components/common/Modal";
import DetailList from "../../../components/common/DetailList";
import LoadError from "../../../components/common/LoadError";
import { TableSkeleton } from "../../../components/common/Skeleton";
import { SCHOOLS, getSchoolName } from "../../../config/schools";
import { PERM, canManage, hasFullAccess } from "../../../config/permissions";
import { getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";
import { useAcademic } from "../../academic/academicQueries";
import { useFaculty, useCreateFaculty, useUpdateFaculty, useDeleteFaculty } from "../facultyQueries";
import FacultyForm from "../components/FacultyForm";

export default function FacultyListPage() {
  const user = useSelector((s) => s.auth.user);
  const fullAccess = hasFullAccess(user.role);
  const manage = canManage(user.role, PERM.FACULTY);
  const toast = useToast();
  const confirm = useConfirm();

  const faculty = useFaculty(user);
  const academic = useAcademic(user, { enabled: manage }); // only the people who can edit need the subject list
  const create = useCreateFaculty(user);
  const update = useUpdateFaculty(user);
  const remove = useDeleteFaculty(user);

  const [school, setSchool] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | a faculty member
  const [formError, setFormError] = useState(null);

  const rows = useMemo(() => (faculty.data ?? []).filter((f) => !school || f.school === school), [faculty.data, school]);
  const selected = (faculty.data ?? []).find((f) => f.id === selectedId) || null;

  const closeForm = () => {
    setEditing(null);
    setFormError(null);
  };

  const save = async (values) => {
    setFormError(null);
    try {
      if (editing === "new") {
        await create.mutateAsync(values);
        toast.success(`${values.name} was added`);
      } else {
        await update.mutateAsync({ id: editing.id, values });
        toast.success(`${values.name} was updated`);
      }
      closeForm();
    } catch (err) {
      setFormError(getErrorMessage(err, "Could not save the faculty member"));
    }
  };

  const destroy = async (person) => {
    const ok = await confirm({
      title: `Delete ${person.name}?`,
      message: "Their subjects will have no teacher until someone else is assigned. This cannot be undone.",
      confirmLabel: "Delete faculty member",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(person.id);
      setSelectedId(null);
      toast.success(`${person.name} was deleted`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete the faculty member"));
    }
  };

  const columns = [
    { key: "employeeId", header: "Employee ID", render: (r) => <span className="font-mono text-xs text-slate-500">{r.employeeId}</span> },
    {
      key: "name",
      header: "Name",
      render: (r) => (
        <div className="flex items-center gap-2">
          <div>
            <p className="font-medium text-slate-800">{r.name}</p>
            <p className="text-xs text-slate-400">{r.email}</p>
          </div>
          {r.isHod && <Badge tone="amber">Head of school</Badge>}
        </div>
      ),
    },
    { key: "designation", header: "Designation" },
    ...(fullAccess ? [{ key: "school", header: "School", render: (r) => getSchoolName(r.school) }] : []),
    { key: "qualification", header: "Qualification" },
    { key: "subjects", header: "Subjects", render: (r) => r.subjects.length },
  ];

  return (
    <div>
      <PageHeader
        title="Faculty"
        subtitle={fullAccess ? "All teaching staff across the schools." : `Teaching staff of ${getSchoolName(user.school)}.`}
        action={manage && <Button onClick={() => setEditing("new")}><Plus size={16} /> Add faculty</Button>}
      />

      <Card>
        {faculty.isLoading && <TableSkeleton />}
        {faculty.isError && <LoadError error={faculty.error} onRetry={faculty.refetch} />}
        {faculty.isSuccess && (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            getSearchText={(r) => `${r.name} ${r.employeeId} ${r.email} ${r.designation}`}
            searchPlaceholder="Search by name or ID"
            onRowClick={(r) => setSelectedId(r.id)}
            filters={
              fullAccess && (
                <FilterSelect
                  label="School"
                  value={school}
                  onChange={setSchool}
                  options={[{ value: "", label: "All schools" }, ...SCHOOLS.map((s) => ({ value: s.code, label: s.name }))]}
                />
              )
            }
          />
        )}
      </Card>

      <Modal open={Boolean(selected) && !editing} onClose={() => setSelectedId(null)} title={selected?.name || ""}>
        {selected && (
          <>
            <DetailList
              items={[
                { label: "Employee ID", value: selected.employeeId },
                { label: "Designation", value: selected.designation },
                { label: "School", value: getSchoolName(selected.school) },
                { label: "Department", value: selected.department },
                { label: "Qualification", value: selected.qualification },
                { label: "Experience", value: `${selected.experienceYears} years` },
                { label: "Email", value: selected.email },
                { label: "Phone", value: selected.phone },
              ]}
            />
            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Subjects taught</h3>
            {selected.subjects.length === 0 ? (
              <p className="text-sm text-slate-500">No subjects assigned yet.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {selected.subjects.map((s) => (
                  <li key={s.code} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-slate-700">{s.name}</span>
                    <span className="font-mono text-xs text-slate-400">{s.code}</span>
                  </li>
                ))}
              </ul>
            )}
            {manage && (
              <div className="mt-6 flex justify-end gap-2 border-t pt-4">
                <Button variant="danger" onClick={() => destroy(selected)}><Trash2 size={16} /> Delete</Button>
                <Button onClick={() => setEditing(selected)}><Pencil size={16} /> Edit</Button>
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal open={Boolean(editing)} onClose={closeForm} title={editing === "new" ? "Add faculty member" : "Edit faculty member"} size="lg">
        {editing && (
          <FacultyForm
            person={editing === "new" ? null : editing}
            subjects={academic.data?.subjects ?? []}
            onSubmit={save}
            onCancel={closeForm}
            saving={create.isPending || update.isPending}
            error={formError}
          />
        )}
      </Modal>
    </div>
  );
}
