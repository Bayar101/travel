// Google Maps share links: host allowlist (SSRF guard), place-name extraction and the
// redirect follower used by /api/resolve-maps-link. No server-only imports so it stays testable.
import { parseLatLng, placeCid } from "./maps";

const EXACT_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);
// google.com, www.google.co.jp, maps.google.de, www.google.com.au … (one optional subdomain label)
const GOOGLE_HOST = /^(?:[a-z0-9-]+\.)?google\.(?:[a-z]{2,3}|(?:co|com)\.[a-z]{2})$/;

export function isMapsHost(host: string): boolean {
  const h = host.toLowerCase();
  return EXACT_HOSTS.has(h) || GOOGLE_HOST.test(h);
}

/** https, default port, no credentials, allowed host. */
export function isAllowedMapsUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  return u.protocol === "https:" && !u.port && !u.username && !u.password && isMapsHost(u.hostname);
}

const SHORT_LINK = /(?:https?:\/\/)?(?:maps\.app\.goo\.gl|goo\.gl\/maps)\/[^\s]+/i;

/** The first short link in pasted text, normalised to https. */
export function extractShortLink(text: string): string | null {
  const m = text.match(SHORT_LINK);
  if (!m) return null;
  return /^https?:\/\//i.test(m[0]) ? m[0].replace(/^http:/i, "https:") : `https://${m[0]}`;
}

const COORD_PAIR = /^\s*[-+]?\d+(?:\.\d+)?\s*,\s*[-+]?\d+(?:\.\d+)?\s*$/;

