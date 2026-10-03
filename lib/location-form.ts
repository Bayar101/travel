import type { Category, Location, LocationType, TripData } from "./types";

export interface LocationFormValues {
  type: LocationType;
  parent_id: string; // "" = none
  name: string;
  description: string;
  category_id: string; // "" = none
  emoji: string;
  city: string;
  lat: string;
  lng: string;
}

export type LocationFormErrors = Partial<Record<"name" | "city" | "emoji" | "lat" | "lng", string>>;

export const DEFAULT_EMOJI = "📍";

export function defaultEmoji(category: Category | undefined): string {
  return category?.emoji || DEFAULT_EMOJI;
}

function coord(s: string, max: number): number | null {
  if (!s.trim()) return null;
  const n = Number(s.trim());
  return Number.isFinite(n) && Math.abs(n) <= max ? n : null;
}

export function validateLocationForm(v: LocationFormValues): LocationFormErrors {
  const e: LocationFormErrors = {};
  if (!v.name.trim()) e.name = "Name is required";
  if (!v.city.trim()) e.city = "City is required";
  if (!v.emoji.trim()) e.emoji = "Emoji is required";
  if (coord(v.lat, 90) === null) e.lat = "Latitude must be -90 to 90";
  if (coord(v.lng, 180) === null) e.lng = "Longitude must be -180 to 180";
  return e;
}

// Call only after validateLocationForm returned no errors.
export function locationPayload(v: LocationFormValues): Omit<Location, "id"> {
  return {
    type: v.type,
    parent_id: v.type === "place" && v.parent_id ? v.parent_id : null,
    category_id: v.category_id || null,
    name: v.name.trim(),
    description: v.description.trim() || null,
    emoji: v.emoji.trim(),
    city: v.city.trim(),
    lat: Number(v.lat.trim()),
    lng: Number(v.lng.trim()),
  };
}

export function locationToForm(l: Location): LocationFormValues {
  return {
    type: l.type,
    parent_id: l.parent_id ?? "",
    name: l.name,
    description: l.description ?? "",
    category_id: l.category_id ?? "",
    emoji: l.emoji,
    city: l.city,
    lat: String(l.lat),
    lng: String(l.lng),
  };
}

export function cityList(data: TripData): string[] {
  return [...new Set(data.locations.map((l) => l.city))].sort((a, b) => a.localeCompare(b));
}
