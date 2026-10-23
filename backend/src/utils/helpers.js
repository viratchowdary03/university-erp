import { TIMEZONE, PASS_MARK } from "./constants.js";

export const pad = (n, width = 3) => String(n).padStart(width, "0");

// With no classes held yet there is nothing to fall short of, so it counts as 100%
export const percent = (attended, held) => (held ? Math.round((attended / held) * 100) : 100);

// Today's date as YYYY-MM-DD in the university's time zone (attendance is one record per day)
export const todayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });

// Classes a student must attend in a row to get back to the minimum
export function classesToRecover(attended, held, target = PASS_MARK) {
  const t = target / 100;
  if (held === 0 || attended / held >= t) return 0;
  return Math.ceil((t * held - attended) / (1 - t));
}
