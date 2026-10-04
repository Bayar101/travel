import { addDays, formatDay, nightsBetween } from "./stay-dates";
import type { Stay } from "./types";

export type StayStatus = "now" | "upcoming" | "past";

type Dates = Pick<Stay, "check_in" | "check_out">;

// ISO "YYYY-MM-DD" strings compare lexicographically.
export function stayStatus(s: Dates, today: string): StayStatus {
  if (today < s.check_in) return "upcoming";
  return today < s.check_out ? "now" : "past";
}

/** "Check-in in 16 days" / "Night 2 of 4" / "Checked out". */
export function stayStatusLabel(s: Dates, today: string): string {
  const status = stayStatus(s, today);
  if (status === "past") return "Checked out";
  if (status === "upcoming") {
    const n = nightsBetween(today, s.check_in);
    return n === 1 ? "Check-in tomorrow" : `Check-in in ${n} days`;
  }
  const total = nightsBetween(s.check_in, s.check_out);
  const night = nightsBetween(s.check_in, today) + 1;
  return `Night ${night} of ${total}${night === total ? " · check-out tomorrow" : ""}`;
}

export interface StayRow {
  kind: "stay";
  stay: Stay;
  status: StayStatus;
  nights: number;
}

/** Nights with no booking between two stays; from/to are the first/last uncovered nights. */
export interface GapRow {
  kind: "gap";
  from: string;
  to: string;
  nights: number;
}

export type TimelineRow = StayRow | GapRow;

export function stayTimeline(stays: Stay[], today: string): TimelineRow[] {
  const sorted = [...stays].sort((a, b) => a.check_in.localeCompare(b.check_in) || a.check_out.localeCompare(b.check_out));
  const rows: TimelineRow[] = [];
  let lastOut: string | null = null;
  for (const stay of sorted) {
    if (lastOut && stay.check_in > lastOut) {
      rows.push({ kind: "gap", from: lastOut, to: addDays(stay.check_in, -1), nights: nightsBetween(lastOut, stay.check_in) });
    }
    rows.push({ kind: "stay", stay, status: stayStatus(stay, today), nights: nightsBetween(stay.check_in, stay.check_out) });
    if (!lastOut || stay.check_out > lastOut) lastOut = stay.check_out;
  }
  return rows;
}

/** "Sat 24 Oct – Sun 25 Oct · 2 nights" / "Night of Sat 24 Oct". */
export function gapLabel(g: GapRow): string {
  if (g.nights === 1) return `Night of ${formatDay(g.from)}`;
  return `${formatDay(g.from)} – ${formatDay(g.to)} · ${g.nights} nights`;
}
