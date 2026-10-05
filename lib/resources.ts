import type { Resource } from "@/lib/types";
import {
  validateCategory,
  validateDay,
  validateItem,
  validateLocation,
  validateStay,
  type Mode,
  type Result,
} from "@/lib/validation";

export interface ResourceDef {
  table: string;
  columns: string;
  order: { column: string; ascending?: boolean };
  validate: (input: unknown, mode: Mode) => Result<Record<string, unknown>>;
}

export const RESOURCES: Record<Resource, ResourceDef> = {
  categories: {
    table: "categories",
    columns: "id,name,emoji",
    order: { column: "name" },
    validate: validateCategory,
  },
  locations: {
    table: "locations",
    columns: "id,type,parent_id,category_id,name,description,emoji,city,lat,lng,google_cid",
    order: { column: "name" },
    validate: validateLocation,
  },
  stays: {
    table: "stays",
    columns: "id,location_id,name,airbnb_url,check_in,check_out",
    order: { column: "check_in" },
    validate: validateStay,
  },
  days: {
    table: "days",
    columns: "id,date,title,note",
    order: { column: "date" },
    validate: validateDay,
  },
  items: {
    table: "day_items",
    columns: "id,day_id,location_id,time,position,note",
    order: { column: "position" },
    validate: validateItem,
  },
};

export function getResource(name: string): ResourceDef | null {
  return Object.hasOwn(RESOURCES, name) ? RESOURCES[name as Resource] : null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID_RE.test(s);

// Postgres `time` -> "HH:MM:SS"; API uses "HH:MM".
export function normalizeTime(t: string | null | undefined): string | null {
  return typeof t === "string" ? t.slice(0, 5) : null;
}

export function normalizeRow<T extends Record<string, unknown>>(name: string, row: T): T {
  if (name === "items" && "time" in row) return { ...row, time: normalizeTime(row.time as string | null) };
  return row;
}

export interface PgErrorLike {
  code?: string;
  message?: string;
  details?: string | null;
}

const CHECK_MESSAGES: Record<string, string> = {
  day_items_location_or_note: "location_id or note is required",
  stays_dates_order: "check_out must be after check_in",
  locations_area_no_parent: "an area cannot have a parent_id",
};

const UNIQUE_MESSAGES: Record<string, string> = {
  categories_name_key: "Category name already exists",
  days_date_key: "A day with that date already exists",
};

// Trigger messages raised by check_location_parent() (our own text, safe to expose).
const TRIGGER_MESSAGES = ["parent_id must reference a location of type area", "area with places cannot become a place"];

// Maps a Postgres error to an HTTP status + message, or null if unexpected (-> 500).
export function mapPgError(err: PgErrorLike): { status: number; message: string } | null {
  const text = `${err.message ?? ""} ${err.details ?? ""}`;
  switch (err.code) {
    case "23505": {
      const key = Object.keys(UNIQUE_MESSAGES).find((k) => text.includes(k));
      return { status: 409, message: key ? UNIQUE_MESSAGES[key] : "Already exists" };
    }
    case "23P01":
      return { status: 409, message: "Stay dates overlap another stay" };
    case "23503":
      return { status: 400, message: "Referenced row does not exist" };
    case "23514":
    case "P0001": {
      const check = Object.keys(CHECK_MESSAGES).find((k) => text.includes(k));
      if (check) return { status: 400, message: CHECK_MESSAGES[check] };
      const trig = TRIGGER_MESSAGES.find((m) => text.includes(m));
      return { status: 400, message: trig ?? "Invalid data" };
    }
    case "22P02":
      return { status: 400, message: "Invalid value" };
    default:
      return null;
  }
}
