"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useTrip } from "@/lib/store";
import {
  EMPTY_FILTER, applyCategoryFilter, categoryChips, cycleChip, filterKey, isEmptyFilter, normalizeFilter,
  selectedLocation, type CategoryFilter,
} from "@/lib/map-data";
import MapErrorBoundary from "@/components/map/MapErrorBoundary";
import PinCard from "@/components/map/PinCard";
import CategoryChips from "@/components/map/CategoryChips";

// One import() per module, shared with warmMapOnIdle: Turbopack emits a separate chunk copy per
// call site, so warming through a second import() would cache chunks the Map tab never requests.
const loadCanvas = () => import("@/components/map/MapCanvas");
const loadLocate = () => import("@/components/map/LocateButton");

const MapCanvas = dynamic(loadCanvas, {
  ssr: false,
  loading: () => <div className="absolute inset-0 animate-pulse bg-[#f5f3ef]" />,
});
const LocateButton = dynamic(loadLocate, { ssr: false });

let warmed = false;
/**
 * Once per page load, when online and idle: fetch the lazy map chunks (+ CSS) and the MapLibre
 * worker files so the service worker has them, and the Map tab opens offline after a deploy.
 */
export function warmMapOnIdle(): void {
  if (warmed) return;
  warmed = true;
  const run = () => {
    void loadLocate().catch(() => {});
    loadCanvas()
      .then((m) => Promise.all(m.MAPLIBRE_WORKER_FILES.map((u) => fetch(u))))
      .catch(() => {
        warmed = false; // flaky network: try again next time we're online
      });
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 5000 });
  else setTimeout(run, 2000);
}

const HINT_KEY = "map-filter-hint-seen";

function hintSeen(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

interface Unavailable {
  msg: string;
  retry?: () => void;
}

// Overlays sit on the light map: Google-ish light surface, blue text button.
const OVERLAY = "absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center text-base text-[#3c4043]";
const RETRY =
  "min-h-11 rounded-full border border-[#dadce0] bg-white px-6 text-base font-medium text-[#1a73e8] shadow-[0_1px_3px_#0000004d] active:bg-[#e8f0fe] disabled:text-zinc-400";

function MapLoadFailed({ online }: { online: boolean }) {
  return (
    <div className={`${OVERLAY} bg-[#f5f3ef]`}>
      <p>Map unavailable offline — open once online to save map data</p>
      <button type="button" disabled={!online} onClick={() => window.location.reload()} className={RETRY}>
        Retry
      </button>
    </div>
  );
}

export default function MapView() {
  const { data, online } = useTrip();
  const [rawFilter, setFilter] = useState<CategoryFilter>(EMPTY_FILTER);
  const [hintDone, setHintDone] = useState(hintSeen);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [unavailable, setUnavailable] = useState<Unavailable | null>(null);
  const [crashed, setCrashed] = useState(false);

  const chips = useMemo(() => (data ? categoryChips(data) : []), [data]);
  const filter = useMemo(() => (data ? normalizeFilter(data, rawFilter) : EMPTY_FILTER), [data, rawFilter]);
  const fKey = filterKey(filter);
  const visible = useMemo(() => (data ? applyCategoryFilter(data.locations, filter) : []), [data, filter]);
  const selected = data ? selectedLocation(data, selectedId) : null;
  if (data && selectedId && !selected) setSelectedId(null); // deleted by sync: clear stale id
  if (!data) return null;
  function selectFromCard(id: string) {
    // A place/area outside the current filter would have no pin: clear the filter.
    if (!visible.some((l) => l.id === id)) setFilter(EMPTY_FILTER);
    setSelectedId(id);
  }

  function toggleChip(key: string) {
    setFilter(cycleChip(filter, key));
    if (!hintDone) {
      setHintDone(true);
      try {
        localStorage.setItem(HINT_KEY, "1");
      } catch {}
    }
  }

  // PinCard (a Sheet) renders outside the z-0 map layer: inside it, the bottom nav would cover its footer.
  return (
    <>
      <div className="fixed inset-x-0 top-0 bottom-(--nav-h) z-0 bg-[#f5f3ef]">
        <MapErrorBoundary fallback={<MapLoadFailed online={online} />} onError={() => setCrashed(true)}>
          <MapCanvas
            locations={visible}
            selectedId={selectedId}
            fitKey={fKey}
            onSelect={setSelectedId}
            onUnavailable={(msg, retry) => setUnavailable(msg ? { msg, retry } : null)}
            onMap={setMap}
          />
        </MapErrorBoundary>
        <div className="pt-safe pointer-events-none absolute inset-x-0 top-0">
          <CategoryChips
            chips={chips}
            filter={filter}
            empty={isEmptyFilter(filter)}
            showHint={!hintDone}
            onToggle={toggleChip}
            onClear={() => setFilter(EMPTY_FILTER)}
          />
          {!online && (
            <p className="mx-4 mt-1 w-fit rounded-full bg-white px-3 py-1 text-sm font-medium text-[#b06000] shadow-[0_1px_3px_#0000004d]">
              Map offline — showing saved areas
            </p>
          )}
        </div>
        {!unavailable && !crashed && (
          <div className="absolute right-4 bottom-4 z-10">
            <MapErrorBoundary fallback={null}>
              <LocateButton map={map} />
            </MapErrorBoundary>
          </div>
        )}
        {unavailable && (
          <div className={`${OVERLAY} bg-[#f5f3ef]/95`}>
            <p>{unavailable.msg}</p>
            {unavailable.retry && (
              <button type="button" disabled={!online} onClick={unavailable.retry} className={RETRY}>
                Retry
              </button>
            )}
          </div>
        )}
      </div>
      {selected && <PinCard location={selected} onClose={() => setSelectedId(null)} onSelect={selectFromCard} />}
    </>
  );
}
