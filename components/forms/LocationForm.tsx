"use client";

import { useId, useState } from "react";
import Button from "@/components/ui/Button";
import { SelectField, TextArea, TextField, NumberField } from "@/components/ui/fields";
import Sheet from "@/components/ui/Sheet";
import { useToast } from "@/components/Toast";
import CategoryForm from "./CategoryForm";
import { create, update } from "@/lib/api-client";
import {
  cityList, defaultEmoji, DEFAULT_EMOJI, locationPayload, locationToForm, validateLocationForm,
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

  if (!data) return null;

  const set = <K extends keyof LocationFormValues>(k: K, val: LocationFormValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const typeLocked = !!location && location.type === "area" && placesInArea(data, location.id).length > 0;
  const areas = data.locations.filter((l) => l.type === "area" && l.id !== location?.id);

  function selectCategory(c: Category | undefined) {
    setV((p) => ({
      ...p,
      category_id: c?.id ?? "",
      emoji: emojiTouched ? p.emoji : defaultEmoji(c),
    }));
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
    } else setMapsState("bad");
  }

  async function save() {
    if (busy) return;
    const errs = validateLocationForm(v);
    setErrors(errs);
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

  const shortLink = mapsState === "bad" && /maps\.app\.goo\.gl|goo\.gl\/maps/.test(mapsInput);

  return (
    <>
      <Sheet
        open
        title={location ? "Edit location" : "New location"}
        onClose={busy ? () => {} : onClose}
        footer={
          <Button type="submit" form="location-form" className="w-full" disabled={!online} loading={busy}>
            Save
          </Button>
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
                className={`min-h-11 rounded-lg text-base disabled:opacity-40 ${
                  v.type === t ? "bg-red-500 text-white" : "text-zinc-100 active:bg-zinc-800"
                }`}
              >
                {t === "area" ? "Area" : "Place"}
              </button>
            ))}
          </div>
          {typeLocked && <p className="text-sm text-zinc-400">Area has places, so type is locked.</p>}
          {v.type === "place" && (
            <SelectField
              label="Area (optional)"
              value={v.parent_id}
              onChange={(x) => set("parent_id", x)}
              options={[{ value: "", label: "None" }, ...areas.map((a) => ({ value: a.id, label: `${a.emoji} ${a.name}` }))]}
            />
          )}
          <TextField label="Name" value={v.name} onChange={(x) => set("name", x)} error={errors.name} autoComplete="off" />
          <TextArea label="Description (optional)" value={v.description} onChange={(x) => set("description", x)} />
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
          <TextField
            label="Emoji"
            value={v.emoji}
            maxLength={8}
            error={errors.emoji}
            autoComplete="off"
            onChange={(x) => {
              setEmojiTouched(true);
              set("emoji", x);
            }}
          />
          <div>
            <TextField label="City" value={v.city} onChange={(x) => set("city", x)} error={errors.city} list={cityListId} autoComplete="off" />
            <datalist id={cityListId}>
              {cityList(data).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <TextField
              label="Paste Google Maps link or coordinates"
              value={mapsInput}
              onChange={onMapsInput}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
            />
            {mapsState === "ok" && <p className="mt-1 text-base text-green-400">✓ Coordinates filled</p>}
            {mapsState === "bad" && (
              <p className="mt-1 text-base text-amber-300">
                {shortLink
                  ? "Open the link in a browser and copy the full URL"
                  : "Couldn't find coordinates in that text"}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Latitude" value={v.lat} onChange={(x) => set("lat", x)} error={errors.lat} />
            <NumberField label="Longitude" value={v.lng} onChange={(x) => set("lng", x)} error={errors.lng} />
          </div>
          {error && (
            <p role="alert" className="text-base text-red-400">
              {error}
            </p>
          )}
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
