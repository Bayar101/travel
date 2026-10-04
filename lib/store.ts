"use client";

import { del, get, set } from "idb-keyval";
import { useEffect, useSyncExternalStore } from "react";
import { etagFor } from "./etag";
import { acceptFetched, finishSync, IDLE_GATE, lastSyncAfter, planWrite, requestSync, startupStamp, SYNC_THROTTLE_MS, type SyncGate, type SyncStamp } from "./sync-logic";
import type { TripData } from "./types";

const IDB_KEY = "trip-data-v1";

export interface TripState {
  data: TripData | null;
  online: boolean;
  loading: boolean;
  error: boolean; // first load failed and nothing cached
}

interface Persisted {
  data: TripData;
}

const SERVER_STATE: TripState = { data: null, online: true, loading: true, error: false };

let state: TripState = SERVER_STATE;
let started = false;
let lastSync: SyncStamp = { at: 0, confirmed: false };
let gate: SyncGate = IDLE_GATE;
let writesInFlight = 0;
let writeSeq = 0; // bumped when a write request settles
const listeners = new Set<() => void>();

function setState(patch: Partial<TripState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function persist(data: TripData): void {
  const value: Persisted = { data };
  set(IDB_KEY, value).catch(() => {});
}

/** Drop the offline copy (logout / new login: never show another session's data). */
export function clearCache(): Promise<void> {
  return del(IDB_KEY).catch(() => {});
}

export function isOnline(): boolean {
  return state.online;
}

export function getData(): TripData | null {
  return state.data;
}

/** Replace data (after a successful write) and persist. */
export function replaceData(data: TripData): void {
  setState({ data });
  persist(data);
}

/**
 * Apply a server-confirmed write. On a version gap the row change is applied but the
 * local version is kept, so the forced refetch gets a 200 (not 304).
 */
export function applyWrite(update: (d: TripData) => TripData, version: number): void {
  const cur = state.data;
  if (!cur) return;
  const plan = planWrite(cur.version, version);
  replaceData({ ...update(cur), version: plan.version });
  if (plan.refetch) void sync({ force: true });
}

/** Mark a write request in flight; call the returned fn when it settles. */
export function beginWrite(): () => void {
  writesInFlight++;
  return () => {
    writesInFlight--;
    writeSeq++;
  };
}

export function sync(opts: { force?: boolean } = {}): Promise<void> {
  const r = requestSync(gate, {
    force: !!opts.force,
    online: state.online,
    lastSync: lastSync.at,
    now: Date.now(),
    minMs: SYNC_THROTTLE_MS,
  });
  gate = r.gate;
  if (!r.start) return Promise.resolve();
  return run();
}

async function run(): Promise<void> {
  await doSync();
  const f = finishSync(gate);
  gate = f.gate;
  if (f.followUp) await sync({ force: true });
}

async function doSync(): Promise<void> {
  let redirecting = false;
  let ok = false;
  const seqAtStart = writeSeq;
  try {
    const headers: Record<string, string> = {};
    if (state.data) headers["If-None-Match"] = etagFor(state.data.version);
    const res = await fetch("/api/data", { headers });
    if (res.status === 401) {
      redirecting = true;
      window.location.replace("/login");
      return;
    }
    ok = res.status === 200 || res.status === 304;
    if (res.status === 200) {
      const fetched = (await res.json()) as TripData;
      const raced = writesInFlight > 0 || writeSeq !== seqAtStart;
      if (acceptFetched(state.data?.version ?? null, fetched.version, raced)) replaceData(fetched);
    }
  } catch {
    // network failure: keep cached data
  } finally {
    lastSync = lastSyncAfter(lastSync, ok, Date.now());
    if (!redirecting) setState({ error: !state.data });
  }
}

function onVisibility(): void {
  if (document.visibilityState === "visible") void sync();
}

function onFocus(): void {
  void sync();
}

function onOnline(): void {
  setState({ online: true });
  void sync();
}

function onOffline(): void {
  setState({ online: false });
}

async function start(): Promise<void> {
  if (started) return;
  started = true;
  lastSync = startupStamp(Date.now()); // startup forces its own sync below; throttle early route/focus syncs
  setState({ online: navigator.onLine });
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("focus", onFocus);
  try {
    const saved = await get<Persisted>(IDB_KEY);
    if (saved?.data && !state.data) setState({ data: saved.data });
  } catch {
    // IndexedDB unavailable: fall through to network
  }
  setState({ loading: false });
  await sync({ force: true });
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useTrip(): TripState {
  useEffect(() => {
    void start();
  }, []);
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}
