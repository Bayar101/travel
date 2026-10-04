"use client";

import { useEffect, useRef, useState } from "react";
import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import { useToast } from "@/components/Toast";
import { LocateIcon } from "@/components/ui/icons";
import { accuracyRadiusPx, locateErrorMessage } from "@/lib/map-ui";

export default function LocateButton({ map }: { map: MapLibreMap | null }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false); // sync guard: state lags behind a rapid double tap
  const dot = useRef<{ marker: Marker; off: () => void } | null>(null);
  const alive = useRef(true);

  function clearDot() {
    dot.current?.off();
    dot.current?.marker.remove();
    dot.current = null;
  }

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearDot();
    };
  }, []);

  // Map was torn down (tab switch): its markers and listeners are gone with it.
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
          const { longitude, latitude, accuracy } = pos.coords;
          const at: [number, number] = [longitude, latitude];
          const el = document.createElement("div");
          el.className = "map-me";
          const ring = document.createElement("div");
          ring.className = "map-me-ring";
          const core = document.createElement("div");
          core.className = "map-me-dot";
          el.append(ring, core);
          // Accuracy ring: metres -> px at the current zoom, kept in step while zooming.
          const sizeRing = () => {
            const d = 2 * accuracyRadiusPx(accuracy, latitude, map.getZoom());
            ring.style.display = d > 22 ? "" : "none";
            ring.style.width = ring.style.height = `${d}px`;
          };
          sizeRing();
          clearDot();
          map.on("zoom", sizeRing);
          dot.current = {
            marker: new Marker({ element: el }).setLngLat(at).addTo(map),
            off: () => map.off("zoom", sizeRing),
          };
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
      className="flex size-12 items-center justify-center rounded-full bg-white text-[#1a73e8] shadow-[0_1px_4px_#0000004d] active:bg-zinc-100 disabled:text-zinc-400"
    >
      <LocateIcon size={24} strokeWidth={2} className={busy ? "animate-pulse" : ""} />
    </button>
  );
}
