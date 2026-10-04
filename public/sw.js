// Bump VERSION on any change to this file or sw-map-cache.js; old caches are purged on activate.
importScripts("/sw-map-cache.js");
const VERSION = "v5";
const STATIC = `trip-static-${VERSION}`;
const PAGES = `trip-pages-${VERSION}`;
const OTHER = `trip-other-${VERSION}`;
const MAP = self.MapCache;
const KEEP = [STATIC, PAGES, OTHER, MAP.MAP_CACHE];
const PAGE_PATHS = ["/", "/login"];

// Only store clean 200s: never redirected (expired session -> /login), opaque, or errors.
const cacheable = (res) => res.status === 200 && !res.redirected && res.type === "basic";

// Hashed asset URLs a page's HTML references: <script src>, <link href> and the inline
// RSC flight data (JSON-escaped strings, so stop at a backslash). Keeps ?dpl= queries.
const ASSET_RE = /\/_next\/static\/[^"'\s\\<>]+/g;
function assetUrls(html) {
  return [...new Set((html.match(ASSET_RE) || []).map((u) => u.replace(/&amp;/g, "&")))];
}

// Cache a page only after every static chunk its HTML needs is cached, so a cached
// page can always boot offline (no white screen after a deploy). Throws on any miss.
async function storePage(key, res) {
  const html = await res.clone().text();
  const statics = await caches.open(STATIC);
  await Promise.all(
    assetUrls(html).map(async (url) => {
      if (await statics.match(url)) return;
      const asset = await fetch(url);
      if (!cacheable(asset)) throw new Error(`asset ${asset.status}`);
      await statics.put(url, asset);
    }),
  );
  await (await caches.open(PAGES)).put(key, res);
}

// Background cache writes: a failed write (quota, bad chunk) never breaks the response.
function keep(event, task) {
  event.waitUntil(task().catch(() => {}));
}

function storeLater(event, cacheName, key, res) {
  if (cacheable(res)) {
    const copy = res.clone();
    keep(event, async () => (await caches.open(cacheName)).put(key, copy));
  }
  return res;
}

function storePageLater(event, key, res) {
  if (cacheable(res)) {
    const copy = res.clone();
    keep(event, () => storePage(key, copy));
  }
  return res;
}

async function trimMapCache() {
  const cache = await caches.open(MAP.MAP_CACHE);
  for (const req of MAP.keysToTrim(await cache.keys(), MAP.MAP_MAX_ENTRIES)) await cache.delete(req);
}

// Coalesce trims: one in flight, a burst of puts only schedules one rerun.
// trimming is cleared synchronously right after the last `again` check (no gap for a lost rerun).
let trimming = null;
let again = false;
function scheduleTrim() {
  if (trimming) {
    again = true;
    return trimming;
  }
  return (trimming = (async () => {
    try {
      do {
        again = false;
        await trimMapCache();
      } while (again);
    } finally {
      trimming = null;
    }
  })());
}

async function putMap(key, res) {
  await (await caches.open(MAP.MAP_CACHE)).put(key, res);
  await scheduleTrim();
}

function storeMapLater(event, key, res) {
  if (MAP.mapCacheable(res)) {
    const copy = res.clone();
    keep(event, () => putMap(key, copy));
  }
  return res;
}

const META_TIMEOUT_MS = 4000;

// Saved copy carries its fetch time, so a young one can be served without the network.
function stamped(res) {
  const headers = new Headers(res.headers);
  headers.set(MAP.FETCHED_HEADER, String(Date.now()));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

// Style/TileJSON: a saved copy younger than a day is served as-is (saves data). Otherwise
// network-first, with a slow (> META_TIMEOUT_MS) or failing network falling back to the saved
// copy. The cache write is chained into the fetch and registered with waitUntil up front, so
// a late response (after the timeout already answered) is still saved.
async function handleMeta(event, req, key) {
  const cached = await (await caches.open(MAP.MAP_CACHE)).match(key);
  if (cached && MAP.isFresh(Number(cached.headers.get(MAP.FETCHED_HEADER)), Date.now(), MAP.META_MAX_AGE_MS)) {
    return cached;
  }
  const network = fetch(req); // stays clean: a cache failure must never lose a good response
  // Registered first, so its clone runs before anything consumes the body.
  const saved = network.then((res) => (MAP.mapCacheable(res) ? putMap(key, stamped(res.clone())) : null));
  keep(event, () => saved);
  let timer;
  const timeout = new Promise((resolve) => (timer = setTimeout(() => resolve(null), META_TIMEOUT_MS)));
  try {
    const res = await Promise.race([network, timeout]);
    if (res && res.ok) return res;
    if (cached) return cached;
    return res || (await network);
  } catch {
    return cached || Response.error();
  } finally {
    clearTimeout(timer);
  }
}

function handleMap(event, req, kind) {
  const key = MAP.mapCacheKey(new URL(req.url));
  if (kind === "meta") return handleMeta(event, req, key).catch(() => Response.error());
  return caches
    .open(MAP.MAP_CACHE)
    .then((c) => c.match(key))
    .then((hit) => hit || fetch(req).then((res) => storeMapLater(event, key, res)))
    .catch(() => Response.error());
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      for (const url of PAGE_PATHS) {
        try {
          const res = await fetch(url, { cache: "reload" });
          if (cacheable(res)) await storePage(url, res);
        } catch {}
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (!KEEP.includes(k)) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const mapKind = MAP.mapRequestKind(url);
  if (mapKind) {
    event.respondWith(handleMap(event, req, mapKind));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // network only, never cached

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => storeLater(event, STATIC, req, res))),
    );
    return;
  }

  // App shell: stale-while-revalidate.
  if (req.mode === "navigate" && url.pathname === "/") {
    event.respondWith(
      (async () => {
        const hit = await (await caches.open(PAGES)).match("/");
        const network = fetch(req).then((res) => storePageLater(event, "/", res));
        if (hit) {
          keep(event, () => network);
          return hit;
        }
        return network.catch(() => Response.error());
      })(),
    );
    return;
  }

  // /login: network-first, refreshed into the PAGES bucket it was precached in.
  if (req.mode === "navigate" && url.pathname === "/login") {
    event.respondWith(
      fetch(req)
        .then((res) => storePageLater(event, "/login", res))
        .catch(async () => (await (await caches.open(PAGES)).match("/login")) || Response.error()),
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => storeLater(event, OTHER, req, res))
      .catch(async () => (await caches.match(req)) || Response.error()),
  );
});
