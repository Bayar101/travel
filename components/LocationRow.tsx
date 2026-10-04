"use client";

import DirectionsButton from "@/components/ui/DirectionsButton";
import { CARD } from "@/components/ui/styles";
import { navigate } from "@/lib/router";
import { categoryById, locationById } from "@/lib/selectors";
import type { Location, TripData } from "@/lib/types";

export function TypeChip({ type }: { type: Location["type"] }) {
  return (
    <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-sm text-zinc-400">
      {type === "area" ? "Area" : "Place"}
    </span>
  );
}

export default function LocationRow({ location: l, data }: { location: Location; data: TripData }) {
  const area = l.type === "place" ? locationById(data, l.parent_id) : undefined;
  const cat = categoryById(data, l.category_id);
  const sub = [l.city, cat?.name].filter(Boolean).join(" · ");
  return (
    <li className={`flex items-center gap-2 pr-2 ${CARD}`}>
      <button
        type="button"
        onClick={() => navigate(`/location/${encodeURIComponent(l.id)}`)}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl py-2 pl-3 text-left active:bg-zinc-800"
      >
        <span aria-hidden="true" className="text-2xl">{l.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base text-zinc-100">{l.name}</span>
          <span className="block truncate text-sm text-zinc-400">{sub}</span>
          {area && <span className="block truncate text-sm text-zinc-400">in {area.name}</span>}
        </span>
        <TypeChip type={l.type} />
      </button>
      <DirectionsButton lat={l.lat} lng={l.lng} />
    </li>
  );
}
