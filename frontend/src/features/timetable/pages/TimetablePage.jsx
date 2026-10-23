import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Tabs from "../../../components/common/Tabs";
import FilterSelect from "../../../components/common/FilterSelect";
import { SCHOOLS, getSchoolName } from "../../../config/schools";
import { ROLES } from "../../../config/roles";
import { hasFullAccess } from "../../../config/permissions";
import { SEMESTER, BATCH } from "../../../utils/demoData";
import LoadError from "../../../components/common/LoadError";
import { PageSkeleton } from "../../../components/common/Skeleton";
import { onlyMyClasses } from "../timetableApi";
import { useTimetable } from "../timetableQueries";
import TimetableGrid from "../components/TimetableGrid";

export default function TimetablePage() {
  const user = useSelector((s) => s.auth.user);
  const [requested, setRequested] = useState("ENG");
  const [view, setView] = useState("mine"); // faculty can switch to the whole school

  const timetable = useTimetable(user, requested);
  const isFaculty = user.role === ROLES.FACULTY;
  const grid = useMemo(() => {
    if (!timetable.data) return null;
    return isFaculty && view === "mine" ? onlyMyClasses(timetable.data.grid, user, timetable.data.myFacultyId) : timetable.data.grid;
  }, [timetable.data, isFaculty, view, user]);

  if (timetable.isLoading) return <PageSkeleton />;
  if (timetable.isError) return <LoadError error={timetable.error} onRetry={timetable.refetch} />;

  return (
    <div>
      <PageHeader
        title="Timetable"
        subtitle={`${getSchoolName(timetable.data.school)} · Semester ${SEMESTER} · Batch ${BATCH}`}
        action={
          hasFullAccess(user.role) && (
            <FilterSelect
              label="School"
              value={requested}
              onChange={setRequested}
              options={SCHOOLS.map((s) => ({ value: s.code, label: s.name }))}
            />
          )
        }
      />

      {isFaculty && (
        <Tabs
          tabs={[{ id: "mine", label: "My classes" }, { id: "school", label: "Whole school" }]}
          value={view}
          onChange={setView}
          label="Timetable view"
        />
      )}

      <Card>
        <TimetableGrid grid={grid} />
        <p className="mt-4 text-xs text-slate-400">
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-brand-100 align-middle" /> Theory
          <span className="ml-4 mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-100 align-middle" /> Lab / practical
        </p>
      </Card>
    </div>
  );
}
