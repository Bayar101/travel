"use client";

import { useEffect, useRef, useState } from "react";
import { AttributionControl, getVersion, Map as MapLibreMap, Marker, setWorkerUrl, type StyleSwapOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Location } from "@/lib/types";
import { boundsFor } from "@/lib/map-data";
import { DEFAULT_CAMERA, loadCamera, saveCamera } from "@/lib/map-ui";
import { googleMapStyle, placeholderImage } from "@/lib/google-map-style";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
// Liberty, recoloured to Google Maps' light palette as it loads.
const STYLE_OPTS = { transformStyle: (_prev, next) => googleMapStyle(next) } satisfies StyleSwapOptions;
const FIT = { padding: 48, maxZoom: 15 };

// Served from public/ (scripts/copy-maplibre-worker.mjs): Turbopack gives maplibre a file://
// import.meta.url, so its own worker URL resolves to "". The worker imports the shared chunk next to it.
const WORKER_DIR = `/maplibre/${getVersion()}`;
export const MAPLIBRE_WORKER_FILES = [`${WORKER_DIR}/maplibre-gl-worker.mjs`, `${WORKER_DIR}/maplibre-gl-shared.mjs`];

interface Props {
  locations: Location[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  fitKey: string; // camera refits to `locations` when this changes (category filter), not on data sync
  onUnavailable: (msg: string | null, retry?: () => void) => void; // null clears the overlay
  onMap?: (map: MapLibreMap | null) => void; // LocateButton needs the instance
}

// Google-style teardrop (24x32.6 grid); its tip (12,32.6) is the marker's bottom anchor.
const PIN_SVG =
  '<svg viewBox="0 0 24 32.6" aria-hidden="true" focusable="false"><path class="map-pin-body" d="M12 .75C5.8.75.75 5.6.75 11.7c0 7.9 9.6 19 10.4 20a1.1 1.1 0 0 0 1.7 0c.8-1 10.4-12.1 10.4-20C23.25 5.6 18.2.75 12 .75Z"/><circle cx="12" cy="11.7" r="7.6" fill="#fff"/></svg>';

// MapLibre owns the marker root's `transform`, so the root stays unstyled and the
// visuals (incl. selected scale) live on an inner span. Root is the >=44px tap target,
// bottom-anchored so the pin's tip sits on the coordinate.
function pinElement(l: Location, onSelect: (id: string) => void): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", l.name);
  el.className = "map-pin-root";
  el.dataset.type = l.type;
  const face = document.createElement("span");
  face.className = "map-pin";
  face.innerHTML = PIN_SVG;
  const emoji = document.createElement("span");
  emoji.className = "map-pin-emoji";
  emoji.textContent = l.emoji;
  face.appendChild(emoji);
  el.appendChild(face);
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    onSelect(l.id);
  });
  return el;
}

function markSelected(els: Iterable<[string, { el: HTMLElement }]>, selectedId: string | null) {
  for (const [id, { el }] of els) el.dataset.selected = String(id === selectedId);
}

