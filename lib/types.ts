export type LocationType = "area" | "place";
export interface Category { id: string; name: string; emoji: string | null }
export interface Location {
  id: string; type: LocationType; parent_id: string | null; category_id: string | null;
  name: string; description: string | null; emoji: string; city: string; lat: number; lng: number;
  google_cid: string | null; // Google Maps place id (decimal); null = open by coordinates
}
export interface Stay { id: string; location_id: string; name: string; airbnb_url: string; check_in: string; check_out: string } // dates "YYYY-MM-DD"
export interface Day { id: string; date: string; title: string | null; note: string | null }
export interface DayItem { id: string; day_id: string; location_id: string | null; time: string | null; position: number; note: string | null } // time "HH:MM" or null
export interface TripData { version: number; categories: Category[]; locations: Location[]; stays: Stay[]; days: Day[]; items: DayItem[] }
export type Resource = "categories" | "locations" | "stays" | "days" | "items";
