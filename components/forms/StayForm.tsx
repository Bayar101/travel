"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import { DateField, TextField } from "@/components/ui/fields";
import Sheet from "@/components/ui/Sheet";
import LocationPicker from "@/components/LocationPicker";
import { useToast } from "@/components/Toast";
import { create, remove, update } from "@/lib/api-client";
import { locationById } from "@/lib/selectors";
import { stayPayload, stayToForm, validateStayForm, type StayFormErrors, type StayFormValues } from "@/lib/stay-form";
import { useTrip } from "@/lib/store";
import type { Stay } from "@/lib/types";

const EMPTY: StayFormValues = { location_id: "", name: "", airbnb_url: "", check_in: "", check_out: "" };

function Body({ stay, onClose }: { stay?: Stay; onClose: () => void }) {
  const { data, online } = useTrip();
  const toast = useToast();
  const [v, setV] = useState<StayFormValues>(() => (stay ? stayToForm(stay) : EMPTY));
  const [errors, setErrors] = useState<StayFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!data) return null;

  const set = <K extends keyof StayFormValues>(k: K, val: StayFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const loc = locationById(data, v.location_id || null);

  async function save() {
    if (busy) return;
    const errs = validateStayForm(v);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setError(null);
    setBusy(true);
    const body = stayPayload(v);
    try {
      if (stay) await update<Stay>("stays", stay.id, body);
      else await create<Stay>("stays", body);
      onClose();
      toast.show(stay ? "Stay saved" : "Stay added");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  }

  return (
    <>
      <Sheet
        open
        title={stay ? "Edit stay" : "New stay"}
        onClose={busy ? () => {} : onClose}
        footer={
          <div className="flex gap-2">
            {stay && (
              <Button variant="secondary" disabled={!online || busy} onClick={() => setConfirming(true)}>
                Delete
              </Button>
            )}
            <Button type="submit" form="stay-form" className="flex-1" disabled={!online} loading={busy}>
              Save
            </Button>
          </div>
        }
      >
        <form
          id="stay-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="space-y-3"
        >
          <div>
            <span className="mb-1 block text-base text-zinc-400">Location</span>
            <button
              type="button"
              onClick={() => setPicking(true)}
              className={`flex min-h-11 w-full items-center gap-2 rounded-lg border bg-zinc-950 px-3 text-left text-base active:bg-zinc-800 ${
                errors.location_id ? "border-red-500" : "border-zinc-800"
              }`}
            >
              {loc ? (
                <>
                  <span aria-hidden="true">{loc.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-zinc-100">{loc.name}</span>
                  <span className="text-sm text-zinc-400">Change</span>
                </>
              ) : (
                <span className="text-zinc-400">Choose location</span>
              )}
            </button>
            {errors.location_id && (
              <p role="alert" className="mt-1 text-base text-red-400">
                {errors.location_id}
              </p>
            )}
          </div>
          <TextField label="Name" value={v.name} onChange={(x) => set("name", x)} error={errors.name} autoComplete="off" />
          <TextField
            label="Airbnb link"
            value={v.airbnb_url}
            onChange={(x) => set("airbnb_url", x)}
            error={errors.airbnb_url}
            type="url"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
          />
          <DateField label="Check-in" value={v.check_in} onChange={(x) => set("check_in", x)} error={errors.check_in} />
          <DateField label="Check-out" value={v.check_out} onChange={(x) => set("check_out", x)} error={errors.check_out} />
          {error && (
            <p role="alert" className="text-base text-red-400">
              {error}
            </p>
          )}
        </form>
      </Sheet>
      <Sheet open={picking} title="Choose location" onClose={() => setPicking(false)} autoFocus>
        <LocationPicker
          onPick={(l) => {
            setV((p) => ({ ...p, location_id: l.id, name: p.name.trim() ? p.name : l.name }));
            setErrors((p) => ({ ...p, location_id: undefined, ...(v.name.trim() ? {} : { name: undefined }) }));
            setPicking(false);
          }}
        />
      </Sheet>
      {stay && (
        <ConfirmDeleteDialog
          open={confirming}
          title={`Delete ${stay.name}?`}
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            await remove("stays", stay.id);
            setConfirming(false);
            onClose();
            toast.show("Stay deleted");
          }}
        />
      )}
    </>
  );
}

// Body mounts only while open so fields reset on each open.
export default function StayForm(props: { open: boolean; stay?: Stay; onClose: () => void }) {
  if (!props.open) return null;
  return <Body stay={props.stay} onClose={props.onClose} />;
}
