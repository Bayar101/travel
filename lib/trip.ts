// Pure trip-level helpers for the Days list and Day detail (status, numbering, gaps, previews).
import { itemsForDay, locationById } from "./selectors";
import { formatDay, nightsBetween } from "./stay-dates";
import type { Day, TripData } from "./types";

const byDate = (days: Day[]) => [...days].sort((a, b) => a.date.localeCompare(b.date));

/** 1-based calendar day of the trip ("Day 6" for the 6th date, even with gaps). */
export function dayNumber(firstDate: string, date: string): number {
  return nightsBetween(firstDate, date) + 1;
}

export type TripStatus =
  | { kind: "empty" }
  | { kind: "before"; daysUntil: number; first: string; last: string }
  | { kind: "during"; dayNumber: number; total: number; todayId: string | null }
  | { kind: "after" };

export function tripStatus(days: Day[], today: string): TripStatus {
  if (!days.length) return { kind: "empty" };
  const sorted = byDate(days);
  const first = sorted[0].date;
  const last = sorted[sorted.length - 1].date;
  if (today < first) return { kind: "before", daysUntil: nightsBetween(today, first), first, last };
  if (today > last) return { kind: "after" };
  return {
    kind: "during",
    dayNumber: dayNumber(first, today),
    total: dayNumber(first, last),
    todayId: sorted.find((d) => d.date === today)?.id ?? null,
  };
}

export function tripSummary(s: Exclude<TripStatus, { kind: "empty" }>): { title: string; detail: string | null } {
  switch (s.kind) {
    case "before":
      return {
        title: s.daysUntil === 1 ? "Trip starts tomorrow" : `Trip starts in ${s.daysUntil} days`,
        detail: s.first === s.last ? formatDay(s.first) : `${formatDay(s.first)} – ${formatDay(s.last)}`,
      };
    case "during":
      return { title: `Day ${s.dayNumber} of ${s.total}`, detail: s.todayId ? null : "Nothing planned today" };
    case "after":
      return { title: "Trip complete", detail: null };
  }
}

export type DayListRow =
  | { kind: "day"; day: Day; dayNumber: number }
  | { kind: "gap"; key: string; days: number; label: string };

/** Days sorted by date with "N days without plans" rows between non-consecutive dates. */
export function dayListRows(days: Day[]): DayListRow[] {
  const sorted = byDate(days);
  const rows: DayListRow[] = [];
  sorted.forEach((d, i) => {
    const prev = sorted[i - 1];
    if (prev) {
      const missing = nightsBetween(prev.date, d.date) - 1;
      if (missing > 0) {
        rows.push({ kind: "gap", key: `gap-${prev.id}`, days: missing, label: `${missing} day${missing === 1 ? "" : "s"} without plans` });
      }
    }
    rows.push({ kind: "day", day: d, dayNumber: dayNumber(sorted[0].date, d.date) });
  });
  return rows;
}

export function adjacentDayIds(days: Day[], id: string): { prev: string | null; next: string | null } {
  const sorted = byDate(days);
  const i = sorted.findIndex((d) => d.id === id);
  if (i < 0) return { prev: null, next: null };
  return { prev: sorted[i - 1]?.id ?? null, next: sorted[i + 1]?.id ?? null };
}

const BLOCK_FMT = new Intl.DateTimeFormat("en-GB", { weekday: "short", month: "short" });

/** Parts for the Days list date block: { weekday: "Tue", day: "20", month: "Oct" }. */
export function dateBlock(iso: string): { weekday: string; day: string; month: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const p = Object.fromEntries(BLOCK_FMT.formatToParts(new Date(y, m - 1, d, 12)).map((x) => [x.type, x.value]));
  return { weekday: p.weekday, day: String(d), month: p.month };
}

export interface ItemPreview {
  id: string;
  time: string | null;
  emoji: string;
  text: string;
}

/** First `max` items of a day (timed, then anytime) as one-line previews, plus how many more. */
export function itemPreviews(data: TripData, dayId: string, max: number): { previews: ItemPreview[]; more: number } {
  const { timed, anytime } = itemsForDay(data, dayId);
  const all = [...timed, ...anytime];
  const previews = all.slice(0, max).map((i): ItemPreview => {
    const loc = locationById(data, i.location_id);
    if (loc) return { id: i.id, time: i.time, emoji: loc.emoji, text: loc.name };
    if (i.location_id) return { id: i.id, time: i.time, emoji: "❓", text: "Unknown location" };
    return { id: i.id, time: i.time, emoji: "📝", text: (i.note ?? "").trim().split("\n")[0] };
  });
  return { previews, more: Math.max(0, all.length - max) };
}

const SWIPE_MIN_PX = 60;

/** Finger delta -> day change: left swipe = next day. Must be clearly horizontal. */
export function swipeDirection(dx: number, dy: number): "next" | "prev" | null {
  if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return dx < 0 ? "next" : "prev";
}
