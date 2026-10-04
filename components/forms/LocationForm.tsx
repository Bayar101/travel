"use client";

import { useEffect, useId, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import FilterChip from "@/components/ui/FilterChip";
import { CheckIcon, ChevronDownIcon, ExternalLinkIcon } from "@/components/ui/icons";
import { FormError, SelectField, TextArea, TextField, NumberField } from "@/components/ui/fields";
import Sheet from "@/components/ui/Sheet";
import { useToast } from "@/components/Toast";
import CategoryForm from "./CategoryForm";
import { create, resolveMapsLink, update } from "@/lib/api-client";
import {
  clearAutoCoords, cityList, coordsSummary, shouldFillName, defaultEmoji, DEFAULT_EMOJI, QUICK_EMOJI, locationPayload, locationToForm, validateLocationForm,
  type LocationFormErrors, type LocationFormValues,
} from "@/lib/location-form";
import { categoryById, placesInArea } from "@/lib/selectors";
import { mapsUrl, parseLatLng } from "@/lib/maps";
import { extractShortLink, isAllowedMapsUrl, placeNameFromUrl } from "@/lib/maps-link";
import { useTrip } from "@/lib/store";
import type { Category, Location, LocationType } from "@/lib/types";

const NEW_CATEGORY = "__new__";
const RESOLVE_DELAY_MS = 400; // typing a short link by hand: wait for a pause

type MapsState = "idle" | "ok" | "approx" | "bad" | "resolving" | "short-failed" | "short-offline";

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
  const [mapsState, setMapsState] = useState<MapsState>("idle");
  const [nameFilled, setNameFilled] = useState(false);
  const resolveSeq = useRef(0); // newest paste wins; stale responses are dropped
  const resolveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(resolveTimer.current), []);
  const latest = useRef(v); // async link resolution reads the current Name
  const autoName = useRef<string | null>(null);
  const autoCoords = useRef<{ lat: string; lng: string } | null>(null); // last link-filled lat/lng
  const [failMsg, setFailMsg] = useState("");
  useEffect(() => {
    latest.current = v;
  });
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

  // Name: empty or previously link-filled only (never over typed text).
  function fillName(name: string | null): boolean {
    const fill = shouldFillName(latest.current.name, autoName.current, name);
    if (fill) {
      autoName.current = name;
      setV((p) => ({ ...p, name: name! }));
      setErrors((e) => ({ ...e, name: undefined }));
    }
    setNameFilled(fill);
    return fill;
  }

  function fillFromLink(ll: { lat: number; lng: number }, name: string | null, approximate = false) {
    const coords = { lat: String(ll.lat), lng: String(ll.lng) };
    autoCoords.current = coords;
    setV((p) => ({ ...p, ...coords }));
    fillName(name);
    setErrors((e) => ({ ...e, lat: undefined, lng: undefined }));
    setError(null);
    setMapsState(approximate ? "approx" : "ok");
  }

  // Failed paste: drop coordinates the previous paste filled (manual entries stay), open the editor.
  function failLink(state: MapsState, name: string | null = null, msg = "") {
    const auto = autoCoords.current; // updater runs later: capture before resetting the ref
    autoCoords.current = null;
    setV((p) => clearAutoCoords(p, auto));
    fillName(name);
    setFailMsg(msg);
    setMapsState(state);
    setCoordsOpen(true);
  }

  function onMapsInput(s: string) {
    setMapsInput(s);
    clearTimeout(resolveTimer.current);
    const seq = ++resolveSeq.current;
    setNameFilled(false);
    if (!s.trim()) return setMapsState("idle");
    const ll = parseLatLng(s);
    if (ll) return fillFromLink(ll, placeNameFromUrl(s));
    // Short link, or a full place URL without coordinates (server geocodes its name).
    const full = s.match(/https:\/\/\S+/)?.[0];
    const short = extractShortLink(s) ?? (full && isAllowedMapsUrl(full) && placeNameFromUrl(full) ? full : null);
    if (!short) return failLink("bad");
    if (!online) return failLink("short-offline");
    setMapsState("resolving");
    resolveTimer.current = setTimeout(async () => {
      try {
        const r = await resolveMapsLink(short);
        if (seq !== resolveSeq.current) return;
        if (r.ok) fillFromLink(r, r.name, r.approximate);
        else failLink("short-failed", r.name, r.error);
      } catch (e) {
        if (seq === resolveSeq.current) failLink("short-failed", null, e instanceof Error ? e.message : "");
      }
    }, RESOLVE_DELAY_MS);
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
            <p role="status" aria-live="polite" className="mt-1 text-sm">
              {mapsState === "idle" && (
                <span className="text-zinc-500">
                  Google Maps → Share → Copy link{online ? "" : " · short links need a connection"}
                </span>
              )}
              {mapsState === "resolving" && (
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
                  Reading link…
                </span>
              )}
              {mapsState === "ok" && (
                <span className="flex items-center gap-1.5 text-green-400">
                  <CheckIcon size={16} className="shrink-0" />
                  <span className="min-w-0">
                    {nameFilled ? "Name and coordinates filled" : "Coordinates filled"} · <span className="tabular-nums">{coordsSummary(v)}</span>
                  </span>
                </span>
              )}
              {mapsState === "bad" && <span className="text-amber-300">Couldn&apos;t find coordinates in that text — enter them below</span>}
              {mapsState === "approx" && (
                <span className="flex flex-wrap items-center gap-x-2 text-amber-300">
                  <span>
                    {nameFilled ? "Name filled · " : ""}Location found by name — check the pin on the map after saving
                  </span>
                  <a
                    href={mapsUrl(Number(v.lat), Number(v.lng))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1 font-medium text-amber-200 underline underline-offset-2"
                  >
                    Verify in Google Maps
                    <ExternalLinkIcon size={14} />
                  </a>
                </span>
              )}
              {mapsState === "short-failed" && (
                <span className="text-amber-300">
                  {nameFilled ? "Name filled · " : ""}
                  {failMsg && failMsg !== "You're offline" ? failMsg : "Couldn't read that link — enter coordinates below"}
                </span>
              )}
              {mapsState === "short-offline" && (
                <span className="text-amber-300">You&apos;re offline — short links need a connection. Enter coordinates below</span>
              )}
            </p>
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
