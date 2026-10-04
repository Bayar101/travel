"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useTrip } from "@/lib/store";
import { categoryChips, filterByCategory, normalizeSelection, selectedLocation, type CategorySelection } from "@/lib/map-data";
import CategoryChips from "@/components/map/CategoryChips";

const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 animate-pulse bg-zinc-900" />,
});
const PinCard = dynamic(() => import("@/components/map/PinCard"), { ssr: false });
const LocateButton = dynamic(() => import("@/components/map/LocateButton"), { ssr: false });

export default function MapView() {
  const { data, online } = useTrip();
  const [rawSel, setSel] = useState<CategorySelection>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);

  const chips = useMemo(() => (data ? categoryChips(data) : []), [data]);
  const sel = data ? normalizeSelection(data, rawSel) : "all";
  const visible = useMemo(() => (data ? filterByCategory(data.locations, sel) : []), [data, sel]);
  if (!data) return null;
  const selected = selectedLocation(data, selectedId);
  function selectFromCard(id: string) {
    // A place/area outside the current filter would have no pin: show all categories.
    if (!visible.some((l) => l.id === id)) setSel("all");
    setSelectedId(id);
  }

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-0 bg-zinc-950">
      <MapCanvas locations={visible} selectedId={selectedId} onSelect={setSelectedId} onUnavailable={setUnavailable} onMap={setMap} />
      <div className="pt-safe pointer-events-none absolute inset-x-0 top-0">
        <CategoryChips chips={chips} value={sel} onChange={setSel} />
        {!online && (
          <p className="mx-4 mt-1 w-fit rounded-full bg-amber-950/90 px-3 py-1 text-sm text-amber-200">
            Map offline — showing saved areas
          </p>
        )}
      </div>
      <div className="absolute right-4 bottom-4 z-10"><LocateButton map={map} /></div>
      {unavailable && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 p-8 text-center text-base text-zinc-300">
          {unavailable}
        </div>
      )}
      {selected && <PinCard location={selected} onClose={() => setSelectedId(null)} onSelect={selectFromCard} />}
    </div>
  );
}
