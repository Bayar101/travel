"use client";

import { useMemo, useState } from "react";
import LocationForm from "@/components/forms/LocationForm";
import Header from "@/components/Header";
import LocationRow from "@/components/LocationRow";
import EmptyState from "@/components/ui/EmptyState";
import { cityList } from "@/lib/location-form";
import { navigate } from "@/lib/router";
import { filterLocations } from "@/lib/selectors";
import { useTrip } from "@/lib/store";
import type { LocationType } from "@/lib/types";

const CHIPS: { label: string; type?: LocationType }[] = [
  { label: "All" },
  { label: "Areas", type: "area" },
  { label: "Places", type: "place" },
];
const SELECT =
  "min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-base text-zinc-100";
const HEADER_BTN = "flex size-11 items-center justify-center rounded-lg text-2xl text-zinc-100 active:bg-zinc-800";

export default function LocationsView() {
  const { data, online } = useTrip();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<LocationType | undefined>();
  const [city, setCity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [creating, setCreating] = useState(false);

  const rows = useMemo(
    () =>
      data
        ? filterLocations(data, { query, type, city: city || undefined, category_id: categoryId || undefined })
        : [],
    [data, query, type, city, categoryId],
  );
  if (!data) return null;

  return (
    <>
      <Header
        title="Locations"
        action={
          <>
            <button type="button" aria-label="Categories" onClick={() => navigate("/categories")} className={HEADER_BTN}>
              🏷️
            </button>
            <button
              type="button"
              aria-label="New location"
              disabled={!online}
              onClick={() => setCreating(true)}
              className={`${HEADER_BTN} disabled:opacity-50`}
            >
              +
            </button>
          </>
        }
      />
      <div className="space-y-3 p-4">
        <input
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
        <div className="flex gap-2">
          <select aria-label="City" value={city} onChange={(e) => setCity(e.target.value)} className={SELECT}>
            <option value="">All cities</option>
            {cityList(data).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select aria-label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={SELECT}>
            <option value="">All categories</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>{`${c.emoji ?? ""} ${c.name}`.trim()}</option>
            ))}
          </select>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            emoji="🗺️"
            text={data.locations.length === 0 ? "No locations yet" : "No locations match"}
            cta={data.locations.length === 0 && online ? { label: "Add location", onClick: () => setCreating(true) } : undefined}
          />
        ) : (
          <ul className="space-y-2">
            {rows.map((l) => (
              <LocationRow key={l.id} location={l} data={data} />
            ))}
          </ul>
        )}
      </div>
      <LocationForm open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
