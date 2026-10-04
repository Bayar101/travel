import { handler, HttpError, json, readJson } from "@/lib/api-handler";
import { isAllowedMapsUrl, lookupMapsLink } from "@/lib/maps-link";

export const dynamic = "force-dynamic";

const UNREADABLE = { error: "Couldn't read that link" };
const NO_COORDS = "Couldn't find coordinates — open Coordinates and enter them, or paste a link with a pin";

// Expands a Google Maps share link (maps.app.goo.gl) to coordinates + place name. Links without
// coordinates (newer app shares) fall back to geocoding the name via Nominatim (approximate: true).
// Logs only the host: share URLs carry tracking/query data.
export const POST = handler("api.resolve_maps_link", async ({ req, request_id, log }) => {
  const body = await readJson(req);
  const url = typeof body === "object" && body !== null ? (body as Record<string, unknown>).url : undefined;
  if (typeof url !== "string" || url.length > 2048) throw new HttpError(400, "url must be a string");
  const trimmed = url.trim();
  if (!isAllowedMapsUrl(trimmed)) {
    log.warn("maps_link_rejected", { request_id, reason: "host_not_allowed" });
    return json(UNREADABLE, 422);
  }
  const host = new URL(trimmed).hostname;
  try {
    const r = await lookupMapsLink(trimmed);
    if (!r.ok) {
      log.info("maps_link_unresolved", { request_id, host, reason: r.name ? "geocode_no_match" : "no_coordinates" });
      return json(r.name ? { error: NO_COORDS, name: r.name } : UNREADABLE, 422);
    }
    log.info("maps_link_resolved", { request_id, host, has_name: r.name !== null, approximate: r.approximate });
    const { lat, lng, name, approximate } = r;
    return json(approximate ? { lat, lng, name, approximate } : { lat, lng, name });
  } catch (err) {
    // Fixed reason codes only: error messages may embed the URL.
    const msg = err instanceof Error ? err.message : "";
    const reason = err instanceof Error && err.name === "TimeoutError" ? "timeout"
      : msg === "host not allowed" ? "redirect_host_not_allowed"
      : msg === "too many redirects" ? "too_many_redirects"
      : "network";
    log.warn("maps_link_unresolved", { request_id, host, reason });
    return json(UNREADABLE, 422);
  }
});
