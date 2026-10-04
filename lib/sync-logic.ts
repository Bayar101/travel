// Pure sync decisions (no React/IDB/browser) so they can be unit-tested.

/**
 * Version to store after a server-confirmed write. Exactly +1 means nothing else
 * changed: adopt it. Any other jump (cascades, reorder, other devices) means local
 * data may be missing changes: keep the old version so the forced refetch's
 * If-None-Match mismatches and returns 200 instead of 304.
 */
export function planWrite(
  localVersion: number,
  returnedVersion: number,
): { version: number; refetch: boolean } {
  return returnedVersion === localVersion + 1
    ? { version: returnedVersion, refetch: false }
    : { version: localVersion, refetch: true };
}

/**
 * Whether to adopt a fetched 200 snapshot. `writeRaced` = a write was in flight or
 * finished while the fetch ran: then a snapshot older than local data is stale (the
 * write landed after the server read) and is ignored. Otherwise the server is the
 * truth, even if its version went backwards (DB recreated).
 */
export function acceptFetched(
  localVersion: number | null,
  fetchedVersion: number,
  writeRaced: boolean,
): boolean {
  return localVersion === null || !writeRaced || fetchedVersion >= localVersion;
}

/** Min gap between non-forced syncs (route change, focus, visibility). A 304 costs ~200 B. */
export const SYNC_THROTTLE_MS = 30_000;

/** When the last sync succeeded. `confirmed: false` = provisional startup stamp (no fetch has succeeded yet). */
export interface SyncStamp {
  at: number;
  confirmed: boolean;
}

/** Startup: throttle early route/focus syncs while the forced startup sync is pending. */
export function startupStamp(now: number): SyncStamp {
  return { at: now, confirmed: false };
}

/**
 * Stamp after a sync attempt. Success records `now`. A failure keeps a confirmed stamp (normal
 * throttle), but clears a provisional one so a failed startup sync can be retried right away.
 */
export function lastSyncAfter(prev: SyncStamp, ok: boolean, now: number): SyncStamp {
  if (ok) return { at: now, confirmed: true };
  return prev.confirmed ? prev : { at: 0, confirmed: false };
}

export interface SyncGate {
  running: boolean;
  queuedForce: boolean;
}

export const IDLE_GATE: SyncGate = { running: false, queuedForce: false };

/** A sync was requested. `start` = begin a fetch now. Forced requests during a run queue one follow-up. */
export function requestSync(
  gate: SyncGate,
  req: { force: boolean; online: boolean; lastSync: number; now: number; minMs: number },
): { gate: SyncGate; start: boolean } {
  if (!req.online) return { gate, start: false };
  if (gate.running) {
    return { gate: req.force ? { ...gate, queuedForce: true } : gate, start: false };
  }
  if (!req.force && req.now - req.lastSync < req.minMs) return { gate, start: false };
  return { gate: { running: true, queuedForce: false }, start: true };
}

/** A sync finished. `followUp` = run one forced sync now. */
export function finishSync(gate: SyncGate): { gate: SyncGate; followUp: boolean } {
  return { gate: { running: false, queuedForce: false }, followUp: gate.queuedForce };
}

/** Show the load-error screen: nothing to display and loading can't (or didn't) succeed. */
export function showLoadError(s: {
  data: unknown;
  loading: boolean;
  error: boolean;
  online: boolean;
}): boolean {
  return !s.data && !s.loading && (s.error || !s.online);
}
