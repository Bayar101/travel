"use client";

import { useId, useState } from "react";
import Button from "@/components/ui/Button";
import FilterChip from "@/components/ui/FilterChip";
import { CheckIcon, ChevronDownIcon } from "@/components/ui/icons";
import { FormError, SelectField, TextArea, TextField, NumberField } from "@/components/ui/fields";
import Sheet from "@/components/ui/Sheet";
import { useToast } from "@/components/Toast";
import CategoryForm from "./CategoryForm";
import { create, update } from "@/lib/api-client";
import {
  cityList, coordsSummary, defaultEmoji, DEFAULT_EMOJI, QUICK_EMOJI, locationPayload, locationToForm, validateLocationForm,
  type LocationFormErrors, type LocationFormValues,
} from "@/lib/location-form";
import { categoryById, placesInArea } from "@/lib/selectors";
import { parseLatLng } from "@/lib/maps";
import { useTrip } from "@/lib/store";
import type { Category, Location, LocationType } from "@/lib/types";

const NEW_CATEGORY = "__new__";

export interface LocationPrefill {
  type?: LocationType;
  parent_id?: string;
  city?: string;
}

function emptyForm(prefill?: LocationPrefill): LocationFormValues {
  return {
    type: prefill?.type ?? "place", parent_id: prefill?.parent_id ?? "", name: "", description: "",
    category_id: "", emoji: DEFAULT_EMOJI, city: prefill?.city ?? "", lat: "", lng: "",
  };
}

