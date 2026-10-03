import type { Day } from "./types";

export interface DayFormValues {
  date: string;
  title: string;
  note: string;
}

export type DayFormErrors = Partial<Record<keyof DayFormValues, string>>;

export function validateDayForm(v: DayFormValues): DayFormErrors {
  const e: DayFormErrors = {};
  if (!v.date) e.date = "Date is required";
  return e;
}

// Call only after validateDayForm returned no errors.
export function dayPayload(v: DayFormValues): Omit<Day, "id"> {
  return { date: v.date, title: v.title.trim() || null, note: v.note.trim() || null };
}

export function dayToForm(d: Day): DayFormValues {
  return { date: d.date, title: d.title ?? "", note: d.note ?? "" };
}

// Default date for a new day: the day after the latest existing day, else `today`.
export function defaultNewDayDate(days: { date: string }[], today: string): string {
  if (!days.length) return today;
  const last = days.reduce((m, d) => (d.date > m ? d.date : m), days[0].date);
  const [y, m, d] = last.split("-").map(Number);
  const n = new Date(y, m - 1, d + 1, 12);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}
