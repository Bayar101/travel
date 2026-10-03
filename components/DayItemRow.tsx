"use client";

import { useState } from "react";
import MapsButton from "@/components/ui/MapsButton";
import { locationById, placesInArea } from "@/lib/selectors";
import type { DayItem, TripData } from "@/lib/types";

export function NoteCallout({ note }: { note: string }) {
  return (
    <span className="block whitespace-pre-wrap break-words rounded-lg border border-amber-700 bg-amber-950/40 px-3 py-2 text-base text-amber-200">
      ⚠️ {note}
    </span>
  );
}

const MOVE =
  "flex size-11 shrink-0 items-center justify-center rounded-lg text-xl text-zinc-100 active:bg-zinc-800 disabled:opacity-30";


export default function DayItemRow({
  item,
  data,
  onEdit,
  move,
}: {
  item: DayItem;
  data: TripData;
  onEdit: () => void;
  move?: { onUp: () => void; onDown: () => void; upDisabled: boolean; downDisabled: boolean };
}) {
  const [open, setOpen] = useState(false);
  const loc = locationById(data, item.location_id);
  const places = loc?.type === "area" ? placesInArea(data, loc.id) : [];

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-14 min-w-0 flex-1 items-start gap-3 rounded-xl py-2 pl-3 text-left active:bg-zinc-800"
        >
          {item.time && <span className="w-12 shrink-0 pt-0.5 text-base font-semibold tabular-nums text-zinc-100">{item.time}</span>}
          <span aria-hidden="true" className="text-2xl">{loc ? loc.emoji : item.location_id ? "❓" : "📝"}</span>
          <span className="min-w-0 flex-1 space-y-1">
            {loc ? (
              <>
                <span className="block break-words text-base text-zinc-100">{loc.name}</span>
                <span className="block truncate text-sm text-zinc-400">{loc.city}</span>
                {item.note && <NoteCallout note={item.note} />}
              </>
            ) : item.location_id ? (
              <>
                <span className="block text-base text-zinc-400">Unknown location</span>
                {item.note && <NoteCallout note={item.note} />}
              </>
            ) : (
              <span className="block whitespace-pre-wrap break-words text-base text-zinc-100">{item.note}</span>
            )}
          </span>
        </button>
        {loc && places.length > 0 && (
          <button
            type="button"
            aria-label={open ? "Hide places" : "Show places"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-xl text-zinc-400 active:bg-zinc-800"
          >
            {open ? "▾" : "▸"}
          </button>
        )}
        {loc && <MapsButton lat={loc.lat} lng={loc.lng} compact />}
      </div>
      {move && (
        <div className="flex justify-end gap-1 border-t border-zinc-800 px-1">
          <button type="button" aria-label="Move up" disabled={move.upDisabled} onClick={move.onUp} className={MOVE}>
            ↑
          </button>
          <button type="button" aria-label="Move down" disabled={move.downDisabled} onClick={move.onDown} className={MOVE}>
            ↓
          </button>
        </div>
      )}
      {open && places.length > 0 && (
        <ul className="space-y-1 border-t border-zinc-800 px-3 py-2">
          {places.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <span aria-hidden="true" className="text-xl">{p.emoji}</span>
              <span className="min-w-0 flex-1 break-words text-base text-zinc-100">{p.name}</span>
              <MapsButton lat={p.lat} lng={p.lng} compact />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
