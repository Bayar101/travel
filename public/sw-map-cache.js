// Map (OpenFreeMap) caching rules. Loaded by sw.js via importScripts; also required by Node tests.
(function (root) {
  const MAP_HOST = "tiles.openfreemap.org";
  const MAP_CACHE = "map-v1"; // survives sw.js VERSION bumps
  const MAP_MAX_ENTRIES = 2500; // ~50 MB at ~20 KB/entry

  // Style JSON and TileJSON point at weekly-versioned tile URLs, so keep them fresh (network-first);
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

  const api = { MAP_HOST, MAP_CACHE, MAP_MAX_ENTRIES, mapRequestKind, keysToTrim, mapCacheKey, mapCacheable };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MapCache = api;
})(typeof self !== "undefined" ? self : globalThis);
