import type { Category, DayItem, Location, LocationType, Resource, Stay, TripData } from "./types";

export function itemsForDay(data: TripData, dayId: string): { timed: DayItem[]; anytime: DayItem[] } {
  const items = data.items.filter((i) => i.day_id === dayId);
  const timed = items
    .filter((i) => i.time)
    .sort((a, b) => a.time!.localeCompare(b.time!) || a.position - b.position);
  const anytime = items.filter((i) => !i.time).sort((a, b) => a.position - b.position);
  return { timed, anytime };
}

// "YYYY-MM-DD" day difference (UTC math avoids DST issues).
function dayDiff(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export function stayForNight(
  data: TripData,
  date: string,
): { stay: Stay; nightIndex: number; nights: number } | null {
  const stay = data.stays.find((s) => s.check_in <= date && date < s.check_out);
  if (!stay) return null;
  return {
    stay,
    nightIndex: dayDiff(stay.check_in, date) + 1,
    nights: dayDiff(stay.check_in, stay.check_out),
  };
}

export function checkoutOn(data: TripData, date: string): Stay | null {
  return data.stays.find((s) => s.check_out === date) ?? null;
}

export function placesInArea(data: TripData, areaId: string): Location[] {
  return data.locations.filter((l) => l.parent_id === areaId);
}

export function locationById(data: TripData, id: string | null): Location | undefined {
  return id ? data.locations.find((l) => l.id === id) : undefined;
}

export function categoryById(data: TripData, id: string | null): Category | undefined {
  return id ? data.categories.find((c) => c.id === id) : undefined;
}

export interface DeleteImpact {
  places: number; // child places removed with an area
  stays: number;
  items: number; // day items removed
  uncategorized: number; // locations losing their category
}

export function deleteImpact(data: TripData, resource: Resource, id: string): DeleteImpact {
  const impact: DeleteImpact = { places: 0, stays: 0, items: 0, uncategorized: 0 };
  if (resource === "categories") {
    impact.uncategorized = data.locations.filter((l) => l.category_id === id).length;
  } else if (resource === "locations") {
    const gone = new Set<string>([id]);
    for (const l of data.locations) if (l.parent_id === id) gone.add(l.id);
    impact.places = gone.size - 1;
    impact.stays = data.stays.filter((s) => gone.has(s.location_id)).length;
    impact.items = data.items.filter((i) => i.location_id && gone.has(i.location_id)).length;
  } else if (resource === "days") {
    impact.items = data.items.filter((i) => i.day_id === id).length;
  }
  return impact;
}

export function localISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function todayISO(): string {
  return localISO(new Date());
}

export interface LocationFilter {
  query?: string;
  type?: LocationType;
  city?: string;
  category_id?: string;
}

export function filterLocations(data: TripData, f: LocationFilter): Location[] {
  const q = f.query?.trim().toLowerCase();
  return data.locations.filter((l) => {
    if (f.type && l.type !== f.type) return false;
    if (f.city && l.city !== f.city) return false;
    if (f.category_id && l.category_id !== f.category_id) return false;
    if (q) {
      const hay = `${l.name}\n${l.city}\n${l.description ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
