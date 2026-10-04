"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useTrip } from "@/lib/store";
import { categoryChips, filterByCategory, normalizeSelection, selectedLocation, type CategorySelection } from "@/lib/map-data";
import MapErrorBoundary from "@/components/map/MapErrorBoundary";
import PinCard from "@/components/map/PinCard";
import CategoryChips from "@/components/map/CategoryChips";

const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 animate-pulse bg-zinc-900" />,
});
const LocateButton = dynamic(() => import("@/components/map/LocateButton"), { ssr: false });

function MapLoadFailed({ online }: { online: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950 p-8 text-center text-base text-zinc-300">
      <p>Map unavailable offline — open once online to save map data</p>
      <button
        type="button"
        disabled={!online}
        onClick={() => window.location.reload()}
        className="min-h-11 rounded-xl bg-zinc-800 px-6 text-base font-medium text-zinc-100 active:bg-zinc-700 disabled:opacity-40"
      >
        Retry
      </button>
    </div>
  );
}

export default function MapView() {
  const { data, online } = useTrip();
  const [rawSel, setSel] = useState<CategorySelection>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);

  const chips = useMemo(() => (data ? categoryChips(data) : []), [data]);
  const sel = data ? normalizeSelection(data, rawSel) : "all";
  const visible = useMemo(() => (data ? filterByCategory(data.locations, sel) : []), [data, sel]);
  const selected = data ? selectedLocation(data, selectedId) : null;
  if (data && selectedId && !selected) setSelectedId(null); // deleted by sync: clear stale id
  if (!data) return null;
  function selectFromCard(id: string) {
    // A place/area outside the current filter would have no pin: show all categories.
    if (!visible.some((l) => l.id === id)) setSel("all");
    setSelectedId(id);
  }

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-0 bg-zinc-950">
      <MapErrorBoundary fallback={<MapLoadFailed online={online} />}>
      <MapCanvas locations={visible} selectedId={selectedId} onSelect={setSelectedId} onUnavailable={setUnavailable} onMap={setMap} />
      </MapErrorBoundary>
      <div className="pt-safe pointer-events-none absolute inset-x-0 top-0">
        <CategoryChips chips={chips} value={sel} onChange={setSel} />
        {!online && (
          <p className="mx-4 mt-1 w-fit rounded-full bg-amber-950/90 px-3 py-1 text-sm text-amber-200">
            Map offline — showing saved areas
          </p>
        )}
      </div>
      <div className="absolute right-4 bottom-4 z-10"><MapErrorBoundary fallback={null}><LocateButton map={map} /></MapErrorBoundary></div>
      {unavailable && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 p-8 text-center text-base text-zinc-300">
          {unavailable}
        </div>
      )}
      {selected && <PinCard location={selected} onClose={() => setSelectedId(null)} onSelect={selectFromCard} />}
    </div>
  );
}
