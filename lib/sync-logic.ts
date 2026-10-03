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

/** Ignore a fetched snapshot older than local data (a write landed meanwhile). */
export function acceptFetched(localVersion: number | null, fetchedVersion: number): boolean {
  return localVersion === null || fetchedVersion >= localVersion;
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
