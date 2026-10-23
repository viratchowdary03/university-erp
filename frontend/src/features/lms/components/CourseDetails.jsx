import { FileText, ClipboardList } from "lucide-react";
import Badge from "../../../components/common/Badge";
import DetailList from "../../../components/common/DetailList";
import { daysFromNow } from "../../../utils/demoData";
import { formatDate } from "../../../utils/helpers";

export default function CourseDetails({ course }) {
  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">{course.description}</p>
      <DetailList
        items={[
          { label: "Course code", value: course.code },
          { label: "School", value: course.schoolName },
          { label: "Taught by", value: course.facultyName },
          { label: "Credits", value: `${course.credits} (${course.type})` },
          { label: "Students enrolled", value: course.enrolled },
          { label: "Study materials", value: `${course.materials} files` },
        ]}
      />

      <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Units</h3>
      <ol className="divide-y rounded-lg border">
        {course.units.map((u) => (
          <li key={u.no} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="text-slate-700">Unit {u.no}: {u.title}</span>
            <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400"><FileText size={12} /> {u.lessons} lessons</span>
          </li>
        ))}
      </ol>

      <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Assignments</h3>
      <ul className="divide-y rounded-lg border">
        {course.assignments.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 text-slate-700"><ClipboardList size={14} className="text-brand-600" /> {a.title}</span>
            <Badge tone="amber">Due {formatDate(a.dueDate ?? daysFromNow(a.dueInDays))} · {a.marks} marks</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
