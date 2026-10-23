import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";

import { SCHOOLS, getSchool, getSchoolName } from "../../../config/schools";
import { requiredText, emailRule, phoneRule, pastDate, choice } from "../../../utils/validators";
import InputField from "../../../components/common/InputField";
import Select from "../../../components/common/Select";
import Button from "../../../components/common/Button";

const schema = z.object({
  name: requiredText("Full name"),
  email: emailRule,
  phone: phoneRule,
  gender: z.enum(["M", "F"], { message: "Select gender" }),
  dateOfBirth: pastDate("Date of birth"),
  school: choice("school"),
  program: choice("program"),
  section: z.enum(["A", "B"], { message: "Select section" }),
  city: requiredText("City"),
  guardianName: requiredText("Guardian name"),
  guardianPhone: phoneRule,
});

const EMPTY = {
  name: "", email: "", phone: "", gender: "", dateOfBirth: "", school: "", program: "",
  section: "A", city: "", guardianName: "", guardianPhone: "",
};

// `student` is given when editing. The school cannot change after a student is created.
export default function StudentForm({ student, defaultSchool = "", onSubmit, onCancel, saving, error }) {
  const editing = Boolean(student);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: student ? { ...EMPTY, ...student } : { ...EMPTY, school: defaultSchool },
  });

  const school = watch("school");
  const programs = getSchool(school)?.programs || [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <InputField label="Full name" error={errors.name?.message} {...register("name")} />
        <InputField label="Email" type="email" error={errors.email?.message} {...register("email")} />
        <InputField label="Phone" type="tel" error={errors.phone?.message} {...register("phone")} />
        <Select label="Gender" error={errors.gender?.message} {...register("gender")}>
          <option value="">Select</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
        </Select>
        <InputField label="Date of birth" type="date" max={new Date().toISOString().slice(0, 10)}
          error={errors.dateOfBirth?.message} {...register("dateOfBirth")} />
        <InputField label="City" error={errors.city?.message} {...register("city")} />

        {editing ? (
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">School</p>
            <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">{getSchoolName(student.school)}</p>
          </div>
        ) : (
          <Select label="School" error={errors.school?.message}
            {...register("school", { onChange: () => setValue("program", "") })}>
            <option value="">Select a school</option>
            {SCHOOLS.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </Select>
        )}
        <Select label="Program" disabled={!school} error={errors.program?.message} {...register("program")}>
          <option value="">{school ? "Select a program" : "Select a school first"}</option>
          {programs.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Select label="Section" error={errors.section?.message} {...register("section")}>
          <option value="A">A</option>
          <option value="B">B</option>
        </Select>
        <span />
        <InputField label="Guardian name" error={errors.guardianName?.message} {...register("guardianName")} />
        <InputField label="Guardian phone" type="tel" error={errors.guardianPhone?.message} {...register("guardianPhone")} />
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>{editing ? "Save changes" : "Add student"}</Button>
      </div>
    </form>
  );
}
