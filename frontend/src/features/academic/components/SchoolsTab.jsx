import { GraduationCap, Users, BookOpen } from "lucide-react";
import Badge from "../../../components/common/Badge";

export default function SchoolsTab({ schools }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {schools.map((school) => (
        <article key={school.code} className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">{school.name}</h3>
            <Badge tone="brand">{school.code}</Badge>
          </div>
          <p className="mb-4 text-xs text-slate-500">
            Head of school: <span className="font-medium text-slate-700">{school.hod?.name || "-"}</span>
          </p>
          <ul className="mb-4 flex flex-wrap gap-1.5">
            {school.programs.map((p) => (
              <li key={p} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{p}</li>
            ))}
          </ul>
          <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs text-slate-500">
            <div><GraduationCap size={14} className="mx-auto mb-1 text-brand-600" /><dd className="text-base font-semibold text-slate-800">{school.studentCount}</dd><dt>Students</dt></div>
            <div><Users size={14} className="mx-auto mb-1 text-brand-600" /><dd className="text-base font-semibold text-slate-800">{school.facultyCount}</dd><dt>Faculty</dt></div>
            <div><BookOpen size={14} className="mx-auto mb-1 text-brand-600" /><dd className="text-base font-semibold text-slate-800">{school.subjectCount}</dd><dt>Subjects</dt></div>
          </dl>
        </article>
      ))}
    </div>
  );
}
