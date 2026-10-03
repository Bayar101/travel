import type { Resource, TripData } from "./types";

// Mirrors FK cascades in supabase/migrations/0001_init.sql.
export function pruneDeleted(data: TripData, resource: Resource, id: string): TripData {
  switch (resource) {
    case "categories":
      return {
        ...data,
        categories: data.categories.filter((c) => c.id !== id),
        locations: data.locations.map((l) => (l.category_id === id ? { ...l, category_id: null } : l)),
      };
    case "locations": {
      const gone = new Set<string>([id]);
      for (const l of data.locations) if (l.parent_id === id) gone.add(l.id);
      return {
        ...data,
        locations: data.locations.filter((l) => !gone.has(l.id)),
        stays: data.stays.filter((s) => !gone.has(s.location_id)),
        items: data.items.filter((i) => !(i.location_id && gone.has(i.location_id))),
      };
    }
    case "days":
      return {
        ...data,
        days: data.days.filter((d) => d.id !== id),
        items: data.items.filter((i) => i.day_id !== id),
      };
    case "stays":
      return { ...data, stays: data.stays.filter((s) => s.id !== id) };
    case "items":
      return { ...data, items: data.items.filter((i) => i.id !== id) };
  }
}
