"use client";

import { useId, useState } from "react";
import DirectionsButton from "@/components/ui/DirectionsButton";
import { ChevronDownIcon, ChevronUpIcon, NoteIcon, PencilIcon } from "@/components/ui/icons";
import { CARD } from "@/components/ui/styles";
import { locationById, placesInArea } from "@/lib/selectors";
import type { DayItem, TripData } from "@/lib/types";

export function NoteCallout({ note }: { note: string }) {
  return (
    <span className="block whitespace-pre-wrap break-words rounded-lg border border-amber-700/70 bg-amber-950/40 px-3 py-2 text-base text-amber-200">
      ⚠️ {note}
    </span>
  );
}

const ROUND =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-zinc-100 transition-colors active:bg-zinc-800 disabled:opacity-30";

export interface ReorderControls {
  onUp: () => void;
  onDown: () => void;
  upDisabled: boolean;
  downDisabled: boolean;
}

/**
 * One day item as a card (no time: the Schedule timeline shows it in its own column).
 * Tap = edit; area items instead expand to list their places (edit lives in the panel).
 * `reorder`: reorder mode, ↑/↓ replace the trailing actions and the card isn't tappable.
 */
export default function DayItemRow({
  item,
  data,
  onEdit,
  reorder,
}: {
  item: DayItem;
  data: TripData;
  onEdit: () => void;
  reorder?: ReorderControls;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const loc = locationById(data, item.location_id);
  const isArea = loc?.type === "area";
  const places = isArea ? placesInArea(data, loc.id) : [];
  const area = loc?.type === "place" ? locationById(data, loc.parent_id) : undefined;
  const expanded = open && isArea && !reorder;

  const meta = loc
    ? [isArea ? "Area" : null, loc.city, area?.name, isArea ? `${places.length} place${places.length === 1 ? "" : "s"}` : null]
        .filter(Boolean)
        .join(" · ")
    : null;

  const trailing = reorder ? "pr-[6.25rem]" : loc ? "pr-14" : "pr-3"; // room for the absolute actions
  const body = (
    <>
      <span className={`flex items-start gap-2.5 ${trailing}`}>
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center pt-0.5 text-2xl leading-none">
          {loc ? loc.emoji : item.location_id ? "❓" : <NoteIcon size={22} className="text-zinc-400" />}
        </span>
        <span className="min-w-0 flex-1 space-y-0.5">
          {loc ? (
            <>
              <span className="flex items-start gap-1">
                <span className="min-w-0 flex-1 break-words text-base font-medium leading-snug text-zinc-100">{loc.name}</span>
                {isArea && !reorder && (
                  <ChevronDownIcon
                    size={20}
                    className={`mt-0.5 text-zinc-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                  />
                )}
              </span>
              <span className="block break-words text-sm text-zinc-400">{meta}</span>
            </>
          ) : item.location_id ? (
            <span className="block text-base text-zinc-400">Unknown location</span>
          ) : (
            <span className="block whitespace-pre-wrap break-words text-base leading-snug text-zinc-100">{item.note}</span>
          )}
        </span>
      </span>
      {item.location_id && item.note && (
        <span className="mt-2 block">
          <NoteCallout note={item.note} />
        </span>
      )}
    </>
  );

  const mainClass = "block min-h-[3.75rem] w-full p-3 text-left";

  return (
    <div className={`${CARD} relative overflow-hidden`}>
      {reorder ? (
        <div className={mainClass}>{body}</div>
      ) : (
        <button
          type="button"
          onClick={isArea ? () => setOpen((o) => !o) : onEdit}
          aria-expanded={isArea ? expanded : undefined}
          aria-controls={isArea ? panelId : undefined}
          className={`${mainClass} transition-colors active:bg-zinc-800`}
        >
          {body}
        </button>
      )}
      <div className="absolute right-2 top-2 flex gap-1">
        {reorder ? (
          <>
            <button type="button" aria-label="Move up" disabled={reorder.upDisabled} onClick={reorder.onUp} className={`${ROUND} bg-zinc-800`}>
              <ChevronUpIcon size={22} />
            </button>
            <button type="button" aria-label="Move down" disabled={reorder.downDisabled} onClick={reorder.onDown} className={`${ROUND} bg-zinc-800`}>
              <ChevronDownIcon size={22} />
            </button>
          </>
        ) : (
          loc && <DirectionsButton lat={loc.lat} lng={loc.lng} cid={loc.google_cid} name={loc.name} />
        )}
      </div>
      {expanded && (
        <div id={panelId} className="border-t border-white/5 bg-black/20">
          {places.length > 0 ? (
            <ul className="space-y-1 py-2 pl-12 pr-2">
              {places.map((p) => (
                <li key={p.id} className="flex min-h-11 items-center gap-2.5">
                  <span aria-hidden="true" className="text-xl">{p.emoji}</span>
                  <span className="min-w-0 flex-1 break-words text-base text-zinc-100">{p.name}</span>
                  <DirectionsButton lat={p.lat} lng={p.lng} cid={p.google_cid} name={p.name} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-3 pl-12 pr-3 text-sm text-zinc-500">No places saved in this area yet</p>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="flex min-h-11 w-full items-center gap-2 border-t border-white/5 pl-12 pr-3 text-left text-base text-zinc-300 transition-colors active:bg-zinc-800"
          >
            <PencilIcon size={18} className="text-zinc-400" />
            Edit item
          </button>
        </div>
      )}
    </div>
  );
}
