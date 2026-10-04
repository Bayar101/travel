"use client";

import { useMemo, useState } from "react";
import LocationForm from "@/components/forms/LocationForm";
import { LocationRowBody } from "@/components/LocationRow";
import FilterChip, { ChipRow, SearchField } from "@/components/ui/FilterChip";
import { PlusIcon } from "@/components/ui/icons";
import { SECTION_HEADING } from "@/components/ui/styles";
import { applyFilter, EMPTY_FILTER, groupByCity, TYPE_CHIPS } from "@/lib/locations-list";
import { useTrip } from "@/lib/store";
import type { Location, LocationType } from "@/lib/types";

/**
 * Search + type chips + city-grouped rows (same row look as the Locations list).
 * The search field never autofocuses: the keyboard would cover the list on open.
 */
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

  const groups = useMemo(() => {
    if (!data) return [];
    const list = applyFilter(data, { ...EMPTY_FILTER, query, type });
    return groupByCity(filter ? list.filter(filter) : list);
  }, [data, query, type, filter]);

  if (!data) return null;

  return (
    <div className="space-y-2">
      <SearchField value={query} onChange={setQuery} />
      <ChipRow label="Type">
        {TYPE_CHIPS.map((c) => (
          <FilterChip key={c.label} active={type === c.type} onClick={() => setType(c.type)}>
            {c.label}
          </FilterChip>
        ))}
      </ChipRow>
      <button
        type="button"
        disabled={!online}
        onClick={() => setCreating(true)}
        className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-left text-base text-zinc-100 transition-colors active:bg-zinc-800 disabled:opacity-50"
      >
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-600 text-zinc-300">
          <PlusIcon size={22} />
        </span>
        New location
      </button>
      {groups.length === 0 ? (
        <p className="py-6 text-center text-base text-zinc-400">No locations found</p>
      ) : (
        groups.map((g) => (
          <section key={g.city} aria-label={g.city}>
            <h3 className={`px-2 pb-1 pt-2 ${SECTION_HEADING}`}>
              {g.city} <span className="text-zinc-600">· {g.locations.length}</span>
            </h3>
            <ul>
              {g.locations.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => onPick(l)}
                    className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors active:bg-zinc-800"
                  >
                    <LocationRowBody location={l} data={data} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      {/* Nested sheet; a created location is picked right away. */}
      <LocationForm open={creating} prefill={{ type }} onClose={() => setCreating(false)} onSaved={onPick} />
    </div>
  );
}
