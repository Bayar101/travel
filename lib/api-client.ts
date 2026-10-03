"use client";

import { del } from "idb-keyval";
import { pruneDeleted } from "./cascade";
import { applyWrite, isOnline } from "./store";
import type { DayItem, Resource, TripData } from "./types";

type Row = { id: string };

const OFFLINE = "You're offline";

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  if (!isOnline()) throw new Error(OFFLINE);
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
  await del("trip-data-v1").catch(() => {});
  window.location.replace("/login");
}