function Body({
  location,
  prefill,
  onClose,
  onSaved,
}: {
  location?: Location;
  prefill?: LocationPrefill;
  onClose: () => void;
  onSaved?: (l: Location) => void;
}) {
  const { data, online } = useTrip();
  const toast = useToast();
  const cityListId = useId();
  const [v, setV] = useState<LocationFormValues>(() => (location ? locationToForm(location) : emptyForm(prefill)));
  const [emojiTouched, setEmojiTouched] = useState(!!location);
  const [mapsInput, setMapsInput] = useState("");
  const [mapsState, setMapsState] = useState<"idle" | "ok" | "bad">("idle");
  const [errors, setErrors] = useState<LocationFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newCategory, setNewCategory] = useState(false);
  const [coordsOpen, setCoordsOpen] = useState(false);
  const emojiLabelId = useId();
  const coordsId = useId();

  if (!data) return null;

  const set = <K extends keyof LocationFormValues>(k: K, val: LocationFormValues[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    setError(null); // stale server error
  };

  const typeLocked = !!location && location.type === "area" && placesInArea(data, location.id).length > 0;
  const areas = data.locations.filter((l) => l.type === "area" && l.id !== location?.id);

  function selectCategory(c: Category | undefined) {
    setV((p) => ({
      ...p,
      category_id: c?.id ?? "",
      emoji: emojiTouched ? p.emoji : defaultEmoji(c),
    }));
  }

  function pickEmoji(e: string) {
    setEmojiTouched(true);
    set("emoji", e);
  }

  function pickCategory(id: string) {
    if (id === NEW_CATEGORY) return setNewCategory(true);
    selectCategory(categoryById(data!, id || null));
  }

  function onMapsInput(s: string) {
    setMapsInput(s);
    if (!s.trim()) return setMapsState("idle");
    const ll = parseLatLng(s);
    if (ll) {
      setV((p) => ({ ...p, lat: String(ll.lat), lng: String(ll.lng) }));
      setMapsState("ok");
    } else {
      setMapsState("bad");
      setCoordsOpen(true);
    }
  }

  async function save() {
    if (busy) return;
    const errs = validateLocationForm(v);
    setErrors(errs);
    if (errs.lat || errs.lng) setCoordsOpen(true);
    if (Object.keys(errs).length) return;
    setError(null);
    setBusy(true);
    const body = locationPayload(v);
    try {
      const saved = location
        ? await update<Location>("locations", location.id, body)
        : await create<Location>("locations", body);
      onClose();
      toast.show(location ? "Location saved" : "Location added");
      onSaved?.(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  }

  const cities = cityList(data);
  const coordErr = !!(errors.lat || errors.lng);
  const shortLink = mapsState === "bad" && /maps\.app\.goo\.gl|goo\.gl\/maps/.test(mapsInput);

  return (
    <>
      <Sheet
        open
        title={location ? "Edit location" : "New location"}
        onClose={busy ? () => {} : onClose}
        footer={
          <>
            <FormError error={error} />
            <Button type="submit" form="location-form" className="w-full" disabled={!online} loading={busy}>
              Save
            </Button>
          </>
        }
      >
        <form
          id="location-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="space-y-3"
        >
          <div role="group" aria-label="Type" className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-950 p-1">
            {(["area", "place"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={v.type === t}
                disabled={typeLocked && v.type !== t}
                onClick={() => set("type", t)}
                className={`min-h-11 rounded-lg text-base transition-colors disabled:opacity-40 ${
                  v.type === t ? "bg-red-500 font-medium text-white" : "text-zinc-300 active:bg-zinc-800"
                }`}
              >
                {t === "area" ? "Area" : "Place"}
              </button>
            ))}
          </div>
          {typeLocked && <p className="text-sm text-zinc-400">Area has places, so type is locked.</p>}
          <div>
            <TextField
              label="Paste Google Maps link"
              value={mapsInput}
              onChange={onMapsInput}
              placeholder="https://www.google.com/maps/place/…"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
            />
            {mapsState === "idle" && <p className="mt-1 text-sm text-zinc-500">Share → Copy link in Google Maps</p>}
            {mapsState === "ok" && (
              <p role="status" className="mt-1 flex items-center gap-1.5 text-sm text-green-400">
                <CheckIcon size={16} /> Coordinates filled · {coordsSummary(v)}
              </p>
            )}
            {mapsState === "bad" && (
              <p role="status" className="mt-1 text-sm text-amber-300">
                {shortLink
                  ? "Short link: open it in a browser, then copy the full URL — or enter coordinates below"
                  : "Couldn't find coordinates in that text — enter them below"}
              </p>
            )}
          </div>
          <TextField label="Name" value={v.name} onChange={(x) => set("name", x)} error={errors.name} autoComplete="off" />
          <div>
            <TextField label="City" value={v.city} onChange={(x) => set("city", x)} error={errors.city} list={cityListId} autoComplete="off" />
            <datalist id={cityListId}>
              {cities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {cities.length > 0 && (
              <div className="-mx-4 mt-1 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {cities.map((c) => (
                  <FilterChip key={c} active={v.city === c} onClick={() => set("city", c)}>
                    {c}
                  </FilterChip>
                ))}
              </div>
            )}
          </div>
          {v.type === "place" && (
            <SelectField
              label="Area (optional)"
              value={v.parent_id}
              onChange={(x) => set("parent_id", x)}
              options={[{ value: "", label: "None" }, ...areas.map((a) => ({ value: a.id, label: `${a.emoji} ${a.name}` }))]}
            />
          )}
          <SelectField
            label="Category"
            value={v.category_id}
            onChange={pickCategory}
            options={[
              { value: "", label: "None" },
              ...data.categories.map((c) => ({ value: c.id, label: `${c.emoji ?? ""} ${c.name}`.trim() })),
              { value: NEW_CATEGORY, label: "New category…" },
            ]}
          />
          <div role="group" aria-labelledby={emojiLabelId}>
            <p id={emojiLabelId} className="mb-1 text-base text-zinc-400">Emoji</p>
            <div className="grid grid-cols-6 gap-1.5">
              {QUICK_EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-label={`Use ${e}`}
                  aria-pressed={v.emoji === e}
                  onClick={() => pickEmoji(e)}
                  className={`flex h-11 items-center justify-center rounded-xl text-2xl transition-colors ${
                    v.emoji === e ? "bg-red-500/20 ring-2 ring-red-500" : "bg-zinc-800 active:bg-zinc-700"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <TextField label="Or type any emoji" value={v.emoji} maxLength={16} error={errors.emoji} autoComplete="off" onChange={pickEmoji} />
            </div>
          </div>
          <TextArea label="Description (optional)" value={v.description} onChange={(x) => set("description", x)} />
          <div className="rounded-xl bg-zinc-950 ring-1 ring-white/5">
            <button
              type="button"
              aria-expanded={coordsOpen}
              aria-controls={coordsId}
              onClick={() => setCoordsOpen((o) => !o)}
              className="flex min-h-12 w-full items-center gap-2 px-3 text-left"
            >
              <span className="flex-1 text-base text-zinc-300">Coordinates</span>
              <span className={`truncate text-sm tabular-nums ${coordErr ? "text-red-400" : "text-zinc-500"}`}>
                {coordsSummary(v) ?? (coordErr ? "Required" : "Not set")}
              </span>
              <ChevronDownIcon size={20} className={`text-zinc-500 transition-transform ${coordsOpen ? "rotate-180" : ""}`} />
            </button>
            {coordsOpen && (
              <div id={coordsId} className="grid grid-cols-2 gap-2 px-3 pb-3">
                <NumberField label="Latitude" value={v.lat} onChange={(x) => set("lat", x)} error={errors.lat} />
                <NumberField label="Longitude" value={v.lng} onChange={(x) => set("lng", x)} error={errors.lng} />
              </div>
            )}
          </div>
        </form>
      </Sheet>
      <CategoryForm
        open={newCategory}
        onClose={() => setNewCategory(false)}
        onSaved={selectCategory}
      />
    </>
  );
}

// Body mounts only while open so fields reset on each open.
export default function LocationForm(props: {
  open: boolean;
  location?: Location;
  prefill?: LocationPrefill;
  onClose: () => void;
  onSaved?: (l: Location) => void;
}) {
  if (!props.open) return null;
  return <Body location={props.location} prefill={props.prefill} onClose={props.onClose} onSaved={props.onSaved} />;
}
