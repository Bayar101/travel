# Map View — Design

## Goal

Full-screen map of all locations as pins, tap for rich details, center on my position, filter by category. Must stay data-cheap on eSIM and work offline for previously viewed areas.

## Decisions (approved)

- Engine: **MapLibre GL JS** (`maplibre-gl`) + **OpenFreeMap** vector tiles (free, no key). Style: OpenFreeMap `liberty`, recoloured at load to Google Maps' light palette (`lib/google-map-style.ts`; land `#f5f3ef`, water `#aadaff`, white roads, amber motorways, flat grey buildings). Map controls are Google-style light; the pin card stays dark. (Originally the dark style.)
- Placement: 4th bottom tab — **Days | Locations | Stays | Map**. Route `#/map`.
- Pin tap: rich bottom card.
- Offline: SW caches viewed map resources, capped ~50 MB (entry-count cap), oldest evicted.

## Route + navigation

- `lib/parse-hash.ts`: add `{ view: "map" }` for `#/map`.
- `components/BottomNav.tsx`: 4 tabs (🗓️ Days, 📍 Locations, 🏨 Stays, 🗺️ Map); each tab ≥ 44px, fits 360px width.
- Map view full-bleed between top (safe area) and bottom nav; no page scroll on map tab.

## Loading / bundle

- `components/views/MapView.tsx` loaded via dynamic import (`next/dynamic`, `ssr: false`) only when `#/map` active.
- `maplibre-gl` + its CSS imported only inside the map module → other views' bundle unchanged.
- Global constraint updated: `maplibre-gl` allowed (map view only).

## Pins

- One HTML marker per location (`maplibregl.Marker` with custom element): Google-style teardrop (anchor bottom) with the emoji in a white circle; **place** = red `#ea4335`, **area** = larger, darker `#b31412`. Tap target ≥ 44px.
- Selected pin: scaled + accent ring.
- Markers diffed by id on data/filter change (add/remove/update), not rebuilt every render.
- Initial camera: fit bounds of visible pins (padding 48px, maxZoom 15); none → Tokyo (35.68, 139.76) zoom 10. Camera (center/zoom) remembered in module memory for the session; returning to tab restores it instead of re-fitting.

## Category filter

- Horizontal scroll chip row overlaid at top (below safe area): **All**, each category (`emoji name`), **Uncategorized** (only if any). Single-select. Filter is pure/client-side.
- Pure helper `filterByCategory(locations, selection)` where selection = `"all" | "none" | <category_id>`.
- If selected category is deleted → fall back to All.

## Details card

- Tap pin → `Sheet` (existing, history-aware; back gesture closes). Content:
  - emoji, name, Area/Place chip, category, city
  - description (pre-wrap)
  - **Planned on**: list from pure `plannedOn(data, locationId)` → `{ day, time }[]` sorted by date then time ("Thu 9 Oct · 14:00", untimed "Thu 9 Oct · Anytime"); tap row → `navigate("/day/<id>")`. Empty → "Not planned yet".
  - Area: "Places here" list (emoji + name), tap → select that pin (fly to + swap card).
  - Place with parent: "In <area>" link → select area.
  - Buttons: 📍 Google Maps (`MapsButton`), "Open details" → `navigate("/location/<id>")`.

## My location

- Floating ◎ button bottom-right above nav (44px).
- Tap → `navigator.geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 })` → blue dot marker (pulsing ring, CSS only) + `flyTo` zoom ≥ 14. Button shows busy state.
- Errors → toast: denied "Location permission denied — enable it in Settings"; unavailable/timeout "Couldn't get your location". Unsupported → button hidden.
- No continuous watch (battery/data).

## Offline / data

- `public/sw.js`: requests to `tiles.openfreemap.org` (style JSON, tiles, glyphs, sprites) → cache-first in `map-v1` cache; store only `ok` CORS responses (not opaque); cache writes via `event.waitUntil`, never block response. Bump SW VERSION; keep `map-v1` across SW version bumps (don't purge on activate).
- Cap: max 2500 entries (~50 MB at ~20 KB avg); after put, trim oldest (insertion order via `cache.keys()`) when over cap. Trim logic as pure function (keys list → keys to delete) in `public/sw-map-cache.js`, loaded by `sw.js` via `importScripts` and exported for Node tests (`if (typeof module !== "undefined") module.exports = ...`); add it to the proxy matcher public list.
- Offline with uncached area → blank tiles; pins/card still work (data from IndexedDB). Show small "Map offline — showing saved areas" hint when `!online`.
- Attribution: compact MapLibre attribution control (OpenFreeMap / © OpenStreetMap), required by license.

## Error handling

- Map style load failure (offline first time) → overlay message "Map unavailable offline — open once online to save map data", pins list fallback not needed.
- WebGL unsupported → message "This device can't show the map".

## Testing

- Unit (Vitest): `filterByCategory`, `plannedOn` (sorting, timed/untimed, areas only count direct items), `boundsFor(locations)` (empty/single/many), `parseHash("#/map")`, SW cache trim helper.
- Manual (phone): pins render + tap card, filter, ◎ permission flow, back gesture closes card, revisit area offline in airplane mode, other tabs' bundle unchanged (build output).

## Out of scope

- Clustering (trip scale < ~300 pins), routing/directions (Google Maps button covers it), pre-download button, live location tracking.
