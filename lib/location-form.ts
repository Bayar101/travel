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

const DECIMAL = /^[-+]?(\d+\.?\d*|\.\d+)$/;

function coord(s: string, max: number): number | null {
  const t = s.trim();
  if (!DECIMAL.test(t)) return null;
  const n = Number(t);
  return Math.abs(n) <= max ? n : null;
}

export function validateLocationForm(v: LocationFormValues): LocationFormErrors {
  const e: LocationFormErrors = {};
  if (!v.name.trim()) e.name = "Name is required";
  if (!v.city.trim()) e.city = "City is required";
  if (!v.emoji.trim()) e.emoji = "Emoji is required";
  if (!v.lat.trim()) e.lat = "Latitude is required";
  else if (coord(v.lat, 90) === null) e.lat = "Latitude must be a number from -90 to 90";
  if (!v.lng.trim()) e.lng = "Longitude is required";
  else if (coord(v.lng, 180) === null) e.lng = "Longitude must be a number from -180 to 180";
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

/** Quick-pick row in the location form. */
export const QUICK_EMOJI = ["📍", "🍜", "🍣", "☕", "🍵", "⛩️", "🏯", "🛍️", "🏙️", "🌸", "🗻", "🏨"];

/** "35.71477, 139.79666" for the collapsed Coordinates disclosure; null if not valid yet. */
export function coordsSummary(v: Pick<LocationFormValues, "lat" | "lng">): string | null {
  const lat = coord(v.lat, 90);
  const lng = coord(v.lng, 180);
  if (lat === null || lng === null) return null;
  return `${Number(lat.toFixed(5))}, ${Number(lng.toFixed(5))}`;
}

type Coords = Pick<LocationFormValues, "lat" | "lng">;

/** A failed paste drops coordinates only if the previous paste filled them (manual entries stay). */
export function clearAutoCoords<T extends Coords>(v: T, auto: Coords | null): T {
  return auto && v.lat === auto.lat && v.lng === auto.lng ? { ...v, lat: "", lng: "" } : v;
}

/** Clear Name only while it is still exactly what an earlier link filled. */
export function clearAutoName<T extends { name: string }>(v: T, auto: string | null): T {
  return auto !== null && v.name === auto ? { ...v, name: "" } : v;
}

/** Fill Name from a link when it's empty or still the name an earlier link filled; never over typed text. */
export function shouldFillName(current: string, lastAuto: string | null, name: string | null): boolean {
  const cur = current.trim();
  return !!name && (!cur || cur === lastAuto);
}
