"use client";

import { useMemo, useState } from "react";
import LocationForm from "@/components/forms/LocationForm";
import Button from "@/components/ui/Button";
import { filterLocations, locationById } from "@/lib/selectors";
import { useTrip } from "@/lib/store";
import type { Location, LocationType } from "@/lib/types";

const CHIPS: { label: string; type?: LocationType }[] = [
  { label: "All" },
  { label: "Areas", type: "area" },
  { label: "Places", type: "place" },
];

export default function LocationPicker({
  onPick,
  filter,
}: {
  onPick: (location: Location) => void;
  filter?: (location: Location) => boolean;
}) {
  const { data, online } = useTrip();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<LocationType | undefined>();
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => {
    if (!data) return [];
    const list = filterLocations(data, { query, type });
    return filter ? list.filter(filter) : list;
  }, [data, query, type, filter]);

  if (!data) return null;

  return (
    <div className="space-y-3">
      <input
        autoFocus
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search locations"
        aria-label="Search locations"
        enterKeyHint="search"
        autoCapitalize="off"
        autoCorrect="off"
        className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-base text-zinc-100 placeholder:text-zinc-600"
      />
      <div className="flex gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            aria-pressed={type === c.type}
            onClick={() => setType(c.type)}
            className={`min-h-11 rounded-full px-4 text-base ${
              type === c.type ? "bg-red-500 text-white" : "bg-zinc-800 text-zinc-100 active:bg-zinc-700"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <Button variant="secondary" className="w-full" disabled={!online} onClick={() => setCreating(true)}>
        + New location
      </Button>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-base text-zinc-400">No locations found</p>
      ) : (
        <ul className="divide-y divide-zinc-800">
          {rows.map((l) => {
            const area = l.type === "place" ? locationById(data, l.parent_id) : undefined;
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => onPick(l)}
                  className="flex min-h-14 w-full items-center gap-3 py-2 text-left active:bg-zinc-800"
                >
                  <span aria-hidden="true" className="text-2xl">{l.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base text-zinc-100">{l.name}</span>
                    <span className="block truncate text-sm text-zinc-400">
                      {l.city}
                      {area ? ` · ${area.name}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-sm text-zinc-400">
                    {l.type === "area" ? "Area" : "Place"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {/* Nested sheet; a created location is picked right away. */}
      <LocationForm open={creating} prefill={{ type }} onClose={() => setCreating(false)} onSaved={onPick} />
    </div>
  );
}
