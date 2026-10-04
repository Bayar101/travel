"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Location } from "@/lib/types";
import { boundsFor } from "@/lib/map-data";
import { DEFAULT_CAMERA, loadCamera, saveCamera } from "@/lib/map-ui";

const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

interface Props {
  locations: Location[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUnavailable: (msg: string) => void;
  onMap?: (map: MapLibreMap | null) => void; // LocateButton needs the instance
}

// MapLibre owns the marker root's `transform`, so the root stays unstyled and the
// visuals (incl. selected scale) live on an inner span. Root is the 44px tap target.
function pinElement(l: Location, onSelect: (id: string) => void): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", l.name);
  el.className = "map-pin-root";
  const face = document.createElement("span");
  face.className = "map-pin";
  face.dataset.type = l.type;
  face.textContent = l.emoji;
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

export default function MapCanvas({ locations, selectedId, onSelect, onUnavailable, onMap }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLButtonElement; sig: string }>());
  const selectRef = useRef(onSelect);
  const unavailableRef = useRef(onUnavailable);
  const mapCbRef = useRef(onMap);
  const seed = useRef(locations); // first camera only
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
      const cam = loadCamera();
      const b = cam ? null : boundsFor(seed.current);
      map = new MapLibreMap({
        container: box.current,
        style: STYLE_URL,
        attributionControl: { compact: true },
        ...(cam
          ? { center: cam.center, zoom: cam.zoom }
          : b
            ? { bounds: b, fitBoundsOptions: { padding: 48, maxZoom: 15 } }
            : { center: DEFAULT_CAMERA.center, zoom: DEFAULT_CAMERA.zoom }),
      });
    } catch {
      unavailableRef.current("This device can't show the map");
      return;
    }
    mapRef.current = map;
    mapCbRef.current?.(map);
    map.on("moveend", () => {
      const c = map.getCenter();
      saveCamera({ center: [c.lng, c.lat], zoom: map.getZoom() });
    });
    map.on("load", () => setReady(true));
    map.on("error", () => {
      if (!map.isStyleLoaded()) unavailableRef.current("Map unavailable offline — open once online to save map data");
    });
    const current = markers.current;
    return () => {
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
      const marker = new Marker({ element: el }).setLngLat([l.lng, l.lat]).addTo(map);
      markers.current.set(l.id, { marker, el, sig });
    }
    // selectedId only seeds new elements; the effect below keeps it in sync
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, ready]);

  // Highlight, and bring the selected pin above the card.
  useEffect(() => {
    markSelected(markers.current, selectedId);
    const map = mapRef.current;
    const l = locations.find((x) => x.id === selectedId);
    if (map && l) map.easeTo({ center: [l.lng, l.lat], zoom: Math.max(map.getZoom(), 14), offset: [0, -120] });
    // fly only when the selection changes, not on every locations change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div ref={box} className="absolute inset-0" />;
}
