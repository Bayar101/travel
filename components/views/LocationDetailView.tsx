"use client";

import { useState } from "react";
import LocationForm from "@/components/forms/LocationForm";
import Header from "@/components/Header";
import LocationRow, { TypeChip } from "@/components/LocationRow";
import { useToast } from "@/components/Toast";
import Button from "@/components/ui/Button";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import EmptyState from "@/components/ui/EmptyState";
import DirectionsButton from "@/components/ui/DirectionsButton";
import { remove } from "@/lib/api-client";
import { goBack, navigate } from "@/lib/router";
import { categoryById, deleteImpact, locationById, placesInArea } from "@/lib/selectors";
import { useTrip } from "@/lib/store";

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

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
  const impact = deleteImpact(data, "locations", l.id);
  const impactText = [
    impact.places && plural(impact.places, "place"),
    impact.items && plural(impact.items, "day item"),
    impact.stays && plural(impact.stays, "stay"),
  ].filter(Boolean).join(", ");

  return (
    <>
      <Header title={l.name} back />
      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="text-6xl">{l.emoji}</span>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="break-words text-xl font-semibold text-zinc-100">{l.name}</h2>
            <div className="flex flex-wrap items-center gap-2 text-base text-zinc-400">
              <TypeChip type={l.type} />
              <span>{l.city}</span>
              {cat && <span>· {cat.emoji ? `${cat.emoji} ` : ""}{cat.name}</span>}
            </div>
          </div>
        </div>
        {parent && (
          <button
            type="button"
            onClick={() => navigate(`/location/${encodeURIComponent(parent.id)}`)}
            className="flex min-h-11 items-center gap-2 text-base text-red-400 active:text-red-300"
          >
            {parent.emoji} In {parent.name} →
          </button>
        )}
        {l.description && <p className="whitespace-pre-wrap break-words text-base text-zinc-100">{l.description}</p>}
        <DirectionsButton lat={l.lat} lng={l.lng} full primary className="w-full" />
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" disabled={!online} onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button variant="danger" className="flex-1" disabled={!online} onClick={() => setDeleting(true)}>
            Delete
          </Button>
        </div>
        {l.type === "area" && (
          <section className="space-y-2">
            <h3 className="text-base font-semibold text-zinc-100">Places in this area</h3>
            {places.length > 0 && (
              <ul className="space-y-2">
                {places.map((p) => (
                  <LocationRow key={p.id} location={p} data={data} />
                ))}
              </ul>
            )}
            <Button variant="secondary" className="w-full" disabled={!online} onClick={() => setAdding(true)}>
              + Add place here
            </Button>
          </section>
        )}
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
