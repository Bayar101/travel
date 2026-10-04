"use client";

import { useState } from "react";
import LocationForm from "@/components/forms/LocationForm";
import Header from "@/components/Header";
import LocationRow from "@/components/LocationRow";
import { useToast } from "@/components/Toast";
import Button from "@/components/ui/Button";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import DirectionsButton from "@/components/ui/DirectionsButton";
import EmptyState from "@/components/ui/EmptyState";
import { ChevronRightIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { CARD, CARD_BUTTON, CHIP, SECTION_HEADING } from "@/components/ui/styles";
import { remove } from "@/lib/api-client";
import { plannedOn } from "@/lib/map-data";
import { goBack, navigate } from "@/lib/router";
import { categoryById, deleteImpact, locationById, placesInArea } from "@/lib/selectors";
import { useTrip } from "@/lib/store";
import { dateBlock, dayNumber } from "@/lib/trip";

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const openLocation = (id: string) => navigate(`/location/${encodeURIComponent(id)}`);

export default function LocationDetailView({ id }: { id: string }) {
  const { data, online } = useTrip();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false); // suppress "Not found" flash between prune and navigation
  if (!data) return null;

  const l = locationById(data, id);
  if (!l && deleted) return null;
  if (!l) {
    return (
      <>
        <Header title="Location" back />
        <EmptyState emoji="🤷" text="Not found" cta={{ label: "Back", onClick: goBack }} />
      </>
    );
  }

  const cat = categoryById(data, l.category_id);
  const parent = l.type === "place" ? locationById(data, l.parent_id) : undefined;
  const places = l.type === "area" ? placesInArea(data, l.id) : [];
  const planned = plannedOn(data, l.id);
  const firstDate = data.days.reduce<string | null>((m, d) => (m === null || d.date < m ? d.date : m), null);
  const impact = deleteImpact(data, "locations", l.id);
  const impactText = [
    impact.places && plural(impact.places, "place"),
    impact.items && plural(impact.items, "day item"),
    impact.stays && plural(impact.stays, "stay"),
  ].filter(Boolean).join(", ");

  return (
    <>
      <Header title={l.name} back />
      <div className="space-y-6 p-4">
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-zinc-900 text-5xl ring-1 ring-white/5">
              {l.emoji}
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="break-words text-2xl font-bold leading-tight tracking-tight text-zinc-100">{l.name}</h2>
              <div className="flex flex-wrap gap-1.5">
                <span className={l.type === "area" ? "inline-flex items-center rounded-full bg-red-500/15 px-2.5 py-0.5 text-sm text-red-300" : CHIP}>
                  {l.type === "area" ? "Area" : "Place"}
                </span>
                {cat && <span className={CHIP}>{cat.emoji ? `${cat.emoji} ${cat.name}` : cat.name}</span>}
                <span className={CHIP}>{l.city}</span>
              </div>
            </div>
          </div>
          {parent && (
            <button type="button" onClick={() => openLocation(parent.id)} className={`flex min-h-14 w-full items-center gap-3 px-3 ${CARD_BUTTON}`}>
              <span aria-hidden="true" className="text-2xl">{parent.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-zinc-400">In area</span>
                <span className="block truncate text-base font-medium text-zinc-100">{parent.name}</span>
              </span>
              <ChevronRightIcon size={20} className="text-zinc-500" />
            </button>
          )}
          {l.description && <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-zinc-200">{l.description}</p>}
          <div className="flex gap-2">
            <DirectionsButton lat={l.lat} lng={l.lng} full primary className="flex-1" />
            <Button variant="secondary" className="px-5" disabled={!online} onClick={() => setEditing(true)}>
              <PencilIcon size={18} />
              Edit
            </Button>
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="planned-on">
          <h3 id="planned-on" className={SECTION_HEADING}>Planned on</h3>
          {planned.length === 0 ? (
            <p className={`px-4 py-3 text-base text-zinc-400 ${CARD}`}>Not on any day yet</p>
          ) : (
            <ul className={`divide-y divide-white/5 overflow-hidden ${CARD}`}>
              {planned.map(({ day, item }) => {
                const b = dateBlock(day.date);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/day/${encodeURIComponent(day.id)}`)}
                      className="flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left transition-colors active:bg-zinc-800"
                    >
                      <span aria-hidden="true" className="flex w-11 shrink-0 flex-col items-center rounded-xl bg-zinc-800 py-1">
                        <span className="text-xs font-semibold uppercase text-zinc-400">{b.weekday}</span>
                        <span className="text-lg font-bold leading-6 tabular-nums text-zinc-100">{b.day}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-zinc-400">
                          {firstDate ? `Day ${dayNumber(firstDate, day.date)} · ` : ""}
                          <span className="sr-only">{`${b.weekday} ${b.day} ${b.month} · `}</span>
                          {item.time ?? "Anytime"}
                        </span>
                        <span className="block truncate text-base text-zinc-100">{day.title || `${b.weekday} ${b.day} ${b.month}`}</span>
                      </span>
                      <ChevronRightIcon size={20} className="text-zinc-500" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {l.type === "area" && (
          <section className="space-y-2" aria-labelledby="places-here">
            <h3 id="places-here" className={SECTION_HEADING}>
              Places here <span className="text-zinc-600">· {places.length}</span>
            </h3>
            {places.length > 0 && (
              <ul className="space-y-2">
                {places.map((p) => (
                  <LocationRow key={p.id} location={p} data={data} withArea={false} />
                ))}
              </ul>
            )}
            <button
              type="button"
              disabled={!online}
              onClick={() => setAdding(true)}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-700 text-base text-zinc-300 transition-colors active:bg-zinc-900 disabled:opacity-50"
            >
              <PlusIcon size={20} />
              Add place here
            </button>
          </section>
        )}

        <div className="flex justify-center pt-2">
          <button
            type="button"
            disabled={!online}
            onClick={() => setDeleting(true)}
            className="flex min-h-11 items-center gap-2 rounded-xl px-4 text-base text-red-400 transition-colors active:bg-red-500/10 disabled:opacity-50"
          >
            <TrashIcon size={18} />
            Delete location
          </button>
        </div>
      </div>
      <LocationForm open={editing} location={l} onClose={() => setEditing(false)} />
      <LocationForm
        open={adding}
        prefill={{ type: "place", parent_id: l.id, city: l.city }}
        onClose={() => setAdding(false)}
      />
      <ConfirmDeleteDialog
        open={deleting}
        title={`Delete ${l.name}?`}
        impact={impactText ? `Also deletes: ${impactText}` : undefined}
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          setDeleted(true); // before the write: prune re-renders synchronously with the location gone
          try {
            await remove("locations", l.id);
          } catch (e) {
            setDeleted(false);
            throw e;
          }
          navigate(parent ? `/location/${encodeURIComponent(parent.id)}` : "/locations");
          toast.show("Location deleted");
        }}
      />
    </>
  );
}
