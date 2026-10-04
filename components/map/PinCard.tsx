"use client";

import { useEffect, useRef } from "react";
import { useTrip } from "@/lib/store";
import { navigate } from "@/lib/router";
import { categoryById, locationById, placesInArea } from "@/lib/selectors";
import type { Location } from "@/lib/types";
import PlannedOnList from "@/components/PlannedOnList";
import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import DirectionsButton from "@/components/ui/DirectionsButton";
import { ChevronRightIcon } from "@/components/ui/icons";
import { CARD, CARD_BUTTON, CHIP, EMOJI_TILE, SECTION_HEADING } from "@/components/ui/styles";

const AREA_CHIP = "inline-flex items-center rounded-full bg-red-500/15 px-2.5 py-0.5 text-sm text-red-300";

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

  return (
    <Sheet
      open
      onClose={onClose}
      title={l.name}
      footer={
        <div className="flex gap-2">
          <DirectionsButton lat={l.lat} lng={l.lng} full primary className="flex-1" />
          <Button variant="secondary" className="flex-1" onClick={() => navigate(`/location/${encodeURIComponent(l.id)}`)}>
            Open details
          </Button>
        </div>
      }
    >
      <div ref={body} className="space-y-4">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className={EMOJI_TILE}>{l.emoji}</span>
          <div className="flex min-w-0 flex-wrap gap-1.5">
            <span className={l.type === "area" ? AREA_CHIP : CHIP}>{l.type === "area" ? "Area" : "Place"}</span>
            {cat && <span className={CHIP}>{cat.emoji ? `${cat.emoji} ${cat.name}` : cat.name}</span>}
            <span className={CHIP}>{l.city}</span>
          </div>
        </div>
        {parent && (
          <button type="button" onClick={() => onSelect(parent.id)} className={`flex min-h-14 w-full items-center gap-3 px-3 ${CARD_BUTTON}`}>
            <span aria-hidden="true" className="text-2xl">{parent.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-zinc-400">In area</span>
              <span className="block truncate text-base font-medium text-zinc-100">{parent.name}</span>
            </span>
            <ChevronRightIcon size={20} className="text-zinc-500" />
          </button>
        )}
        {l.description && <p className="whitespace-pre-wrap break-words text-base text-zinc-200">{l.description}</p>}
        <section className="space-y-2" aria-labelledby="pin-planned-on">
          <h3 id="pin-planned-on" className={SECTION_HEADING}>Planned on</h3>
          <PlannedOnList data={data} locationId={l.id} />
        </section>
        {places.length > 0 && (
          <section className="space-y-2" aria-labelledby="pin-places-here">
            <h3 id="pin-places-here" className={SECTION_HEADING}>
              Places here <span className="text-zinc-600">· {places.length}</span>
            </h3>
            <ul className={`divide-y divide-white/5 overflow-hidden ${CARD}`}>
              {places.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(p.id)}
                    className="flex min-h-14 w-full items-center gap-3 px-3 py-1.5 text-left transition-colors active:bg-zinc-800"
                  >
                    <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xl">{p.emoji}</span>
                    <span className="min-w-0 flex-1 truncate text-base text-zinc-100">{p.name}</span>
                    <ChevronRightIcon size={20} className="text-zinc-500" />
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
