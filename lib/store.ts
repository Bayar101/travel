"use client";

import { get, set } from "idb-keyval";
import { useEffect, useSyncExternalStore } from "react";
import { etagFor } from "./etag";
import type { TripData } from "./types";

const IDB_KEY = "trip-data-v1";
const MIN_SYNC_MS = 5 * 60 * 1000;

export interface TripState {
  data: TripData | null;
  online: boolean;
  loading: boolean;
}

interface Persisted {
  data: TripData;
  etag: string;
}

const SERVER_STATE: TripState = { data: null, online: true, loading: true };

let state: TripState = SERVER_STATE;
let started = false;
let lastSync = 0;
let syncing: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(patch: Partial<TripState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function persist(data: TripData): void {
  const value: Persisted = { data, etag: etagFor(data.version) };
  set(IDB_KEY, value).catch(() => {});
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
 * Apply a server-confirmed write. If the returned version isn't exactly the next
 * one, other changes happened elsewhere: force a refetch to catch up.
 */
export function applyWrite(update: (d: TripData) => TripData, version: number): void {
  const cur = state.data;
  if (!cur) return;
  replaceData({ ...update(cur), version });
  if (version !== cur.version + 1) void sync({ force: true });
}

export function sync(opts: { force?: boolean } = {}): Promise<void> {
  if (syncing) return syncing;
  if (!state.online) return Promise.resolve();
  if (!opts.force && Date.now() - lastSync < MIN_SYNC_MS) return Promise.resolve();
  syncing = doSync().finally(() => {
    syncing = null;
  });
  return syncing;
}

async function doSync(): Promise<void> {
  try {
    const headers: Record<string, string> = {};
    if (state.data) headers["If-None-Match"] = etagFor(state.data.version);
    const res = await fetch("/api/data", { headers });
    if (res.status === 401) {
      window.location.replace("/login");
      return;
    }
    lastSync = Date.now();
    if (res.status === 200) replaceData((await res.json()) as TripData);
  } catch {
    // network failure: keep cached data
  }
}

function onVisibility(): void {
  if (document.visibilityState === "visible") void sync();
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
  setState({ online: navigator.onLine });
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", onVisibility);
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
