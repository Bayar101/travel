import { describe, expect, it } from "vitest";
import { acceptFetched, finishSync, IDLE_GATE, lastSyncAfter, planWrite, requestSync, showLoadError, startupStamp, SYNC_THROTTLE_MS } from "./sync-logic";

const req = { force: false, online: true, lastSync: 0, now: 10_000_000, minMs: 300_000 };

describe("planWrite", () => {
  it("adopts version when exactly +1", () => {
    expect(planWrite(5, 6)).toEqual({ version: 6, refetch: false });
  });
  it("keeps local version and refetches on gap", () => {
    expect(planWrite(5, 8)).toEqual({ version: 5, refetch: true });
    expect(planWrite(5, 5)).toEqual({ version: 5, refetch: true });
  });
});

describe("acceptFetched", () => {
  it("accepts when no local data", () => {
    expect(acceptFetched(null, 1, false)).toBe(true);
    expect(acceptFetched(null, 1, true)).toBe(true);
  });
  it("without write activity accepts any version, even backwards (DB recreated)", () => {
    expect(acceptFetched(50, 3, false)).toBe(true);
    expect(acceptFetched(5, 9, false)).toBe(true);
  });
  it("during a write race accepts equal or newer, ignores stale", () => {
    expect(acceptFetched(5, 5, true)).toBe(true);
    expect(acceptFetched(5, 9, true)).toBe(true);
    expect(acceptFetched(6, 5, true)).toBe(false);
  });
});

describe("requestSync / finishSync", () => {
  it("starts when idle and due", () => {
    expect(requestSync(IDLE_GATE, req)).toEqual({ gate: { running: true, queuedForce: false }, start: true });
  });
  it("skips offline and recent non-forced", () => {
    expect(requestSync(IDLE_GATE, { ...req, online: false }).start).toBe(false);
    expect(requestSync(IDLE_GATE, { ...req, lastSync: req.now - 1000 }).start).toBe(false);
    expect(requestSync(IDLE_GATE, { ...req, lastSync: req.now - 1000, force: true }).start).toBe(true);
  });
  it("queues one follow-up when forced during a run", () => {
    const running = { running: true, queuedForce: false };
    const a = requestSync(running, { ...req, force: true });
    expect(a).toEqual({ gate: { running: true, queuedForce: true }, start: false });
    const b = requestSync(a.gate, { ...req, force: true });
    expect(b.gate.queuedForce).toBe(true);
    expect(finishSync(b.gate)).toEqual({ gate: IDLE_GATE, followUp: true });
  });
  it("does not queue for non-forced during a run", () => {
    const running = { running: true, queuedForce: false };
    expect(requestSync(running, req).gate).toEqual(running);
    expect(finishSync(running).followUp).toBe(false);
  });
});

describe("throttle (SYNC_THROTTLE_MS)", () => {
  const now = 10_000_000;
  const due = (stamp: { at: number }, t: number) =>
    requestSync(IDLE_GATE, { force: false, online: true, lastSync: stamp.at, now: t, minMs: SYNC_THROTTLE_MS }).start;

  it("after a successful sync, focus/route syncs wait 30 s", () => {
    const ok = lastSyncAfter(startupStamp(now), true, now);
    expect(due(ok, now + 10_000)).toBe(false);
    expect(due(ok, now + 29_999)).toBe(false);
    expect(due(ok, now + 30_000)).toBe(true);
  });
  it("startup stamp throttles early syncs before the forced startup sync", () => {
    expect(due(startupStamp(now), now + 1000)).toBe(false);
  });
  it("failed startup sync does not block the next retry", () => {
    const failed = lastSyncAfter(startupStamp(now), false, now + 500);
    expect(due(failed, now + 1000)).toBe(true);
  });
  it("a failure after a success keeps the success time (no retry storm)", () => {
    const ok = lastSyncAfter(startupStamp(now), true, now);
    const failed = lastSyncAfter(ok, false, now + 5000);
    expect(failed).toEqual(ok);
    expect(due(failed, now + 10_000)).toBe(false);
  });
});

describe("showLoadError", () => {
  const base = { data: null, loading: false, error: false, online: true };
  it("offline with empty cache shows error even without a failed fetch", () => {
    expect(showLoadError({ ...base, online: false })).toBe(true);
  });
  it("shows on failed fetch, not while loading or with data", () => {
    expect(showLoadError({ ...base, error: true })).toBe(true);
    expect(showLoadError({ ...base, loading: true, online: false })).toBe(false);
    expect(showLoadError({ ...base, data: {}, error: true })).toBe(false);
    expect(showLoadError(base)).toBe(false);
  });
});
