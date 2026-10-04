import { handler, HttpError, json, readJson } from "@/lib/api-handler";
import { isAllowedMapsUrl, resolveMapsLink } from "@/lib/maps-link";

export const dynamic = "force-dynamic";

const UNREADABLE = { error: "Couldn't read that link" };

// Expands a Google Maps share link (maps.app.goo.gl) to coordinates + place name.
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
    const r = await resolveMapsLink(trimmed);
    if (!r) {
      log.info("maps_link_unresolved", { request_id, host, reason: "no_coordinates" });
      return json(UNREADABLE, 422);
    }
    log.info("maps_link_resolved", { request_id, host, has_name: r.name !== null });
    return json(r);
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
