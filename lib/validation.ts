// Pure validation, shared by server routes and client forms. No deps.

export type Mode = "create" | "update";
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const MAX_NAME = 120;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
// airbnb.<tld> | airbnb.co.jp style | any subdomain of those | abnb.me short links
const AIRBNB_HOST_RE = /^(?:[a-z0-9-]+\.)*airbnb\.(?:(?:co|com|org|net|ac)\.[a-z]{2}|[a-z]{2,})$/;
const SHORT_HOSTS = new Set(["abnb.me", "www.abnb.me"]);

type Obj = Record<string, unknown>;
type Fail = { ok: false; error: string };
type Field<T> = { ok: true; value: T } | Fail;

const fail = (error: string): Fail => ({ ok: false, error });

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isDeleteConfirmed(body: unknown): boolean {
  return isObj(body) && body.confirm === "delete me";
}

export function isValidDate(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isAirbnbUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  return SHORT_HOSTS.has(host) || AIRBNB_HOST_RE.test(host);
}

// ---- field parsers (value is already known to be present, i.e. !== undefined) ----

function reqString(name: string, v: unknown, max = MAX_NAME): Field<string> {
  if (typeof v !== "string") return fail(`${name} must be a string`);
  const t = v.trim();
  if (!t) return fail(`${name} is required`);
  if (t.length > max) return fail(`${name} must be at most ${max} characters`);
  return { ok: true, value: t };
}

function optString(name: string, v: unknown, max = 2000): Field<string | null> {
  if (v === null) return { ok: true, value: null };
  if (typeof v !== "string") return fail(`${name} must be a string`);
  const t = v.trim();
  if (t.length > max) return fail(`${name} must be at most ${max} characters`);
  return { ok: true, value: t || null };
}

function uuid(name: string, v: unknown): Field<string> {
  return typeof v === "string" && UUID_RE.test(v) ? { ok: true, value: v } : fail(`${name} must be a valid id`);
}

function optUuid(name: string, v: unknown): Field<string | null> {
  if (v === null || v === "") return { ok: true, value: null };
  return uuid(name, v);
}

function coord(name: string, v: unknown, limit: number): Field<number> {
  if (typeof v !== "number" || !Number.isFinite(v) || v < -limit || v > limit) {
    return fail(`${name} must be a number between -${limit} and ${limit}`);
  }
  return { ok: true, value: v };
}

function date(name: string, v: unknown): Field<string> {
  return isValidDate(v) ? { ok: true, value: v } : fail(`${name} must be a valid date (YYYY-MM-DD)`);
}

function time(name: string, v: unknown): Field<string | null> {
  if (v === null || v === "") return { ok: true, value: null };
  return typeof v === "string" && TIME_RE.test(v) ? { ok: true, value: v } : fail(`${name} must be HH:MM`);
}

function position(name: string, v: unknown): Field<number> {
  return typeof v === "number" && Number.isInteger(v) && v >= 0
    ? { ok: true, value: v }
    : fail(`${name} must be a non-negative integer`);
}

function airbnb(name: string, v: unknown): Field<string> {
  if (typeof v !== "string") return fail(`${name} must be a string`);
  const t = v.trim();
  return isAirbnbUrl(t) ? { ok: true, value: t } : fail(`${name} must be an https Airbnb link`);
}

// ---- schema runner ----

interface Spec {
  parse: (name: string, v: unknown) => Field<unknown>;
  required?: boolean; // required on create
  default?: unknown; // used on create when absent
}
type Schema = Record<string, Spec>;

function run<T>(input: unknown, mode: Mode, schema: Schema): Result<T> {
  if (!isObj(input)) return fail("body must be a JSON object");
  const out: Obj = {};
  for (const [key, spec] of Object.entries(schema)) {
    const raw = input[key];
    if (raw === undefined) {
      if (mode === "create") {
        if (spec.required) return fail(`${key} is required`);
        if ("default" in spec) out[key] = spec.default;
      }
      continue;
    }
    const r = spec.parse(key, raw);
    if (!r.ok) return r;
    out[key] = r.value;
  }
  if (mode === "update" && Object.keys(out).length === 0) return fail("at least one field is required");
  return { ok: true, value: out as T };
}

const str = (max?: number): Spec["parse"] => (n, v) => reqString(n, v, max);
const nstr = (max?: number): Spec["parse"] => (n, v) => optString(n, v, max);

// ---- public validators ----

export function validateCategory(
  input: unknown,
  mode: Mode,
): Result<{ name?: string; emoji?: string | null }> {
  return run(input, mode, {
    name: { parse: str(), required: true },
    emoji: { parse: nstr(16), default: null },
  });
}

export function validateLocation(
  input: unknown,
  mode: Mode,
): Result<{
  type?: "area" | "place";
  parent_id?: string | null;
  category_id?: string | null;
  name?: string;
  description?: string | null;
  emoji?: string;
  city?: string;
  lat?: number;
  lng?: number;
}> {
  const r = run<Obj>(input, mode, {
    type: {
      parse: (n, v) => (v === "area" || v === "place" ? { ok: true, value: v } : fail(`${n} must be "area" or "place"`)),
      required: true,
    },
    parent_id: { parse: optUuid, default: null },
    category_id: { parse: optUuid, default: null },
    name: { parse: str(), required: true },
    description: { parse: nstr(), default: null },
    emoji: { parse: str(16), default: "📍" },
    city: { parse: str(), required: true },
    lat: { parse: (n, v) => coord(n, v, 90), required: true },
    lng: { parse: (n, v) => coord(n, v, 180), required: true },
  });
  if (!r.ok) return r;
  if (r.value.type === "area" && r.value.parent_id != null) return fail("an area cannot have a parent_id");
  return r;
}

export function validateStay(
  input: unknown,
  mode: Mode,
): Result<{
  location_id?: string;
  name?: string;
  airbnb_url?: string;
  check_in?: string;
  check_out?: string;
}> {
  const r = run<Obj>(input, mode, {
    location_id: { parse: uuid, required: true },
    name: { parse: str(), required: true },
    airbnb_url: { parse: airbnb, required: true },
    check_in: { parse: date, required: true },
    check_out: { parse: date, required: true },
  });
  if (!r.ok) return r;
  const { check_in, check_out } = r.value as { check_in?: string; check_out?: string };
  if (check_in && check_out && check_out <= check_in) return fail("check_out must be after check_in");
  return r;
}

export function validateDay(
  input: unknown,
  mode: Mode,
): Result<{ date?: string; title?: string | null; note?: string | null }> {
  return run(input, mode, {
    date: { parse: date, required: true },
    title: { parse: nstr(MAX_NAME), default: null },
    note: { parse: nstr(), default: null },
  });
}

export function validateItem(
  input: unknown,
  mode: Mode,
): Result<{
  day_id?: string;
  location_id?: string | null;
  time?: string | null;
  position?: number;
  note?: string | null;
}> {
  const schema: Schema = {
    location_id: { parse: optUuid, default: null },
    time: { parse: time, default: null },
    position: { parse: position, default: 0 },
    note: { parse: nstr(), default: null },
  };
  // day_id is fixed at creation; stripped on update
  if (mode === "create") schema.day_id = { parse: uuid, required: true };
  const r = run<Obj>(input, mode, schema);
  if (!r.ok) return r;
  if (mode === "create" && r.value.location_id == null && r.value.note == null) {
    return fail("location_id or note is required");
  }
  return r;
}
