"use client";

import { useEffect, useRef, useState } from "react";
import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import { useToast } from "@/components/Toast";
import { LocateIcon } from "@/components/ui/icons";
import { locateErrorMessage } from "@/lib/map-ui";

export default function LocateButton({ map }: { map: MapLibreMap | null }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false); // sync guard: state lags behind a rapid double tap
  const dot = useRef<Marker | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      dot.current?.remove();
      dot.current = null;
    };
  }, []);

  // Map was torn down (tab switch): its markers are gone with it.
  useEffect(() => {
    if (!map) dot.current = null;
  }, [map]);

  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return null;

  function finish() {
    busyRef.current = false;
    if (alive.current) setBusy(false);
  }

  function locate() {
    if (busyRef.current || !map) return;
    busyRef.current = true;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (alive.current) {
          const at: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          const el = document.createElement("div");
          el.className = "map-me";
          dot.current?.remove();
          dot.current = new Marker({ element: el }).setLngLat(at).addTo(map);
          map.flyTo({ center: at, zoom: Math.max(map.getZoom(), 14) });
        }
        finish();
      },
      (err) => {
        if (alive.current) toast.show(locateErrorMessage(err.code), "error");
        finish();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <button
      type="button"
      aria-label="Show my location"
      aria-busy={busy}
      onClick={locate}
      disabled={busy || !map}
      className="flex size-12 items-center justify-center rounded-full bg-zinc-900 text-zinc-100 shadow-lg ring-1 ring-white/10 active:bg-zinc-800 disabled:opacity-50"
    >
      <LocateIcon size={22} className={busy ? "animate-pulse" : ""} />
    </button>
  );
}
