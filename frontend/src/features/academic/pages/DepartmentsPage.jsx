import { useState } from "react";
import { useSelector } from "react-redux";
import PageHeader from "../../../components/common/PageHeader";
import Tabs from "../../../components/common/Tabs";
import LoadError from "../../../components/common/LoadError";
import { PageSkeleton } from "../../../components/common/Skeleton";
import { useAcademic } from "../academicQueries";
import { MOCK } from "../../../api/demo";
import { PERM, canManage } from "../../../config/permissions";
import SchoolsTab from "../components/SchoolsTab";
import ProgramsTab from "../components/ProgramsTab";
import SubjectsTab from "../components/SubjectsTab";

const TABS = [
  { id: "schools", label: "Schools" },
  { id: "programs", label: "Programs" },
  { id: "subjects", label: "Subjects" },
];

// Academic Setup: schools, their programs and the subjects taught (Semester 3 sample data)
export default function DepartmentsPage() {
  const user = useSelector((s) => s.auth.user);
  const [tab, setTab] = useState("schools");
  const academic = useAcademic(user);

  if (academic.isLoading) return <PageSkeleton />;
  if (academic.isError) return <LoadError error={academic.error} onRetry={academic.refetch} />;

  const { schools, programs, subjects } = academic.data;
  // adding and changing needs the backend, so demo mode stays read-only
  const manage = !MOCK && canManage(user.role, PERM.ACADEMIC);

  return (
    <div>
      <PageHeader
        title="Academic setup"
        subtitle={`${schools.length} schools, ${programs.length} programs and ${subjects.length} subjects.`}
      />
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Academic setup sections" />
      {tab === "schools" && <SchoolsTab schools={schools} />}
      {tab === "programs" && <ProgramsTab programs={programs} schools={schools} manage={manage} />}
      {tab === "subjects" && <SubjectsTab subjects={subjects} schools={schools} manage={manage} />}
    </div>
  );
}
