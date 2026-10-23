import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { MOCK } from "../../../api/demo";
import { Search, Users } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Badge from "../../../components/common/Badge";
import Modal from "../../../components/common/Modal";
import EmptyState from "../../../components/common/EmptyState";
import FilterSelect from "../../../components/common/FilterSelect";
import { SCHOOLS, getSchoolName } from "../../../config/schools";
import { hasFullAccess } from "../../../config/permissions";
import LoadError from "../../../components/common/LoadError";
import { PageSkeleton } from "../../../components/common/Skeleton";
import { useCourses } from "../lmsQueries";
import CourseDetails from "../components/CourseDetails";

const PAGE = 12;

function CourseCard({ course, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(course)}
      className="flex h-full flex-col rounded-xl bg-white p-5 text-left shadow-sm outline-none transition hover:shadow-md focus-visible:ring-4 focus-visible:ring-brand-100"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="font-mono text-xs text-slate-400">{course.code}</span>
        <div className="flex gap-1">
          {course.teaching && <Badge tone="green">Teaching</Badge>}
          <Badge tone={course.type === "Lab" ? "amber" : "brand"}>{course.type}</Badge>
        </div>
      </div>
      <h2 className="text-base font-semibold leading-snug text-slate-900">{course.name}</h2>
      <p className="mt-1 text-xs text-slate-500">{course.facultyName}</p>
      <p className="mt-1 text-xs text-slate-400">{course.schoolName}</p>

      <div className="mt-auto pt-4">
        {course.progress !== null ? (
          <>
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Your progress</span><span className="font-medium text-slate-700">{course.progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${course.progress}%` }} />
            </div>
          </>
        ) : (
          <p className="flex items-center gap-1 text-xs text-slate-500"><Users size={12} /> {course.enrolled} students · {course.credits} credits</p>
        )}
      </div>
    </button>
  );
}

export default function CoursesPage() {
  const user = useSelector((s) => s.auth.user);
  const fullAccess = hasFullAccess(user.role);

  const [school, setSchool] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState(null);
  const navigate = useNavigate();
  // with the backend a course opens on its own page (materials, assignments, quizzes); demo mode keeps the pop-up
  const openCourse = (c) => (MOCK ? setOpen(c) : navigate(`/lms/${c.code}`));

  const courseQuery = useCourses(user, school);
  const courses = courseQuery.data?.courses;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (courses ?? []).filter((c) => !q || `${c.name} ${c.code} ${c.facultyName}`.toLowerCase().includes(q));
  }, [courses, query]);

  if (courseQuery.isLoading) return <PageSkeleton />;
  if (courseQuery.isError) return <LoadError error={courseQuery.error} onRetry={courseQuery.refetch} />;

  return (
    <div>
      <PageHeader
        title="Courses (LMS)"
        subtitle={fullAccess ? "Every course in every school." : `Courses of ${getSchoolName(user.school)}, Semester 3.`}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <span className="sr-only">Search courses</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
            placeholder="Search courses"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>
        {fullAccess && (
          <FilterSelect
            label="School"
            value={school}
            onChange={(v) => { setSchool(v); setLimit(PAGE); }}
            options={[{ value: "", label: "All schools" }, ...SCHOOLS.map((s) => ({ value: s.code, label: s.name }))]}
          />
        )}
        <span className="text-sm text-slate-400">{filtered.length} courses</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No courses found" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, limit).map((c) => (
            <CourseCard key={c.code} course={c} onOpen={openCourse} />
          ))}
        </div>
      )}

      {filtered.length > limit && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setLimit((n) => n + PAGE)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Show more courses
          </button>
        </div>
      )}

      <Modal open={Boolean(open)} onClose={() => setOpen(null)} title={open?.name || ""} size="lg">
        {open && <CourseDetails course={open} />}
      </Modal>
    </div>
  );
}
