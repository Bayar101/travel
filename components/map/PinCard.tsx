"use client";

import { useEffect, useRef } from "react";
import { useTrip } from "@/lib/store";
import { navigate } from "@/lib/router";
import { categoryById, locationById, placesInArea } from "@/lib/selectors";
import { plannedOn } from "@/lib/map-data";
import type { Location } from "@/lib/types";
import Sheet from "@/components/ui/Sheet";
import MapsButton from "@/components/ui/MapsButton";

const ROW = "min-h-11 w-full text-left text-base active:bg-zinc-800";

export default function PinCard({
  location: l,
  onClose,
  onSelect,
}: {
  location: Location;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const { data } = useTrip();
  const body = useRef<HTMLDivElement>(null);
  const shownId = useRef(l.id);
  useEffect(() => {
    if (shownId.current === l.id) return; // first open: Sheet handles focus
    shownId.current = l.id;
    body.current?.closest(".overflow-y-auto")?.scrollTo(0, 0);
    body.current?.closest<HTMLElement>("[role=dialog]")?.focus();
  }, [l.id]);
  if (!data) return null;
  const cat = categoryById(data, l.category_id);
  const parent = l.parent_id ? locationById(data, l.parent_id) : undefined;
  const places = l.type === "area" ? placesInArea(data, l.id) : [];
  const planned = plannedOn(data, l.id);

  return (
    <Sheet
      open
      onClose={onClose}
      title={`${l.emoji} ${l.name}`}
      footer={
        <div className="flex gap-3">
          <MapsButton lat={l.lat} lng={l.lng} />
          <button
            type="button"
            className="min-h-11 flex-1 rounded-xl bg-red-500 px-4 text-base font-medium text-white active:bg-red-600"
            onClick={() => navigate(`/location/${encodeURIComponent(l.id)}`)}
          >
            Open details
          </button>
        </div>
      }
    >
      <div ref={body} className="space-y-4">
        <p className="text-sm text-zinc-400">
          {l.type === "area" ? "Area" : "Place"} · {cat ? `${cat.emoji ?? ""} ${cat.name}`.trim() : "Uncategorized"} · {l.city}
        </p>
        {parent && (
          <button type="button" className={`${ROW} text-red-400`} onClick={() => onSelect(parent.id)}>
            In {parent.emoji} {parent.name}
          </button>
        )}
        {l.description && <p className="text-base whitespace-pre-wrap text-zinc-200">{l.description}</p>}
        <section>
          <h3 className="mb-1 text-sm font-semibold text-zinc-400">Planned on</h3>
          {planned.length ? (
            <ul>
              {planned.map((r) => (
                <li key={r.item.id}>
                  <button type="button" className={ROW} onClick={() => navigate(`/day/${encodeURIComponent(r.day.id)}`)}>
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-zinc-500">Not planned yet</p>
          )}
        </section>
        {places.length > 0 && (
          <section>
            <h3 className="mb-1 text-sm font-semibold text-zinc-400">Places here</h3>
            <ul>
              {places.map((p) => (
                <li key={p.id}>
                  <button type="button" className={ROW} onClick={() => onSelect(p.id)}>
                    {p.emoji} {p.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Sheet>
  );
}