/** "Park's Inn" from ".../maps/place/Park's+Inn/@…"; null if absent, undecodable or just coordinates. */
export function placeNameFromUrl(text: string): string | null {
  const m = text.match(/\/maps\/place\/([^/?#@\s]+)/);
  if (!m) return null;
  let name: string;
  try {
    name = decodeURIComponent(m[1].replace(/\+/g, " "));
  } catch {
    return null;
  }
  name = name.replace(/\s+/g, " ").trim().slice(0, 200);
  return name && !COORD_PAIR.test(name) ? name : null;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ResolvedLink {
  ll: LatLng | null; // null: the link names a place but carries no coordinates (newer app links)
  name: string | null;
  cid: string | null; // Google place id when the final url carries one
}

const MAX_HOPS = 5;
export const TIMEOUT_MS = 5000;

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Follow redirects by hand (each hop's host re-checked), never reading bodies, then parse the
 * final URL. Throws on a disallowed host / too many hops / network error; null on an error status.
 */
export async function resolveMapsLink(start: string, fetchImpl: Fetch = fetch): Promise<ResolvedLink | null> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let url = start;
  for (let hop = 0; ; hop++) {
    if (!isAllowedMapsUrl(url)) throw new Error("host not allowed");
    const res = await fetchImpl(url, { method: "GET", redirect: "manual", signal, headers: { accept: "text/html" } });
    await res.body?.cancel().catch(() => {});
    const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!location) {
      if (!res.ok) return null;
      break;
    }
    if (hop >= MAX_HOPS) throw new Error("too many redirects");
    url = new URL(location, url).toString();
  }
  // Consent interstitials carry the real target in ?continue=.
  const cont = new URL(url).searchParams.get("continue");
  const final = cont && isAllowedMapsUrl(cont) ? cont : url;
  return { ll: parseLatLng(final), name: placeNameFromUrl(final), cid: placeCid(final) };
}

// Fixed host: the user only ever controls the q= value.
export const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
// Nominatim usage policy: identify the app; max 1 request/s; cache results.
const USER_AGENT = "japan-trip-planner/1.0 (personal single-user trip planner; geocodes Google Maps share links)";

/**
 * First Nominatim hit in Japan for a place name; null if none / unusable (a real "no match").
 * Throws on network error or an error status (429/5xx: transient, must not be cached).
 */
export async function geocodeName(name: string, fetchImpl: Fetch = fetch): Promise<LatLng | null> {
  const u = new URL(NOMINATIM_URL);
  u.search = new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "jp", q: name }).toString();
  const res = await fetchImpl(u.toString(), {
    method: "GET",
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
  });
  if (!res.ok) {
    await res.body?.cancel().catch(() => {});
    throw new Error(`geocoder status ${res.status}`);
  }
  const body: unknown = await res.json().catch(() => null);
  const hit = Array.isArray(body) ? (body[0] as { lat?: unknown; lon?: unknown } | undefined) : undefined;
  if (!hit) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (typeof hit.lat !== "string" || typeof hit.lon !== "string" || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Cache key: width-folded, case-insensitive, whitespace-collapsed. */
export function normalizePlaceName(name: string): string {
  return name.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Small in-memory LRU with a TTL (Map keeps insertion order: first key = least recent). */
export class LruCache<V> {
  private entries = new Map<string, { value: V; expires: number }>();
  constructor(
    private max: number,
    private ttlMs: number,
    private now: () => number = Date.now,
  ) {}

  /** `{ value }` on a fresh hit (value may itself be null), else undefined. */
  get(key: string): { value: V } | undefined {
    const e = this.entries.get(key);
    if (!e) return undefined;
    this.entries.delete(key);
    if (this.now() >= e.expires) return undefined;
    this.entries.set(key, e); // most recent
    return { value: e.value };
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expires: this.now() + this.ttlMs });
    while (this.entries.size > this.max) this.entries.delete(this.entries.keys().next().value!);
  }
}

type Sleep = (ms: number) => Promise<void>;
const realSleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Runs tasks one at a time, starting each at least `minIntervalMs` after the previous start. */
export function createSerialGate(minIntervalMs: number, now: () => number = Date.now, sleep: Sleep = realSleep) {
  let tail: Promise<unknown> = Promise.resolve();
  let lastStart = -Infinity;
  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(async () => {
      const wait = lastStart + minIntervalMs - now();
      if (wait > 0) await sleep(wait);
      lastStart = now();
      return task();
    });
    tail = run.catch(() => {});
    return run;
  };
}

export type Geocoder = (name: string, fetchImpl?: Fetch) => Promise<LatLng | null>;

/** geocodeName behind a 1 req/s gate and an LRU cache (hits and no-matches; never failures). */
export function createGeocoder(opts: {
  minIntervalMs?: number;
  ttlMs?: number;
  max?: number;
  now?: () => number;
  sleep?: Sleep;
} = {}): Geocoder {
  const now = opts.now ?? Date.now;
  const cache = new LruCache<LatLng | null>(opts.max ?? 100, opts.ttlMs ?? 24 * 60 * 60 * 1000, now);
  const gate = createSerialGate(opts.minIntervalMs ?? 1000, now, opts.sleep);
  return async (name, fetchImpl = fetch) => {
    const key = normalizePlaceName(name);
    const cached = cache.get(key);
    if (cached) return cached.value;
    const ll = await gate(() => geocodeName(name, fetchImpl));
    cache.set(key, ll);
    return ll;
  };
}

// One per server instance: the gate and cache must be shared across requests.
const sharedGeocoder = createGeocoder();

export type LookupResult =
  | { ok: true; lat: number; lng: number; name: string | null; cid: string | null; approximate: boolean }
  | { ok: false; name: string | null };

/**
 * Link → coordinates. Exact when the link has them; else geocode its place name (approximate).
 * Throws only on link-following failures (disallowed host, hops, network); geocoder errors → not found.
 */
export async function lookupMapsLink(
  start: string,
  fetchImpl: Fetch = fetch,
  geocode: Geocoder = sharedGeocoder,
): Promise<LookupResult> {
  const r = await resolveMapsLink(start, fetchImpl);
  if (!r) return { ok: false, name: null };
  if (r.ll) return { ok: true, ...r.ll, name: r.name, cid: r.cid, approximate: false };
  if (!r.name) return { ok: false, name: null };
  const g = await geocode(r.name, fetchImpl).catch(() => null);
  return g ? { ok: true, ...g, name: r.name, cid: r.cid, approximate: true } : { ok: false, name: r.name };
}
