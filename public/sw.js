// Bump VERSION on any change to this file; old caches are purged on activate.
const VERSION = "v1";
const STATIC = `trip-static-${VERSION}`;
const PAGES = `trip-pages-${VERSION}`;
const OTHER = `trip-other-${VERSION}`;
const KEEP = [STATIC, PAGES, OTHER];

// Only store clean 200s: never redirected (expired session -> /login), opaque, or errors.
const cacheable = (res) => res.status === 200 && !res.redirected && res.type === "basic";

async function put(cacheName, req, res) {
  if (cacheable(res)) await (await caches.open(cacheName)).put(req, res.clone());
  return res;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES);
      for (const url of ["/", "/login"]) {
        try {
          const res = await fetch(url, { cache: "reload" });
          if (cacheable(res)) await cache.put(url, res);
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
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // network only, never cached

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => put(STATIC, req, res))),
    );
    return;
  }

  if (req.mode === "navigate" && url.pathname === "/") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES);
        const hit = await cache.match("/");
        const refresh = fetch(req)
          .then((res) => put(PAGES, "/", res))
          .catch(() => undefined);
        if (hit) {
          event.waitUntil(refresh);
          return hit;
        }
        return (await refresh) || fetch(req);
      })(),
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => put(OTHER, req, res))
      .catch(async () => (await caches.match(req)) || Response.error()),
  );
});
