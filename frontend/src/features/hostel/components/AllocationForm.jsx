import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";

import { choice, notFutureDate } from "../../../utils/validators";
import { getSchoolName } from "../../../config/schools";
import InputField from "../../../components/common/InputField";
import Select from "../../../components/common/Select";
import Button from "../../../components/common/Button";
import { MESS_PLANS, FEE_STATUSES } from "../hostelApi";
import { useAllocatableStudents, useSuggestedBed } from "../hostelQueries";

const schema = z.object({
  studentId: choice("student"),
  hostelId: choice("hostel"),
  room: z.string().trim().regex(/^\d{3}$/, "Enter a 3-digit room number, like 204"),
  bed: z.enum(["A", "B", "C"], { message: "Select a bed" }),
  mess: z.enum(MESS_PLANS, { message: "Select a mess plan" }),
  feeStatus: z.enum(FEE_STATUSES, { message: "Select the fee status" }),
  checkIn: notFutureDate("Check-in date"),
});

// `resident` is given when editing a room. `hostels` are the hostel cards from the overview.
export default function AllocationForm({ user, resident, hostels, onSubmit, onCancel, saving, error }) {
  const editing = Boolean(resident);
  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: resident
      ? { ...resident }
      : { studentId: "", hostelId: "", room: "", bed: "A", mess: "Veg", feeStatus: "Pending", checkIn: today },
  });

  const students = useAllocatableStudents(user, !editing);
  const studentId = watch("studentId");
  const hostelId = watch("hostelId");

  // Only hostels that match the student's gender
  const chosen = students.data?.find((s) => s.id === studentId);
  const type = editing ? hostels.find((h) => h.id === resident.hostelId)?.type : chosen && (chosen.gender === "M" ? "Boys" : "Girls");
  const options = type ? hostels.filter((h) => h.type === type) : hostels;

  // Suggest the first free bed when a hostel is picked for a new allocation
  const suggestion = useSuggestedBed(user, editing ? "" : hostelId);
  useEffect(() => {
    if (suggestion.data) {
      setValue("room", suggestion.data.room);
      setValue("bed", suggestion.data.bed);
    }
  }, [suggestion.data, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {editing ? (
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-slate-700">Student</p>
            <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
              {resident.student.name} · {resident.student.enrollmentNo}
            </p>
          </div>
        ) : (
          <div className="sm:col-span-2">
            <Select
              label="Student"
              error={errors.studentId?.message}
              {...register("studentId", { onChange: () => setValue("hostelId", "") })}
            >
              <option value="">{students.isLoading ? "Loading students..." : "Select a student without a room"}</option>
              {(students.data || []).map((s) => (
                <option key={s.id} value={s.id}>{s.name} · {s.enrollmentNo} · {getSchoolName(s.school)}</option>
              ))}
            </Select>
          </div>
        )}

        <Select label="Hostel" error={errors.hostelId?.message} disabled={!editing && !studentId} {...register("hostelId")}>
          <option value="">{!editing && !studentId ? "Select a student first" : "Select a hostel"}</option>
          {options.map((h) => (
            <option key={h.id} value={h.id}>{h.name} ({h.occupied}/{h.capacity})</option>
          ))}
        </Select>
        <InputField label="Room number" placeholder="e.g. 204" inputMode="numeric" maxLength={3}
          error={errors.room?.message} {...register("room")} />
        <Select label="Bed" error={errors.bed?.message} {...register("bed")}>
          {["A", "B", "C"].map((b) => <option key={b} value={b}>Bed {b}</option>)}
        </Select>
        <Select label="Mess plan" error={errors.mess?.message} {...register("mess")}>
          {MESS_PLANS.map((m) => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Select label="Hostel fee" error={errors.feeStatus?.message} {...register("feeStatus")}>
          {FEE_STATUSES.map((f) => <option key={f} value={f}>{f}</option>)}
        </Select>
        <InputField label="Check-in date" type="date" max={today} error={errors.checkIn?.message} {...register("checkIn")} />
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>{editing ? "Save changes" : "Allocate room"}</Button>
      </div>
    </form>
  );
}
