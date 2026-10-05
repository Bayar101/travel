"use client";

import { pruneDeleted } from "./cascade";
import { applyWrite, beginWrite, clearCache, isOnline } from "./store";
import type { DayItem, Resource, TripData } from "./types";

type Row = { id: string };

const OFFLINE = "You're offline";

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  if (!isOnline()) throw new Error(OFFLINE);
  const done = beginWrite(); // syncs finishing meanwhile must not adopt a stale snapshot
  try {
    return await send<T>(path, method, body);
  } finally {
    done();
  }
}

async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(OFFLINE);
  }
  if (res.status === 401) {
    window.location.replace("/login");
    return new Promise<T>(() => {}); // page is navigating away; never settle
  }
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`);
  return json as T;
}

function upsert(resource: Resource, row: Row) {
  return (d: TripData): TripData => {
    const list = d[resource] as Row[];
    const next = list.some((r) => r.id === row.id)
      ? list.map((r) => (r.id === row.id ? row : r))
      : [...list, row];
    return { ...d, [resource]: next } as TripData;
  };
}

export async function create<T extends Row>(resource: Resource, body: Omit<T, "id">): Promise<T> {
  const { row, version } = await request<{ row: T; version: number }>(`/api/${resource}`, "POST", body);
  applyWrite(upsert(resource, row), version);
  return row;
}

export async function update<T extends Row>(
  resource: Resource,
  id: string,
  body: Partial<Omit<T, "id">>,
): Promise<T> {
  const { row, version } = await request<{ row: T; version: number }>(
    `/api/${resource}/${encodeURIComponent(id)}`, "PATCH", body,
  );
  applyWrite(upsert(resource, row), version);
  return row;
}

export async function remove(resource: Resource, id: string): Promise<void> {
  const { version } = await request<{ version: number }>(`/api/${resource}/${encodeURIComponent(id)}`, "DELETE", {
    confirm: "delete me",
  });
  applyWrite((d) => pruneDeleted(d, resource, id), version);
}

export async function reorderItems(dayId: string, ids: string[]): Promise<void> {
  const { version } = await request<{ version: number }>("/api/items/reorder", "POST", {
    day_id: dayId,
    ids,
  });
  applyWrite((d) => {
    const pos = new Map(ids.map((id, i) => [id, i]));
    const items: DayItem[] = d.items.map((i) =>
      i.day_id === dayId && pos.has(i.id) ? { ...i, position: pos.get(i.id)! } : i,
    );
    return { ...d, items };
  }, version);
}

export async function logout(): Promise<void> {
  await request<void>("/api/logout", "POST"); // throws offline/failure: keep the offline cache
  await clearCache();
  window.location.replace("/login");
}


export type MapsLinkLookup =
  | { ok: true; lat: number; lng: number; name: string | null; cid: string | null; approximate: boolean }
  | { ok: false; error: string; name: string | null };

/** Expand a Google Maps share link server-side (read-only: no write bookkeeping). 422 still carries `name`. */
export async function resolveMapsLink(url: string): Promise<MapsLinkLookup> {
  if (!isOnline()) throw new Error(OFFLINE);
  let res: Response;
  try {
    res = await fetch("/api/resolve-maps-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new Error(OFFLINE);
  }
  if (res.status === 401) {
    window.location.replace("/login");
    return new Promise<MapsLinkLookup>(() => {});
  }
  const j = (await res.json().catch(() => null)) as
    | { lat?: number; lng?: number; name?: string | null; cid?: string; approximate?: boolean; error?: string }
    | null;
  if (res.ok && typeof j?.lat === "number" && typeof j.lng === "number") {
    return { ok: true, lat: j.lat, lng: j.lng, name: j.name ?? null, cid: typeof j.cid === "string" ? j.cid : null, approximate: j.approximate === true };
  }
  return { ok: false, error: j?.error ?? "Couldn't read that link", name: typeof j?.name === "string" ? j.name : null };
}
