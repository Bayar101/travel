import { describe, expect, it } from "vitest";
import { acceptFetched, finishSync, IDLE_GATE, planWrite, requestSync, showLoadError } from "./sync-logic";

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
  it("accepts when no local data, equal or newer", () => {
    expect(acceptFetched(null, 1)).toBe(true);
    expect(acceptFetched(5, 5)).toBe(true);
    expect(acceptFetched(5, 9)).toBe(true);
  });
  it("ignores stale snapshots", () => {
    expect(acceptFetched(6, 5)).toBe(false);
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
