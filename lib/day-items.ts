import type { DayItem } from "./types";

export interface ItemFormValues {
  mode: "location" | "note";
  location_id: string;
  time: string | null;
  note: string;
}

export type ItemFormErrors = Partial<Record<"location_id" | "note", string>>;

// Next position at the end of the Anytime list.
export function nextAnytimePosition(items: DayItem[]): number {
  let max = -1;
  for (const i of items) if (!i.time && i.position > max) max = i.position;
  return max + 1;
}

// New id order after moving `id` by dir (-1 up, +1 down); null at edges / unknown id.
export function moveId(ids: string[], id: string, dir: -1 | 1): string[] | null {
  const from = ids.indexOf(id);
  const to = from + dir;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function validateItemForm(v: ItemFormValues): ItemFormErrors {
  const e: ItemFormErrors = {};
  if (v.mode === "location" && !v.location_id) e.location_id = "Choose a location";
  if (v.mode === "note" && !v.note.trim()) e.note = "Note is required";
  return e;
}

// `siblings` = all items of the day. Call only after validateItemForm returned no errors.
export function itemPayload(
  v: ItemFormValues,
  siblings: DayItem[],
  existing?: DayItem,
): Pick<DayItem, "location_id" | "time" | "note" | "position"> {
  const others = existing ? siblings.filter((i) => i.id !== existing.id) : siblings;
  const clearedTime = !!existing?.time && !v.time; // timed -> Anytime: go to the end
  const position = existing && !clearedTime ? existing.position : nextAnytimePosition(others);
  return {
    location_id: v.mode === "location" ? v.location_id : null,
    time: v.time,
    note: v.note.trim() || null,
    position,
  };
}

export function itemToForm(i: DayItem): ItemFormValues {
  return { mode: i.location_id ? "location" : "note", location_id: i.location_id ?? "", time: i.time, note: i.note ?? "" };
}
