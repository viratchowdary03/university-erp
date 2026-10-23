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
import LoadError from "../../../components/common/LoadError";
import { TableSkeleton } from "../../../components/common/Skeleton";
import { SCHOOLS, getSchoolName } from "../../../config/schools";
import { PERM, canManage, hasFullAccess } from "../../../config/permissions";
import { attendanceTone, getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";
import {
  useStudents, useStudentDetails, useCreateStudent, useUpdateStudent, useDeleteStudent,
} from "../studentsQueries";
import StudentDetails from "../components/StudentDetails";
import StudentForm from "../components/StudentForm";

export default function StudentListPage() {
  const user = useSelector((s) => s.auth.user);
  const fullAccess = hasFullAccess(user.role);
  const manage = canManage(user.role, PERM.STUDENTS);
  const toast = useToast();
  const confirm = useConfirm();

  const students = useStudents(user);
  const create = useCreateStudent(user);
  const update = useUpdateStudent(user);
  const remove = useDeleteStudent(user);

  const [school, setSchool] = useState("");
  const [residence, setResidence] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | a student
  const [formError, setFormError] = useState(null);

  const details = useStudentDetails(user, selectedId);

  const rows = useMemo(
    () =>
      (students.data ?? []).filter(
        (s) => (!school || s.school === school) && (!residence || (residence === "hostel") === Boolean(s.hostel))
      ),
    [students.data, school, residence]
  );

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
      setFormError(getErrorMessage(err, "Could not save the student"));
    }
  };

  const destroy = async (student) => {
    const ok = await confirm({
      title: `Delete ${student.name}?`,
      message: "This removes their record, attendance and hostel room. It cannot be undone.",
      confirmLabel: "Delete student",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(student.id);
      setSelectedId(null);
      toast.success(`${student.name} was deleted`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete the student"));
    }
  };

  const columns = [
    { key: "enrollmentNo", header: "Enrollment", render: (r) => <span className="font-mono text-xs text-slate-500">{r.enrollmentNo}</span> },
    {
      key: "name",
      header: "Student",
      render: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.name}</p>
          <p className="text-xs text-slate-400">{r.email}</p>
        </div>
      ),
    },
    ...(fullAccess ? [{ key: "school", header: "School", render: (r) => getSchoolName(r.school) }] : []),
    { key: "program", header: "Program" },
    { key: "section", header: "Sec." },
    { key: "cgpa", header: "CGPA", render: (r) => r.cgpa ?? "-" },
    { key: "attendance", header: "Attendance", render: (r) => <Badge tone={attendanceTone(r.attendance)}>{r.attendance}%</Badge> },
    { key: "hostel", header: "Residence", render: (r) => (r.hostel ? <Badge tone="brand">Hostel</Badge> : <Badge>Day scholar</Badge>) },
  ];

  const student = details.data;

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={fullAccess ? "Every student in the university." : `Students of ${getSchoolName(user.school)}.`}
        action={manage && <Button onClick={() => setEditing("new")}><Plus size={16} /> Add student</Button>}
      />

      <Card>
        {students.isLoading && <TableSkeleton />}
        {students.isError && <LoadError error={students.error} onRetry={students.refetch} />}
        {students.isSuccess && (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            getSearchText={(r) => `${r.name} ${r.enrollmentNo} ${r.email} ${r.program}`}
            searchPlaceholder="Search by name, number or program"
            onRowClick={(r) => setSelectedId(r.id)}
            emptyTitle="No students match"
            emptyText="Try clearing the filters."
            filters={
              <>
                {fullAccess && (
                  <FilterSelect
                    label="School"
                    value={school}
                    onChange={setSchool}
                    options={[{ value: "", label: "All schools" }, ...SCHOOLS.map((s) => ({ value: s.code, label: s.name }))]}
                  />
                )}
                <FilterSelect
                  label="Residence"
                  value={residence}
                  onChange={setResidence}
                  options={[{ value: "", label: "All" }, { value: "hostel", label: "Hostel" }, { value: "day", label: "Day scholar" }]}
                />
              </>
            }
          />
        )}
      </Card>

      <Modal open={Boolean(selectedId) && !editing} onClose={() => setSelectedId(null)} title={student?.name || "Student"} size="lg">
        {details.isLoading && <TableSkeleton rows={4} />}
        {student && (
          <>
            <StudentDetails student={student} hostelName={student.hostel} />
            {manage && (
              <div className="mt-6 flex justify-end gap-2 border-t pt-4">
                <Button variant="danger" onClick={() => destroy(student)}><Trash2 size={16} /> Delete</Button>
                <Button onClick={() => setEditing(student)}><Pencil size={16} /> Edit</Button>
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal open={Boolean(editing)} onClose={closeForm} title={editing === "new" ? "Add student" : "Edit student"} size="lg">
        {editing && (
          <StudentForm
            student={editing === "new" ? null : editing}
            defaultSchool={fullAccess ? school : ""}
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
