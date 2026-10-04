"use client";

import DirectionsButton from "@/components/ui/DirectionsButton";
import { CARD, EMOJI_TILE } from "@/components/ui/styles";
import { locationSubtitle } from "@/lib/locations-list";
import { navigate } from "@/lib/router";
import type { Location, TripData } from "@/lib/types";

/** "Area" marker; places get no chip (they're the default). */
export function AreaChip() {
  return (
    <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-red-300">
      Area
    </span>
  );
}

/** Row content shared by the Locations list and the LocationPicker: emoji tile, name, meta, Area chip. */
export function LocationRowBody({
  location: l,
  data,
  withArea = true,
}: {
  location: Location;
  data: TripData;
  withArea?: boolean;
}) {
  const sub = locationSubtitle(data, l, { withArea });
  return (
    <>
      <span aria-hidden="true" className={EMOJI_TILE}>{l.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="min-w-0 truncate text-base font-medium text-zinc-100">{l.name}</span>
          {l.type === "area" && <AreaChip />}
        </span>
        {sub && <span className="block truncate text-sm text-zinc-400">{sub}</span>}
      </span>
    </>
  );
}

export default function LocationRow({
  location: l,
  data,
  withArea,
}: {
  location: Location;
  data: TripData;
  withArea?: boolean;
}) {
  return (
    <li className={`flex items-center gap-1 pr-2 ${CARD}`}>
      <button
        type="button"
        onClick={() => navigate(`/location/${encodeURIComponent(l.id)}`)}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-2xl py-2.5 pl-2.5 pr-1 text-left transition-colors active:bg-zinc-800"
      >
        <LocationRowBody location={l} data={data} withArea={withArea} />
      </button>
      <DirectionsButton lat={l.lat} lng={l.lng} />
    </li>
  );
}
