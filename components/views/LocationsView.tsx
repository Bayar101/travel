"use client";

import { useMemo, useState } from "react";
import LocationForm from "@/components/forms/LocationForm";
import Header from "@/components/Header";
import LocationRow from "@/components/LocationRow";
import EmptyState from "@/components/ui/EmptyState";
import Fab from "@/components/ui/Fab";
import FilterChip, { ChipRow, SearchField } from "@/components/ui/FilterChip";
import IconButton from "@/components/ui/IconButton";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, PencilIcon, TagIcon } from "@/components/ui/icons";
import Sheet from "@/components/ui/Sheet";
import { EMOJI_TILE, SECTION_HEADING } from "@/components/ui/styles";
import { cityList } from "@/lib/location-form";
import {
  activeFilter, applyFilter, categoryChipLabel, categoryChoices, EMPTY_FILTER, groupByCity, isFiltered, TYPE_CHIPS,
  type LocationListFilter,
} from "@/lib/locations-list";
import { navigate } from "@/lib/router";
import { useTrip } from "@/lib/store";

const SHEET_ROW =
  "flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-left text-base transition-colors active:bg-zinc-800";

// Filters survive list → detail → back (the view unmounts on navigation).
let remembered: LocationListFilter = EMPTY_FILTER;

export default function LocationsView() {
  const { data, online } = useTrip();
  const [raw, setRawState] = useState<LocationListFilter>(() => remembered);
  const setRaw = (next: LocationListFilter | ((p: LocationListFilter) => LocationListFilter)) =>
    setRawState((p) => (remembered = typeof next === "function" ? next(p) : next));
  const [creating, setCreating] = useState(false);
  const [catSheet, setCatSheet] = useState(false);

  const f = useMemo(() => (data ? activeFilter(data, raw) : raw), [data, raw]);
  const set = (patch: Partial<LocationListFilter>) => setRaw((p) => ({ ...p, ...patch }));
  const cities = useMemo(() => (data ? cityList(data) : []), [data]);
  const groups = useMemo(() => (data ? groupByCity(applyFilter(data, f)) : []), [data, f]);
  if (!data) return null;

  const empty = data.locations.length === 0;

  return (
    <>
      <Header
        title="Locations"
        action={
          <IconButton label="Categories" onClick={() => navigate("/categories")}>
            <TagIcon size={22} />
          </IconButton>
        }
      />
      {empty ? (
        <EmptyState
          emoji="🗺️"
          text="No locations yet"
          cta={online ? { label: "Add location", onClick: () => setCreating(true) } : undefined}
        />
      ) : (
        <div className="space-y-2 px-4 pt-3">
          <SearchField value={raw.query} onChange={(query) => set({ query })} />
          <ChipRow label="Filters">
            {TYPE_CHIPS.map((c) => (
              <FilterChip key={c.label} active={f.type === c.type} onClick={() => set({ type: c.type })}>
                {c.label}
              </FilterChip>
            ))}
            {cities.length > 1 && (
              <>
                <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-zinc-700" />
                {cities.map((c) => (
                  <FilterChip key={c} active={f.city === c} onClick={() => set({ city: f.city === c ? "" : c })}>
                    {c}
                  </FilterChip>
                ))}
              </>
            )}
            {data.categories.length > 0 && (
              <>
                <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-zinc-700" />
                <FilterChip active={!!f.categoryId} onClick={() => setCatSheet(true)} aria-haspopup="dialog">
                  {categoryChipLabel(data, f.categoryId)}
                  <ChevronDownIcon size={16} />
                </FilterChip>
              </>
            )}
          </ChipRow>
          {groups.length === 0 ? (
            <EmptyState
              emoji="🔍"
              text="No locations match"
              cta={isFiltered(f) ? { label: "Clear filters", onClick: () => setRaw(EMPTY_FILTER) } : undefined}
            />
          ) : (
            groups.map((g) => (
              <section key={g.city} aria-label={g.city}>
                <h2
                  className={`sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 bg-zinc-950/90 px-5 pb-2 pt-3 backdrop-blur-md ${SECTION_HEADING}`}
                >
                  {g.city} <span className="text-zinc-600">· {g.locations.length}</span>
                </h2>
                <ul className="space-y-2">
                  {g.locations.map((l) => (
                    <LocationRow key={l.id} location={l} data={data} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      )}
      {!empty && <Fab label="New location" disabled={!online} onClick={() => setCreating(true)} />}
      <LocationForm open={creating} prefill={f.type ? { type: f.type } : undefined} onClose={() => setCreating(false)} />
      <Sheet open={catSheet} title="Category" onClose={() => setCatSheet(false)}>
        <ul className="space-y-0.5">
          <li>
            <button
              type="button"
              aria-pressed={!f.categoryId}
              className={`${SHEET_ROW} text-zinc-100`}
              onClick={() => {
                set({ categoryId: "" });
                setCatSheet(false);
              }}
            >
              <span aria-hidden="true" className={`${EMOJI_TILE} text-zinc-300`}>
                <TagIcon size={22} />
              </span>
              <span className="flex-1">All categories</span>
              {!f.categoryId && <CheckIcon size={22} className="text-red-400" />}
            </button>
          </li>
          {categoryChoices(data).map((c) => (
            <li key={c.id}>
              <button
                type="button"
                aria-pressed={f.categoryId === c.id}
                className={`${SHEET_ROW} text-zinc-100`}
                onClick={() => {
                  set({ categoryId: c.id });
                  setCatSheet(false);
                }}
              >
                <span aria-hidden="true" className={EMOJI_TILE}>{c.emoji ?? "🏷️"}</span>
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="text-sm tabular-nums text-zinc-500">{c.count}</span>
                <span className="flex w-6 justify-center">
                  {f.categoryId === c.id && <CheckIcon size={22} className="text-red-400" />}
                </span>
              </button>
            </li>
          ))}
          <li className="border-t border-white/5 pt-1">
            <button
              type="button"
              className={`${SHEET_ROW} text-zinc-300`}
              onClick={() => {
                setCatSheet(false);
                navigate("/categories");
              }}
            >
              <span className="flex size-11 items-center justify-center text-zinc-400">
                <PencilIcon size={20} />
              </span>
              <span className="flex-1">Manage categories</span>
              <ChevronRightIcon size={20} className="text-zinc-600" />
            </button>
          </li>
        </ul>
      </Sheet>
    </>
  );
}
