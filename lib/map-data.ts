import type { Day, DayItem, Location, TripData } from "./types";
import { formatDay } from "./stay-dates";

/** Keys are a category id, or "none" for uncategorized locations. */
export interface CategoryFilter { include: string[]; exclude: string[] }
export type ChipState = "off" | "include" | "exclude";
export interface Chip { key: string; label: string }
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

export const EMPTY_FILTER: CategoryFilter = { include: [], exclude: [] };

export function isEmptyFilter(f: CategoryFilter): boolean {
  return !f.include.length && !f.exclude.length;
}

export function chipState(f: CategoryFilter, key: string): ChipState {
  return f.include.includes(key) ? "include" : f.exclude.includes(key) ? "exclude" : "off";
}

/** off -> include -> exclude -> off */
export function cycleChip(f: CategoryFilter, key: string): CategoryFilter {
  const rest = (a: string[]) => a.filter((k) => k !== key);
  switch (chipState(f, key)) {
    case "off": return { include: [...f.include, key], exclude: f.exclude };
    case "include": return { include: rest(f.include), exclude: [...f.exclude, key] };
    default: return { include: f.include, exclude: rest(f.exclude) };
  }
}

/** Drops keys whose chip no longer exists (deleted category, emptied Uncategorized). */
export function normalizeFilter(data: TripData, f: CategoryFilter): CategoryFilter {
  const valid = new Set(categoryChips(data).map((c) => c.key));
  const inc = f.include.filter((k) => valid.has(k));
  const exc = f.exclude.filter((k) => valid.has(k));
  return inc.length === f.include.length && exc.length === f.exclude.length ? f : { include: inc, exclude: exc };
}

/** Includes (if any) narrow first, then excludes remove. */
export function applyCategoryFilter(locations: Location[], f: CategoryFilter): Location[] {
  if (isEmptyFilter(f)) return locations;
  const inc = new Set(f.include), exc = new Set(f.exclude);
  return locations.filter((l) => {
    const k = l.category_id ?? "none";
    return (!inc.size || inc.has(k)) && !exc.has(k);
  });
}

/** Order-independent, stable string for the map's refit key. */
export function filterKey(f: CategoryFilter): string {
  return `+${[...f.include].sort().join(",")}|-${[...f.exclude].sort().join(",")}`;
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

export function selectedLocation(data: TripData, id: string | null): Location | null {
  return id ? (data.locations.find((l) => l.id === id) ?? null) : null;
}
