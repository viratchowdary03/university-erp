import { DAYS, PERIODS } from "../../../utils/demoData";

// Monday = 0 ... Sunday = 6
const todayIndex = (new Date().getDay() + 6) % 7;
const LUNCH_AFTER = 3; // lunch break comes after the fourth period

function Cell({ slot }) {
  if (!slot) return <span className="text-slate-300">Free</span>;
  const lab = slot.type === "Lab";
  return (
    <div className={`rounded-lg p-2 ${lab ? "bg-amber-50" : "bg-brand-50"}`}>
      <p className={`text-xs font-semibold leading-snug ${lab ? "text-amber-800" : "text-brand-800"}`}>{slot.subjectName}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{slot.facultyName}</p>
      <p className="text-[11px] text-slate-400">Room {slot.room}</p>
    </div>
  );
}

// grid[day][period] is a slot or null
export default function TimetableGrid({ grid }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-separate border-spacing-1 text-left text-sm">
        <caption className="sr-only">Weekly timetable</caption>
        <thead>
          <tr>
            <th scope="col" className="w-24 px-2 py-2 text-xs font-medium uppercase text-slate-400">Day</th>
            {PERIODS.flatMap((period, p) => {
              const head = (
                <th key={period} scope="col" className="px-2 py-2 text-xs font-medium text-slate-500">{period}</th>
              );
              return p === LUNCH_AFTER
                ? [head, <th key="lunch" scope="col" className="w-10 px-1 py-2 text-center text-[10px] font-medium uppercase text-slate-400">Lunch</th>]
                : [head];
            })}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day, d) => (
            <tr key={day}>
              <th scope="row" className={`rounded-lg px-2 py-2 text-sm font-semibold ${d === todayIndex ? "bg-brand-600 text-white" : "text-slate-700"}`}>
                {day}
              </th>
              {PERIODS.flatMap((period, p) => {
                const cell = (
                  <td key={period} className="align-top">
                    <Cell slot={grid[d][p]} />
                  </td>
                );
                return p === LUNCH_AFTER
                  ? [cell, <td key="lunch" className="rounded bg-slate-100" aria-hidden="true" />]
                  : [cell];
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