export default function MapCanvas({ locations, selectedId, fitKey, onSelect, onUnavailable, onMap }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLButtonElement; sig: string }>());
  const selectRef = useRef(onSelect);
  const unavailableRef = useRef(onUnavailable);
  const mapCbRef = useRef(onMap);
  const seed = useRef(locations); // first camera only
  const fittedFor = useRef(fitKey);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    selectRef.current = onSelect;
    unavailableRef.current = onUnavailable;
    mapCbRef.current = onMap;
  });

  // Create once; remove on unmount (no leaked WebGL contexts when leaving the tab).
  useEffect(() => {
    if (!box.current) return;
    let map: MapLibreMap;
    try {
      setWorkerUrl(MAPLIBRE_WORKER_FILES[0]);
      const cam = loadCamera();
      const b = cam ? null : boundsFor(seed.current);
      map = new MapLibreMap({
        container: box.current,
        attributionControl: false,
        ...(cam
          ? { center: cam.center, zoom: cam.zoom }
          : b
            ? { bounds: b, fitBoundsOptions: FIT }
            : { center: DEFAULT_CAMERA.center, zoom: DEFAULT_CAMERA.zoom }),
      });
    } catch {
      unavailableRef.current("This device can't show the map");
      return;
    }
    map.setStyle(STYLE_URL, STYLE_OPTS);
    // Liberty asks for a few icons its sprite lacks (e.g. some POI classes): show text only, no warning.
    map.setMissingStyleImageResolver((id) => {
      if (!map.hasImage(id)) map.addImage(id, placeholderImage());
    });
    map.addControl(new AttributionControl({ compact: true }), "bottom-left");
    // MapLibre opens compact attribution once it has text; start collapsed ("i" only) instead.
    const collapseAttribution = () => {
      const el = box.current?.querySelector(".maplibregl-ctrl-attrib.maplibregl-compact");
      if (!el) return;
      el.classList.remove("maplibregl-compact-show");
      map.off("styledata", collapseAttribution);
    };
    map.on("styledata", collapseAttribution);
    mapRef.current = map;
    mapCbRef.current?.(map);
    map.on("moveend", () => {
      const c = map.getCenter();
      saveCamera({ center: [c.lng, c.lat], zoom: map.getZoom() });
    });
    map.on("load", () => setReady(true));
    // Only a style failure is fatal; tile/glyph errors (offline, uncached area) leave blank tiles + working pins.
    let styleOk = false;
    map.on("style.load", () => {
      styleOk = true;
      unavailableRef.current(null);
    });
    const retryStyle = () => {
      if (!styleOk) map.setStyle(STYLE_URL, { ...STYLE_OPTS, diff: false });
    };
    map.on("error", () => {
      if (!styleOk) unavailableRef.current("Map unavailable offline — open once online to save map data", retryStyle);
    });
    window.addEventListener("online", retryStyle);
    const current = markers.current;
    return () => {
      window.removeEventListener("online", retryStyle);
      for (const { marker } of current.values()) marker.remove();
      current.clear();
      mapCbRef.current?.(null);
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // Diff markers by id; rebuild an element only when what it shows changed.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const next = new Set(locations.map((l) => l.id));
    for (const [id, m] of markers.current) {
      if (!next.has(id)) {
        m.marker.remove();
        markers.current.delete(id);
      }
    }
    for (const l of locations) {
      const sig = `${l.emoji}|${l.type}|${l.name}|${l.lat}|${l.lng}`;
      const have = markers.current.get(l.id);
      if (have && have.sig === sig) continue;
      have?.marker.remove();
      const el = pinElement(l, (id) => selectRef.current(id));
      el.dataset.selected = String(l.id === selectedId);
      const marker = new Marker({ element: el, anchor: "bottom" }).setLngLat([l.lng, l.lat]).addTo(map);
      markers.current.set(l.id, { marker, el, sig });
    }
    // selectedId only seeds new elements; the effect below keeps it in sync
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, ready]);

  // Filter change: show what's visible now. Declared before the selection effect so a
  // card-driven filter reset still ends on the selected pin.
  useEffect(() => {
    if (fittedFor.current === fitKey) return;
    fittedFor.current = fitKey;
    const b = boundsFor(locations);
    if (mapRef.current && b) mapRef.current.fitBounds(b, FIT);
    // refit only when the filter changes, not on every locations change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  // Highlight, and bring the selected pin above the card.
  useEffect(() => {
    markSelected(markers.current, selectedId);
    const map = mapRef.current;
    const l = locations.find((x) => x.id === selectedId);
    if (map && l) map.easeTo({ center: [l.lng, l.lat], zoom: Math.max(map.getZoom(), 14), offset: [0, -120] });
    // fly only when the selection changes, not on every locations change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // MapLibre's (unlayered) CSS sets `.maplibregl-map { position: relative }`, which beats Tailwind's
  // layered `absolute`; so the container only fills a positioned wrapper (else its height is 0).
  return (
    <div className="absolute inset-0">
      <div ref={box} className="size-full" />
    </div>
  );
}
