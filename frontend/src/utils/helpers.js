export const formatCurrency = (amount) =>
  "₹" + Number(amount || 0).toLocaleString("en-IN");

export const getErrorMessage = (err, fallback = "Something went wrong") =>
  err?.response?.data?.message || err?.message || fallback;

export const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// Colour for an attendance percentage: red below the 75% minimum
export const attendanceTone = (value) => (value < 75 ? "red" : value < 85 ? "amber" : "green");

// Which weekday's classes to show: today on Monday to Friday, otherwise the coming Monday
export function classDay(date = new Date()) {
  const index = (date.getDay() + 6) % 7; // Monday = 0
  return index < 5
    ? { index, label: "Today", isToday: true }
    : { index: 0, label: "Monday (next class day)", isToday: false };
}

export const formatMoney = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const formatDateTime = (value) =>
  new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// "2026-03-01" -> "1 Mar 2026"; empty -> "-"
export const formatIso = (iso) => (iso ? formatDate(`${iso}T00:00:00`) : "-");

export const todayIso = () => new Date().toISOString().slice(0, 10);

// "student" -> "Student", "in_progress" -> "In progress"
export const humanize = (text = "") => {
  const s = String(text).replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Links come from user-entered data: only http(s) addresses may become clickable
export const safeHref = (url) => (/^https?:\/\//i.test(url || "") ? url : undefined);
