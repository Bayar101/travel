// Google Maps share links: host allowlist (SSRF guard), place-name extraction and the
// redirect follower used by /api/resolve-maps-link. No server-only imports so it stays testable.
import { parseLatLng } from "./maps";

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

/** True when the text contains a Google Maps short link (app "Share → Copy link"). */
export function looksLikeShortLink(text: string): boolean {
  return SHORT_LINK.test(text);
}

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
}

export const MAX_HOPS = 5;
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
  return { ll: parseLatLng(final), name: placeNameFromUrl(final) };
}

// Fixed host: the user only ever controls the q= value.
export const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "japan-trip-planner/1.0 (personal)";

/** First Nominatim hit in Japan for a place name; null if none / unusable. Throws on network error. */
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
    return null;
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

export type LookupResult =
  | { ok: true; lat: number; lng: number; name: string | null; approximate: boolean }
  | { ok: false; name: string | null };

/**
 * Link → coordinates. Exact when the link has them; else geocode its place name (approximate).
 * Throws only on link-following failures (disallowed host, hops, network); geocoder errors → not found.
 */
export async function lookupMapsLink(start: string, fetchImpl: Fetch = fetch): Promise<LookupResult> {
  const r = await resolveMapsLink(start, fetchImpl);
  if (!r) return { ok: false, name: null };
  if (r.ll) return { ok: true, ...r.ll, name: r.name, approximate: false };
  if (!r.name) return { ok: false, name: null };
  const g = await geocodeName(r.name, fetchImpl).catch(() => null);
  return g ? { ok: true, ...g, name: r.name, approximate: true } : { ok: false, name: r.name };
}
