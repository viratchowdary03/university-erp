import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { BedDouble, Building, Pencil, Percent, Plus, LogOut } from "lucide-react";

import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import StatCard from "../../../components/common/StatCard";
import DataTable from "../../../components/common/DataTable";
import FilterSelect from "../../../components/common/FilterSelect";
import Badge from "../../../components/common/Badge";
import Modal from "../../../components/common/Modal";
import DetailList from "../../../components/common/DetailList";
import LoadError from "../../../components/common/LoadError";
import { PageSkeleton } from "../../../components/common/Skeleton";
import { getSchoolName } from "../../../config/schools";
import { PERM, canManage, hasFullAccess } from "../../../config/permissions";
import { formatDate, getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";
import {
  useHostelOverview, useMyHostel, useAllocateRoom, useUpdateAllocation, useVacateRoom,
} from "../hostelQueries";
import MyHostel from "../components/MyHostel";
import AllocationForm from "../components/AllocationForm";

const FEE_TONE = { Paid: "green", Partial: "amber", Pending: "red" };

function HostelManagement({ user }) {
  const manage = canManage(user.role, PERM.HOSTEL);
  const toast = useToast();
  const confirm = useConfirm();

  const overview = useHostelOverview(user);
  const allocate = useAllocateRoom(user);
  const update = useUpdateAllocation(user);
  const vacate = useVacateRoom(user);

  const [hostelId, setHostelId] = useState("");
  const [fee, setFee] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | a resident row
  const [formError, setFormError] = useState(null);

  const residents = overview.data?.residents ?? [];
  const rows = useMemo(
    () => residents.filter((r) => (!hostelId || r.hostelId === hostelId) && (!fee || r.feeStatus === fee)),
    [residents, hostelId, fee]
  );
  const selected = residents.find((r) => r.studentId === selectedId) || null;

  const closeForm = () => {
    setEditing(null);
    setFormError(null);
  };

  const save = async (values) => {
    setFormError(null);
    try {
      if (editing === "new") {
        await allocate.mutateAsync(values);
        toast.success("Room allocated");
      } else {
        await update.mutateAsync({ studentId: editing.studentId, values });
        toast.success("Room details updated");
      }
      closeForm();
    } catch (err) {
      setFormError(getErrorMessage(err, "Could not save the room"));
    }
  };

  const release = async (row) => {
    const ok = await confirm({
      title: `Vacate room ${row.room}?`,
      message: `${row.student.name} will no longer have a bed in ${row.hostel.name}.`,
      confirmLabel: "Vacate room",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await vacate.mutateAsync(row.studentId);
      setSelectedId(null);
      toast.success(`${row.student.name} left room ${row.room}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not vacate the room"));
    }
  };

  if (overview.isLoading) return <PageSkeleton />;
  if (overview.isError) return <LoadError error={overview.error} onRetry={overview.refetch} />;

  const { hostels } = overview.data;
  const capacity = hostels.reduce((n, h) => n + h.capacity, 0);

  const columns = [
    {
      key: "student",
      header: "Resident",
      render: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.student.name}</p>
          <p className="font-mono text-xs text-slate-400">{r.student.enrollmentNo}</p>
        </div>
      ),
    },
    { key: "school", header: "School", render: (r) => getSchoolName(r.student.school) },
    { key: "hostel", header: "Hostel", render: (r) => r.hostel.name },
    { key: "room", header: "Room / bed", render: (r) => `${r.room} / ${r.bed}` },
    { key: "mess", header: "Mess" },
    { key: "feeStatus", header: "Fee", render: (r) => <Badge tone={FEE_TONE[r.feeStatus]}>{r.feeStatus}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title="Hostel"
        subtitle="Hostels, rooms and residents."
        action={manage && <Button onClick={() => setEditing("new")}><Plus size={16} /> Allocate room</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Hostels" value={hostels.length} icon={Building} />
        <StatCard label="Residents" value={residents.length} icon={BedDouble} tone="green" />
        <StatCard label="Occupancy" value={`${Math.round((residents.length / capacity) * 100)}%`} hint={`${residents.length} of ${capacity} beds`} icon={Percent} tone="amber" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {hostels.map((h) => (
          <article key={h.id} className="rounded-xl bg-white p-5 shadow-sm">
            <Badge tone={h.type === "Boys" ? "brand" : "amber"}>{h.type}</Badge>
            <h2 className="mt-2 text-sm font-semibold text-slate-900">{h.name}</h2>
            <p className="mt-1 text-xs text-slate-500">Warden: {h.warden}</p>
            <div className="mb-1 mt-4 flex justify-between text-xs text-slate-500">
              <span>{h.occupied} / {h.capacity} beds</span><span className="font-medium text-slate-700">{h.occupancy}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(h.occupancy, 2)}%` }} />
            </div>
          </article>
        ))}
      </div>

      <Card title="Residents" className="mt-6">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.studentId}
          getSearchText={(r) => `${r.student.name} ${r.student.enrollmentNo} ${r.room} ${r.hostel.name}`}
          searchPlaceholder="Search residents"
          onRowClick={(r) => setSelectedId(r.studentId)}
          filters={
            <>
              <FilterSelect label="Hostel" value={hostelId} onChange={setHostelId}
                options={[{ value: "", label: "All hostels" }, ...hostels.map((h) => ({ value: h.id, label: h.name }))]} />
              <FilterSelect label="Fee" value={fee} onChange={setFee}
                options={[{ value: "", label: "All" }, { value: "Paid", label: "Paid" }, { value: "Partial", label: "Partial" }, { value: "Pending", label: "Pending" }]} />
            </>
          }
        />
      </Card>

      <Modal open={Boolean(selected) && !editing} onClose={() => setSelectedId(null)} title={selected?.student.name || ""}>
        {selected && (
          <>
            <DetailList
              items={[
                { label: "Enrollment number", value: selected.student.enrollmentNo },
                { label: "School", value: getSchoolName(selected.student.school) },
                { label: "Program", value: selected.student.program },
                { label: "Hostel", value: selected.hostel.name },
                { label: "Room / bed", value: `${selected.room} / ${selected.bed}` },
                { label: "Mess plan", value: selected.mess },
                { label: "Check-in", value: formatDate(selected.checkIn) },
                { label: "Hostel fee", value: selected.feeStatus },
                { label: "Student phone", value: selected.student.phone },
                { label: "Guardian (emergency)", value: selected.student.guardianName },
                { label: "Guardian phone", value: selected.student.guardianPhone },
                { label: "Warden", value: `${selected.hostel.warden}, ${selected.hostel.wardenPhone}` },
              ]}
            />
            {manage && (
              <div className="mt-6 flex justify-end gap-2 border-t pt-4">
                <Button variant="danger" onClick={() => release(selected)}><LogOut size={16} /> Vacate room</Button>
                <Button onClick={() => setEditing(selected)}><Pencil size={16} /> Edit</Button>
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal open={Boolean(editing)} onClose={closeForm} title={editing === "new" ? "Allocate a room" : "Edit room details"}>
        {editing && (
          <AllocationForm
            user={user}
            resident={editing === "new" ? null : editing}
            hostels={hostels}
            onSubmit={save}
            onCancel={closeForm}
            saving={allocate.isPending || update.isPending}
            error={formError}
          />
        )}
      </Modal>
    </div>
  );
}

function StudentHostel({ user }) {
  const mine = useMyHostel(user);
  return (
    <div>
      <PageHeader title="My hostel" subtitle="Your room and hostel information." />
      {mine.isLoading && <PageSkeleton />}
      {mine.isError && <LoadError error={mine.error} onRetry={mine.refetch} />}
      {mine.data && <MyHostel data={mine.data} />}
    </div>
  );
}

export default function HostelPage() {
  const user = useSelector((s) => s.auth.user);
  return hasFullAccess(user.role) ? <HostelManagement user={user} /> : <StudentHostel user={user} />;
}
