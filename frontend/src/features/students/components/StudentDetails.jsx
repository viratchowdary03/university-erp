import Badge from "../../../components/common/Badge";
import DetailList from "../../../components/common/DetailList";
import { getSchoolName } from "../../../config/schools";
import { attendanceTone, formatDate } from "../../../utils/helpers";

const Section = ({ title, children }) => (
  <section className="mb-5 last:mb-0">
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
    {children}
  </section>
);

export default function StudentDetails({ student, hostelName }) {
  return (
    <div>
      <Section title="Academic">
        <DetailList
          items={[
            { label: "Enrollment number", value: student.enrollmentNo },
            { label: "School", value: getSchoolName(student.school) },
            { label: "Program", value: student.program },
            { label: "Semester / section", value: `Semester ${student.semester} / ${student.section}` },
            { label: "Batch", value: student.batch },
            { label: "CGPA", value: student.cgpa ?? "Not available yet" },
          ]}
        />
      </Section>

      <Section title="Contact and guardian">
        <DetailList
          items={[
            { label: "Email", value: student.email },
            { label: "Phone", value: student.phone },
            { label: "City", value: student.city },
            { label: "Date of birth", value: formatDate(student.dateOfBirth) },
            { label: "Guardian", value: student.guardianName },
            { label: "Guardian phone", value: student.guardianPhone },
          ]}
        />
      </Section>

      <Section title="Residence">
        {student.room ? (
          <DetailList
            items={[
              { label: "Hostel", value: hostelName },
              { label: "Room / bed", value: `${student.room.room} / ${student.room.bed}` },
              { label: "Mess plan", value: student.room.mess },
              { label: "Hostel fee", value: student.room.feeStatus },
            ]}
          />
        ) : (
          <p className="text-sm text-slate-600">Day scholar (lives at home)</p>
        )}
      </Section>

      <Section title="Attendance">
        <ul className="divide-y rounded-lg border">
          {student.attendanceRows.map((row) => (
            <li key={row.code} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-slate-700">{row.name}</span>
              {row.held === 0 ? <Badge>No classes yet</Badge> : <Badge tone={attendanceTone(row.percent)}>{row.percent}%</Badge>}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
