# Japan Trip Planner

Personal mobile-first trip planner. Next.js SPA (hash routes), Supabase (server-side only), single shared password, PWA with offline read-only.

## Setup

1. Supabase: create project, open SQL editor, run `supabase/migrations/0001_init.sql`.
2. `cp .env.example .env.local` and fill:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Project settings > API; service key stays server-side)
   - `APP_PASSWORD_HASH`: run `npm run hash-password` (prompts for password), paste output value
   - `SESSION_SECRET`: `openssl rand -base64 32`
3. `npm install`, then `npm run dev` (http://localhost:3000).

Scripts: `npm test`, `npm run lint`, `npm run build`.

## Deploy (Vercel)

Import repo, add the 4 env vars above (Production), deploy.

## Install on phone

- iPhone: open in Safari > Share > Add to Home Screen.
- Android: Chrome menu > Install app / Add to Home screen.

The service worker only runs in production builds (deployed site or `npm run build && npm start`).

## Data saving / offline

- Hashed `/_next/static/*` assets are cached forever; repeat visits transfer ~0 bytes of assets.
- Trip data is stored in IndexedDB. Each launch sends one conditional `GET /api/data` (`If-None-Match`); unchanged returns `304` with no body.
- Offline: app opens from cache and shows data read-only; editing needs a connection.
- `/api/*` is never cached by the service worker.
- After a deploy, the new version loads on the visit after next (cached page updates in background).
- Expired session: reload while online and log in again.
