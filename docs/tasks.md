# Implementation Tasks — Japan Trip Planner

Spec: `plan.md` (repo root). This file = build order. Each task self-contained; read the spec section it names when told to.

## Global Constraints

- Next.js latest (App Router, TypeScript strict, `src/` NOT used — code at repo root), Tailwind CSS, npm.
- Package manager npm. Tests: Vitest (`npm test` = `vitest run`). Lint: `npm run lint`. Build must pass: `npm run build`.
- Dark theme only. Palette: bg `zinc-950`, cards `zinc-900`, borders `zinc-800`, text `zinc-100`/`zinc-400`, accent `red-500`, notes `amber`, destructive `red-600`.
- Mobile first: body text ≥ 16px, tap targets ≥ 44px (`min-h-11`), layout column `max-w-md mx-auto`, no horizontal scroll, safe-area insets.
- No extra runtime deps beyond: `next`, `react`, `react-dom`, `@supabase/supabase-js` (server only), `jose`, `idb-keyval`. No UI kits, icon libs, date libs, web fonts (system font stack). Map lib `maplibre-gl` allowed only in `components/map/*` (lazy-loaded by `MapView`).
- Supabase accessed ONLY server-side with service role key (`import 'server-only'`). Browser never imports supabase-js.
- DB/JSON field names `snake_case` everywhere (types mirror DB columns).
- Single page app: `app/page.tsx` renders client `<App/>`; views switched by hash routes (`#/`, `#/day/<id>`, `#/locations`, `#/location/<id>`, `#/categories`, `#/stays`). Only other page: `app/login/page.tsx`.
- Every delete goes through `ConfirmDeleteDialog`; user must type exactly `delete me`. Server DELETE endpoints reject unless JSON body `{"confirm":"delete me"}`.
- Server logs: structured JSON via `lib/logger.ts` only (fields `@timestamp`, `level`, constant `message`, `service`="trip-planner", `env`, `request_id`, `logger`, extra fields snake_case). Never log password, cookie, JWT, service key. Errors logged once at route boundary with error object. No `console.log` elsewhere in server code.
- Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_PASSWORD_HASH` (`<salt_hex>:<hash_hex>` scrypt, keylen 64), `SESSION_SECRET` (≥ 32 chars). Provide `.env.example`.
- Commit after each task, Conventional Commits, concise.

## Shared types (`lib/types.ts`, created in Task 2 — exact)

```ts
export type LocationType = "area" | "place";
export interface Category { id: string; name: string; emoji: string | null }
export interface Location {
  id: string; type: LocationType; parent_id: string | null; category_id: string | null;
  name: string; description: string | null; emoji: string; city: string; lat: number; lng: number;
}
export interface Stay { id: string; location_id: string; name: string; airbnb_url: string; check_in: string; check_out: string } // dates "YYYY-MM-DD"
export interface Day { id: string; date: string; title: string | null; note: string | null }
export interface DayItem { id: string; day_id: string; location_id: string | null; time: string | null; position: number; note: string | null } // time "HH:MM" or null
export interface TripData { version: number; categories: Category[]; locations: Location[]; stays: Stay[]; days: Day[]; items: DayItem[] }
export type Resource = "categories" | "locations" | "stays" | "days" | "items";
```

## HTTP API contract (implemented Task 4, consumed Task 5+)

- `GET /api/data` → `200` `TripData` + header `ETag: "v<version>"`, `Cache-Control: private, no-cache`; `If-None-Match` equal → `304` empty.
- `POST /api/<resource>` JSON body (fields of type minus `id`) → `201 {"row": <T>, "version": n}`
- `PATCH /api/<resource>/<id>` partial body → `200 {"row": <T>, "version": n}`
- `DELETE /api/<resource>/<id>` body `{"confirm":"delete me"}` → `200 {"version": n}`; wrong/missing confirm → `400`
- `POST /api/items/reorder` `{"day_id": string, "ids": string[]}` → `200 {"version": n}` (sets position = index)
- `POST /api/login` `{"password"}` → `204` + session cookie, wrong → `401`; `POST /api/logout` → `204` clears cookie
- Errors: `{"error": "<human message>"}` with 400 validation / 401 unauth / 404 / 409 conflict (stay overlap, duplicate category name, duplicate day date) / 500.
- All `/api/*` except `/api/login` require valid session (401 JSON, not redirect).

## Task 1: Scaffold project

- Run `npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm` (repo has only `plan.md`, `docs/`, `.git`; keep them). Turbopack default fine.
- Add Vitest (`vitest`, dev) + `npm test` script; one trivial sanity test is NOT wanted — leave tests to later tasks, but config must work (`vitest.config.ts`, node env, `@/` alias).
- Remove boilerplate (sample page content, public svgs, next/font usage). Use system font stack.
- `app/layout.tsx`: `<html lang="en" className="dark">`, body `bg-zinc-950 text-zinc-100 antialiased`, metadata title "Japan Trip", `viewport` export: `width=device-width, initial-scale=1, viewport-fit=cover, themeColor #09090b`.
- `app/globals.css`: Tailwind import, `color-scheme: dark`, base font-size 16px, `-webkit-tap-highlight-color: transparent`, utility classes for safe areas: `.pb-safe { padding-bottom: env(safe-area-inset-bottom) }`, `.pt-safe { padding-top: env(safe-area-inset-top) }`.
- `app/page.tsx`: placeholder text "Japan Trip" (replaced in Task 5).
- `next.config.ts`: `poweredByHeader: false`, `compress: true`.
- `.env.example` with the 4 env vars (empty values) + comments. Ensure `.env*.local` gitignored and `.superpowers/` gitignored.
- Verify: `npm run lint`, `npm test` (passes with no tests: use `vitest run --passWithNoTests`), `npm run build`.

## Task 2: Database migration + server libs

Files: `supabase/migrations/0001_init.sql`, `lib/types.ts` (exact from above), `lib/supabase.ts`, `lib/logger.ts`, `lib/validation.ts`, `lib/validation.test.ts`, `lib/logger.test.ts`.

- SQL (read spec `plan.md` → "Data model" for columns): `location_type` enum; tables `categories` (name unique), `locations`, `stays`, `days` (date unique), `day_items`; `btree_gist` extension; stays exclusion constraint on `daterange(check_in, check_out, '[)')`; checks: area has no parent, `check_out > check_in`, `day_items` needs `location_id` or `note`; trigger: `parent_id` must reference an `area`; FKs: `locations.parent_id on delete cascade`, `locations.category_id on delete set null`, `stays.location_id on delete cascade`, `day_items.day_id on delete cascade`, `day_items.location_id on delete cascade`. `created_at`/`updated_at timestamptz default now()` + `updated_at` trigger on all tables. `data_version` table (single row `id int primary key default 1 check (id=1)`, `version bigint not null`), seeded with 0; statement-level AFTER INSERT/UPDATE/DELETE trigger on all 5 tables bumps it. Enable RLS on all 6 tables, NO policies. Indexes on FKs. Idempotent where cheap (`if not exists`).
- `lib/supabase.ts`: `import "server-only"`; lazy singleton `db()` returning supabase-js client from env with `auth: { persistSession: false, autoRefreshToken: false }`; throws clear error if env missing.
- `lib/logger.ts`: `createLogger(name)` → `{ debug, info, warn, error }(message: string, fields?: Record<string, unknown>, err?: unknown)` writing one JSON line via `console.log`/`console.error`; required fields per Global Constraints; `debug` suppressed when `NODE_ENV === "production"`; errors serialize `error_name`, `error_message`, `error_stack`; `request_id` passed in fields. Test the JSON shape + debug suppression.
- `lib/validation.ts` (pure, no deps; returns `{ ok: true, value } | { ok: false, error: string }`): `validateCategory`, `validateLocation`, `validateStay`, `validateDay`, `validateItem` — each takes `unknown` + `mode: "create" | "update"` (update = partial, at least one field); trims strings, empty → null for nullable; rules: names non-empty ≤ 120 chars; lat ∈ [-90,90], lng ∈ [-180,180] numbers; `type` enum; area must have `parent_id` null; time `^([01]\d|2[0-3]):[0-5]\d$` or null; dates `YYYY-MM-DD` valid; `check_out > check_in`; airbnb_url must be `https:` with hostname `airbnb.com` or ending `.airbnb.<tld>` / `airbnb.<tld>` (e.g. `www.airbnb.com`, `airbnb.jp`, `abnb.me` short links also allowed); item needs `location_id` or non-empty `note` (create). Also export `isAirbnbUrl(url: string): boolean` (used by client in Task 8) and `isDeleteConfirmed(body: unknown): boolean` (exact `"delete me"`). Strip unknown keys. Thorough table tests.

## Task 3: Auth (14-day session)

Files: `lib/session.ts`, `lib/password.ts`, `scripts/hash-password.mjs`, `app/api/login/route.ts`, `app/api/logout/route.ts`, `app/login/page.tsx`, request gate (`proxy.ts` if Next ≥ 16 — check installed version and its docs in `node_modules/next/dist/docs` or context7; else `middleware.ts`), tests for session + password.

- `lib/password.ts` (node runtime): `hashPassword(pw)` → `salt:hash` hex (scrypt, 16-byte salt, keylen 64); `verifyPassword(pw, stored)` timing-safe.
- `scripts/hash-password.mjs` + npm script `hash-password`: reads password from argv or prompt, prints hash line. No deps.
- `lib/session.ts` (edge-safe, `jose`): cookie name `trip_session`; `createSessionToken()` HS256, `exp` = now + 14 days; `verifySessionToken(token)` → boolean; `sessionCookieOptions` = `{ httpOnly: true, secure: production, sameSite: "lax", path: "/", maxAge: 14*24*3600 }`.
- `POST /api/login`: validates body, verifies against `APP_PASSWORD_HASH`; on failure wait ~800 ms then 401 `{"error":"Wrong password"}`; success → set cookie, 204. Logs `login_failed` / `login_succeeded` (no password).
- `POST /api/logout`: clear cookie, 204.
- Gate: matcher everything except `_next/static`, `_next/image`, `favicon.ico`, `icon.svg`, `manifest.webmanifest`, `sw.js`, `/login`, `/api/login`. Invalid session → `/api/*` returns 401 JSON; pages redirect to `/login`.
- `app/login/page.tsx`: client page, mobile-friendly centered card: title "🇯🇵 Japan Trip", password input (`autocomplete="current-password"`, 16px), big submit button, error text, on success `location.replace("/")`.
- Tests: session create/verify/expired/tampered; password hash/verify/wrong.

## Task 4: Data API

Files: `lib/etag.ts` (+ test), `lib/resources.ts` (+ test for pure parts), `app/api/data/route.ts`, `app/api/[resource]/route.ts`, `app/api/[resource]/[id]/route.ts`, `app/api/items/reorder/route.ts`, `lib/api-handler.ts`.

- `lib/etag.ts`: `etagFor(version)` → `"v<version>"`; `matchesEtag(ifNoneMatch: string | null, version)` handles `W/` prefix and comma lists.
- `GET /api/data`: read `data_version.version` first; if `If-None-Match` matches → 304 (no table reads). Else read all 5 tables (only columns in types, order: categories by name, locations by name, stays by check_in, days by date, items by position) in parallel, return `TripData`. Headers per API contract. Note: a write between version read and table reads is acceptable (next sync catches it).
- `lib/resources.ts`: map `Resource` → `{ table, columns, validate }` (table for `items` = `day_items`). Unknown resource → 404.
- Generic POST / PATCH / DELETE routes per API contract using validators from Task 2. Map Postgres errors: `23505` unique → 409, `23P01` exclusion (stay overlap) → 409 "Stay dates overlap another stay", `23503` FK → 400, `23514`/`P0001` check/trigger → 400. Return row with only typed columns; `version` = re-read `data_version` after write. `time` from Postgres `HH:MM:SS` → normalize to `HH:MM` in responses (both here and in `/api/data`).
- `lib/api-handler.ts`: wrapper giving each route a `request_id` (header `x-vercel-id` or `crypto.randomUUID()`), JSON parsing errors → 400, unexpected errors → log once + 500 `{"error":"Something went wrong"}`.
- `POST /api/items/reorder`: validate, update positions for given ids belonging to `day_id`.
- `export const dynamic = "force-dynamic"` on API routes.
- Tests: etag; resources lookup; Postgres error mapping; time normalization. (No live DB in tests.)

## Task 5: Client store, router, app shell

Files: `lib/store.ts`, `lib/cascade.ts` (+ test), `lib/selectors.ts` (+ test), `lib/router.ts` (+ test for parse), `lib/api-client.ts`, `components/App.tsx`, `components/BottomNav.tsx`, `components/Header.tsx`, `components/OfflineBadge.tsx`, `components/Toast.tsx`, `app/page.tsx`.

- `lib/store.ts` (client): module-level store + `useSyncExternalStore` hook `useTrip()` → `{ data: TripData | null, online: boolean, loading: boolean }`. On start: hydrate from IndexedDB (`idb-keyval`, key `trip-data-v1`) then `sync()`. `sync({ force })`: skip if offline or last sync < 5 min (unless force); `fetch("/api/data", { headers: { "If-None-Match": etag } })`; 304 → keep; 200 → replace + persist; 401 → `location.replace("/login")`. Triggers: start, `visibilitychange` → visible, `online` event. Track `online` via `navigator.onLine` + events.
- `lib/api-client.ts`: `create(resource, body)`, `update(resource, id, body)`, `remove(resource, id)` (sends confirm phrase), `reorderItems(dayId, ids)`, `logout()`. Each throws `Error(message from {error})`; on success applies result to store (upsert row / `pruneDeleted` / reorder positions), sets version, persists. Writes refused with error "You're offline" when offline. No optimistic updates (apply on server success).
- `lib/cascade.ts`: pure `pruneDeleted(data, resource, id): TripData` mirroring DB cascades exactly: category → locations get `category_id: null`; location → if area also its places; then stays + items referencing any removed location; day → its items; stay/item → itself.
- `lib/selectors.ts` (pure): `itemsForDay(data, dayId)` → `{ timed: DayItem[] (by time asc), anytime: DayItem[] (by position asc) }`; `stayForNight(data, date)` (check_in ≤ date < check_out) + `nightIndex` ("Night 2 of 4"); `checkoutOn(data, date)`; `placesInArea(data, areaId)`; `locationById`, `categoryById`; `deleteImpact(data, resource, id)` → counts for confirm dialog text (e.g. places, day items, stays, locations uncategorized); `todayISO()` local date; `filterLocations(data, { query, type, city, category_id })` case-insensitive over name/city/description.
- `lib/router.ts`: `parseHash(hash)` → `{ view: "days" } | { view: "day", id } | { view: "locations" } | { view: "location", id } | { view: "categories" } | { view: "stays" }` (unknown → days); `useRoute()` hook listening to `hashchange`; `navigate(path)` sets `location.hash`. Scroll to top on view change.
- `components/App.tsx` ("use client"): renders current view (placeholders "Coming soon" for views built later — Tasks 7–9 replace), `BottomNav` (Days | Locations | Stays, emoji + label, active state, fixed bottom, `pb-safe`, ≥ 56px tall), `OfflineBadge` (small amber pill when offline: "Offline — view only"), Toast provider (`useToast().show(msg, kind)`, auto-hide 2.5 s, above bottom nav). Loading state when no data yet: simple skeleton. Main content padded so bottom nav never covers content.
- `components/Header.tsx`: sticky top, `pt-safe`, optional back button (`history.back()`, 44px), title (truncate), optional right action slot.
- Tests: cascade (each resource incl. area→places→items/stays chain), selectors (sorting, stay night boundaries incl. checkout day not counted, filter), parseHash.

## Task 6: Shared UI components + maps lib

Files: `lib/maps.ts` (+ test), `components/ui/Sheet.tsx`, `components/ui/ConfirmDeleteDialog.tsx`, `components/ui/MapsButton.tsx`, `components/ui/AirbnbButton.tsx`, `components/ui/fields.tsx`, `components/ui/Button.tsx`, `components/ui/EmptyState.tsx`, `components/LocationPicker.tsx`.

- `lib/maps.ts`: `mapsUrl(lat, lng)` → `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`; `parseLatLng(input)` → `{ lat, lng } | null` from: plain `35.6, 139.7`, Google Maps URLs with `@lat,lng,zoom`, `?q=lat,lng`, `query=lat,lng`, `!3dlat!4dlng` (prefer `!3d!4d` when present — that's the place pin). Validate ranges.
- `Sheet`: bottom sheet (fixed bottom, rounded top, max-h 90dvh, scrollable body, sticky footer slot for primary action, `pb-safe`), backdrop tap / Escape closes, focus first input, locks body scroll, `role="dialog" aria-modal`.
- `ConfirmDeleteDialog`: props `{ open, title, impact?: string, onConfirm: () => Promise<void>, onClose }`; text input placeholder `delete me`, `autocapitalize="off" autocorrect="off"`; red Delete button disabled until value === `delete me`; shows spinner/disabled while running; shows error message from thrown error.
- `MapsButton`: anchor to `mapsUrl`, `target="_blank" rel="noopener"`, "📍 Maps" label variant + compact icon variant, 44px.
- `AirbnbButton`: anchor to stay URL, label "Open in Airbnb".
- `fields.tsx`: `TextField`, `TextArea`, `SelectField`, `DateField`, `TimeField` (with "clear" button → null), `NumberField` (`inputmode="decimal"`) — label above, 16px text, full width, dark styles, error text.
- `Button`: variants primary (red-500) / secondary (zinc-800) / danger (red-600) / ghost; `min-h-11`; disabled styles; `loading` prop.
- `EmptyState`: emoji, text, optional CTA button.
- `LocationPicker` (uses store): search input (autofocus), chips filter All/Areas/Places, list rows (emoji, name, city, area name for places, type chip), tap → `onPick(location)`. Optional `filter` prop.
- Tests: `lib/maps.ts` only (components verified by build + manual).

## Task 7: Categories + Locations views

Files: `components/views/CategoriesView.tsx`, `components/views/LocationsView.tsx`, `components/views/LocationDetailView.tsx`, `components/forms/CategoryForm.tsx`, `components/forms/LocationForm.tsx`, `components/LocationRow.tsx`; wire into `App.tsx`.

- Categories (`#/categories`, reached from Locations header button "🏷️"): list (emoji + name + location count), tap → edit sheet (name, emoji), "+" → create sheet, delete in edit sheet → ConfirmDeleteDialog with impact "N locations will become uncategorized".
- Locations (`#/locations`): header title "Locations", actions: 🏷️ categories, "+" new. Search box + filter chips (All / Areas / Places) + city select + category select (all client-side via `filterLocations`). Rows (`LocationRow`): emoji, name, city · category, area name for places, type chip, compact MapsButton; tap → `#/location/<id>`. EmptyState when none.
- Location detail (`#/location/<id>`): big emoji + name, type chip, city, category, description, big MapsButton, Edit + Delete buttons (delete impact from `deleteImpact`: places, day items, stays). Area: "Places in this area" list (LocationRow) + "+ Add place here" (form prefilled type=place, parent, city). Place: link to parent area. Missing id → EmptyState "Not found" + back. After delete → `history.back()`.
- `LocationForm` sheet: type segmented control (Area / Place; locked when editing an area that has places), parent area select (places only, optional), name, description, category select (+ "New category…" opens CategoryForm inline then selects it), emoji (text input, maxLength 8, default from category emoji else 📍), city (datalist of existing cities), "Paste Google Maps link or coordinates" field → `parseLatLng` fills lat/lng (show ✓), lat, lng. Client-side required checks; server errors shown.
- All write buttons disabled when offline.

## Task 8: Stays view

Files: `components/views/StaysView.tsx`, `components/forms/StayForm.tsx`; wire into `App.tsx`.

- `#/stays`: header "Stays", "+" action. List sorted by check-in: card with emoji of location, name, `Fri 10 Oct → Mon 13 Oct · 3 nights` (`Intl.DateTimeFormat`), location city, MapsButton (location lat/lng) + AirbnbButton. Current stay (today within) highlighted with "Now" chip. Tap card → edit sheet.
- `StayForm` sheet: location (opens LocationPicker; shows chosen), name (prefilled from location name when empty), Airbnb link (required, validated client-side with same rule as server — import shared `isAirbnbUrl` from `lib/validation.ts`), check-in date, check-out date (must be after). Server 409 overlap → show error. Delete in edit sheet → ConfirmDeleteDialog.

## Task 9: Days views

Files: `components/views/DaysView.tsx`, `components/views/DayDetailView.tsx`, `components/forms/DayForm.tsx`, `components/forms/ItemForm.tsx`, `components/DayItemRow.tsx`, `components/HotelCard.tsx`; wire into `App.tsx`.

- `#/` Days: header "Days", "+" new day. List by date: card shows weekday + date, title, hotel name for that night (`stayForNight`), item count; today's card highlighted "Today"; on first render scroll today's card into view (or next upcoming); sticky "Today" chip if today exists. EmptyState "No days yet" + CTA.
- `DayForm` sheet: date (required, unique — 409 shown), title, note. Edit + delete (impact: N items) from day detail header menu.
- `#/day/<id>` Day detail: header (back, "Thu 9 Oct", edit action). Top: title, day note (amber callout if present), `HotelCard` (tonight's stay: name, "Night 2 of 4", MapsButton, AirbnbButton; plus "Check out: <name>" line when `checkoutOn` this date). Sections "Timed" and "Anytime" with headings (hide empty section; EmptyState when both empty). `DayItemRow`: time (timed), emoji, name, city, compact MapsButton; note under it as amber callout with ⚠️; note-only item: 📝 + note text; area item: chevron toggles inline list of its places (each with emoji, name, MapsButton). Tap row → `ItemForm` edit sheet. Anytime rows have ↑/↓ buttons (call `reorderItems`). Bottom "+ Add" button opens sheet with two options: "📍 Location" or "📝 Note".
- `ItemForm` sheet: location mode (LocationPicker → chosen location shown, change link), time (optional, clearable), note textarea ("Transport, weather warnings…" placeholder); note mode: note (required) + time optional. New untimed item position = max anytime position + 1. Delete item in edit sheet → ConfirmDeleteDialog. Logout button at bottom of Days view (small, ghost).

## Task 10: PWA + docs

Files: `app/manifest.ts`, `app/icon.svg`, `public/sw.js`, `components/RegisterSW.tsx` (mounted in `App`), `README.md`.

- Manifest: name "Japan Trip", short_name "Trip", `display: "standalone"`, `background_color`/`theme_color` `#09090b`, start_url `/`, icons → `/icon.svg` (`sizes: "any"`, purpose any maskable). `app/icon.svg`: 🇯🇵-style simple red circle on dark rounded square (pure SVG, < 1 KB).
- `public/sw.js` (no deps, versioned cache names): install → cache `/` + `/login`; `/_next/static/*` → cache-first; navigations (`mode === "navigate"`) for `/` → stale-while-revalidate (fallback cached `/` offline); `/api/*` → never cached by SW (network only; store handles offline); other GET same-origin → network-first fallback cache. Activate → delete old caches, `clients.claim()`. Skip non-GET.
- `RegisterSW`: register `/sw.js` in production only.
- Headers in `next.config.ts`: `/sw.js` → `Cache-Control: no-cache`, `Service-Worker-Allowed: /`.
- `README.md`: setup (Supabase: run migration in SQL editor; Vercel env vars; `npm run hash-password`; generate `SESSION_SECRET` with `openssl rand -base64 32`), local dev, deploy to Vercel, add to home screen on iPhone/Android, data-saving notes. Concise.
- Verify `npm run build` + `npm test` + `npm run lint`.
