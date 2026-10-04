import type { Day, DayItem, Location, TripData } from "./types";
import { formatDay } from "./stay-dates";

export type CategorySelection = "all" | "none" | string;
export interface Chip { key: CategorySelection; label: string }
export type Bounds = [[number, number], [number, number]];
export interface PlannedRow { day: Day; item: DayItem; label: string }

const PAD = 0.01;

export function categoryChips(data: TripData): Chip[] {
  const cats = [...data.categories].sort((a, b) => a.name.localeCompare(b.name));
  const chips: Chip[] = [{ key: "all", label: "All" }];
  for (const c of cats) chips.push({ key: c.id, label: c.emoji ? `${c.emoji} ${c.name}` : c.name });
  if (data.locations.some((l) => l.category_id === null)) chips.push({ key: "none", label: "Uncategorized" });
  return chips;
}

export function normalizeSelection(data: TripData, sel: CategorySelection): CategorySelection {
  return categoryChips(data).some((c) => c.key === sel) ? sel : "all";
}

export function filterByCategory(locations: Location[], sel: CategorySelection): Location[] {
  if (sel === "all") return locations;
  if (sel === "none") return locations.filter((l) => l.category_id === null);
  return locations.filter((l) => l.category_id === sel);
}

export function boundsFor(locations: Location[]): Bounds | null {
  if (!locations.length) return null;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const l of locations) {
    minLng = Math.min(minLng, l.lng); maxLng = Math.max(maxLng, l.lng);
    minLat = Math.min(minLat, l.lat); maxLat = Math.max(maxLat, l.lat);
  }
  if (minLng === maxLng && minLat === maxLat) {
    const r = (n: number) => Math.round(n * 1e6) / 1e6;
    return [[r(minLng - PAD), r(minLat - PAD)], [r(maxLng + PAD), r(maxLat + PAD)]];
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}

export function plannedOn(data: TripData, locationId: string): PlannedRow[] {
  const days = new Map(data.days.map((d) => [d.id, d]));
  const rows: PlannedRow[] = [];
  for (const item of data.items) {
    if (item.location_id !== locationId) continue;
    const day = days.get(item.day_id);
    if (!day) continue;
    rows.push({ day, item, label: `${formatDay(day.date)} · ${item.time ?? "Anytime"}` });
  }
  return rows.sort(
    (a, b) =>
      a.day.date.localeCompare(b.day.date) ||
      Number(a.item.time === null) - Number(b.item.time === null) ||
      (a.item.time ?? "").localeCompare(b.item.time ?? "") ||
      a.item.position - b.item.position,
  );
}
