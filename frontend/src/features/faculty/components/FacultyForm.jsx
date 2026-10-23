import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";

import { SCHOOLS, getSchool, getSchoolName } from "../../../config/schools";
import { FACULTY_DESIGNATIONS } from "../../../config/roleFields";
import { requiredText, emailRule, phoneRule, choice } from "../../../utils/validators";
import InputField from "../../../components/common/InputField";
import Select from "../../../components/common/Select";
import Button from "../../../components/common/Button";

const schema = z.object({
  name: requiredText("Full name"),
  email: emailRule,
  phone: phoneRule,
  gender: z.enum(["M", "F"], { message: "Select gender" }),
  school: choice("school"),
  department: choice("program"),
  designation: choice("designation"),
  qualification: requiredText("Qualification"),
  experienceYears: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number({ invalid_type_error: "Enter the years of experience", required_error: "Enter the years of experience" })
      .int("Use whole years").min(0, "Cannot be negative").max(60, "That looks too high")
  ),
  subjectCodes: z.array(z.string()),
});

const EMPTY = {
  name: "", email: "", phone: "", gender: "", school: "", department: "", designation: "",
  qualification: "", experienceYears: "", subjectCodes: [],
};

// `person` is given when editing. `subjects` is every subject (with the current teacher's name).
export default function FacultyForm({ person, subjects, onSubmit, onCancel, saving, error }) {
  const editing = Boolean(person);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: person
      ? { ...EMPTY, ...person, subjectCodes: person.subjects.map((s) => s.code) }
      : EMPTY,
  });

  const school = watch("school");
  const programs = getSchool(school)?.programs || [];
  const schoolSubjects = subjects.filter((s) => s.school === school);

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

        {editing ? (
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">School</p>
            <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">{getSchoolName(person.school)}</p>
          </div>
        ) : (
          <Select label="School" error={errors.school?.message}
            {...register("school", { onChange: () => { setValue("department", ""); setValue("subjectCodes", []); } })}>
            <option value="">Select a school</option>
            {SCHOOLS.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </Select>
        )}
        <Select label="Program / department" disabled={!school} error={errors.department?.message} {...register("department")}>
          <option value="">{school ? "Select a program" : "Select a school first"}</option>
          {programs.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Select label="Designation" error={errors.designation?.message} {...register("designation")}>
          <option value="">Select</option>
          {FACULTY_DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
        <InputField label="Qualification" placeholder="e.g. Ph.D., M.Tech" error={errors.qualification?.message} {...register("qualification")} />
        <InputField label="Years of experience" type="number" min={0} max={60} error={errors.experienceYears?.message} {...register("experienceYears")} />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Subjects taught</legend>
        {schoolSubjects.length === 0 ? (
          <p className="text-sm text-slate-400">Select a school to see its subjects.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {schoolSubjects.map((s) => (
              <li key={s.code}>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                  <input type="checkbox" value={s.code} className="mt-1 accent-brand-600" {...register("subjectCodes")} />
                  <span>
                    <span className="block text-slate-800">{s.name}</span>
                    <span className="block text-xs text-slate-400">
                      {s.code} · {s.facultyName && s.facultyId !== person?.id ? `now taught by ${s.facultyName}` : s.facultyName ? "taught by this person" : "no teacher yet"}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-400">Ticking a subject that another teacher takes moves it to this person.</p>
      </fieldset>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>{editing ? "Save changes" : "Add faculty member"}</Button>
      </div>
    </form>
  );
}
