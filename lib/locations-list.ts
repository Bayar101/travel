// Pure helpers for the Locations list and picker: filter state, city grouping, row text.
import { categoryById, filterLocations, locationById, placesInArea } from "./selectors";
import type { Location, LocationType, TripData } from "./types";

export interface LocationListFilter {
  query: string;
  type?: LocationType;
  city: string; // "" = all
  categoryId: string; // "" = all
}

export const EMPTY_FILTER: LocationListFilter = { query: "", type: undefined, city: "", categoryId: "" };

export const TYPE_CHIPS: { label: string; type?: LocationType }[] = [
  { label: "All" },
  { label: "Areas", type: "area" },
  { label: "Places", type: "place" },
];

/** Selected city/category may vanish after edits, deletes or sync: treat as "all". */
export function activeFilter(data: TripData, f: LocationListFilter): LocationListFilter {
  return {
    ...f,
    city: data.locations.some((l) => l.city === f.city) ? f.city : "",
    categoryId: data.categories.some((c) => c.id === f.categoryId) ? f.categoryId : "",
  };
}

export function applyFilter(data: TripData, f: LocationListFilter): Location[] {
  return filterLocations(data, {
    query: f.query,
    type: f.type,
    city: f.city || undefined,
    category_id: f.categoryId || undefined,
  });
}

export function isFiltered(f: LocationListFilter): boolean {
  return !!(f.query.trim() || f.type || f.city || f.categoryId);
}

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });

export function groupByCity(locations: Location[]): { city: string; locations: Location[] }[] {
  const map = new Map<string, Location[]>();
  for (const l of locations) {
    const list = map.get(l.city);
    if (list) list.push(l);
    else map.set(l.city, [l]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => byName(a, b))
    .map(([city, list]) => ({ city, locations: [...list].sort((a, b) => byName(a.name, b.name)) }));
}

/** Secondary row line: "Food · in Shibuya" (places) / "Food · 3 places" (areas). */
export function locationSubtitle(data: TripData, l: Location, opts: { withCity?: boolean; withArea?: boolean } = {}): string {
  const cat = categoryById(data, l.category_id);
  const parts: string[] = [];
  if (opts.withCity) parts.push(l.city);
  if (cat) parts.push(cat.name); // emoji lives in the row tile
  if (l.type === "place") {
    if (opts.withArea === false) return parts.join(" · ");
    const area = locationById(data, l.parent_id);
    if (area) parts.push(`in ${area.name}`);
  } else {
    const n = placesInArea(data, l.id).length;
    parts.push(`${n} place${n === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

export function categoryChoices(data: TripData): { id: string; name: string; emoji: string | null; count: number }[] {
  return [...data.categories]
    .sort((a, b) => byName(a.name, b.name))
    .map((c) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      count: data.locations.filter((l) => l.category_id === c.id).length,
    }));
}

export function categoryChipLabel(data: TripData, categoryId: string): string {
  const c = categoryById(data, categoryId || null);
  if (!c) return "Category";
  return c.emoji ? `${c.emoji} ${c.name}` : c.name;
}
