// Map (OpenFreeMap) caching rules. Loaded by sw.js via importScripts; also required by Node tests.
(function (root) {
  const MAP_HOST = "tiles.openfreemap.org";
  const MAP_CACHE = "map-v1"; // survives sw.js VERSION bumps
  const MAP_MAX_ENTRIES = 2500; // ~50 MB at ~20 KB/entry
  const META_MAX_AGE_MS = 24 * 3600 * 1000; // saved style/TileJSON younger than this skip the network
  const FETCHED_HEADER = "x-sw-fetched"; // ms timestamp stamped on saved style/TileJSON

  // Style JSON and TileJSON point at weekly-versioned tile URLs, so refresh them daily;
  // tiles, glyphs and sprites are immutable per URL (cache-first).
  function mapRequestKind(url) {
    if (url.hostname !== MAP_HOST) return null;
    if (url.pathname.startsWith("/styles/") || /^\/planet\/?$/.test(url.pathname)) return "meta";
    return "asset";
  }

  function keysToTrim(keys, max) {
    return keys.length > max ? keys.slice(0, keys.length - max) : [];
  }

  // Tile URLs embed a weekly version (/planet/<ver>/z/x/y.pbf); key them version-agnostically
  // so saved areas stay reachable after the TileJSON moves to a new version.
  function mapCacheKey(url) {
    const m = /^\/planet\/[^/]+\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(url.pathname);
    return m ? "https://" + MAP_HOST + "/planet/_/" + m[1] + "/" + m[2] + "/" + m[3] + ".pbf" : url.href;
  }

  function mapCacheable(res) {
    return res.ok && (res.type === "cors" || res.type === "basic");
  }

  // A future timestamp (device clock moved back) or a missing one counts as stale.
  function isFresh(fetchedAtMs, nowMs, maxAgeMs) {
    const age = nowMs - fetchedAtMs;
    return age >= 0 && age < maxAgeMs;
  }

  const api = {
    MAP_HOST,
    MAP_CACHE,
    MAP_MAX_ENTRIES,
    META_MAX_AGE_MS,
    FETCHED_HEADER,
    mapRequestKind,
    keysToTrim,
    mapCacheKey,
    mapCacheable,
    isFresh,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MapCache = api;
})(typeof self !== "undefined" ? self : globalThis);
