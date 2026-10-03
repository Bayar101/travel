"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import { FormError, TextArea, TimeField } from "@/components/ui/fields";
import Sheet from "@/components/ui/Sheet";
import LocationPicker from "@/components/LocationPicker";
import { useToast } from "@/components/Toast";
import { create, remove, update } from "@/lib/api-client";
import { itemPayload, itemToForm, validateItemForm, type ItemFormErrors, type ItemFormValues } from "@/lib/day-items";
import { locationById } from "@/lib/selectors";
import { useTrip } from "@/lib/store";
import type { DayItem } from "@/lib/types";

function Body({
  dayId,
  item,
  mode,
  onClose,
}: {
  dayId: string;
  item?: DayItem;
  mode?: "location" | "note"; // undefined for a new item: start at the choose step
  onClose: () => void;
}) {
  const { data, online } = useTrip();
  const toast = useToast();
  const [v, setV] = useState<ItemFormValues>(() =>
    item ? itemToForm(item) : { mode: mode ?? "location", location_id: "", time: null, note: "" },
  );
  const [errors, setErrors] = useState<ItemFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(() => !item && mode === "location");
  const [choosing, setChoosing] = useState(!item && !mode);
  const [confirming, setConfirming] = useState(false);

  if (!data) return null;

  const edit = (f: (p: ItemFormValues) => ItemFormValues) => {
    setV(f);
    setError(null); // stale server error
  };
  const loc = locationById(data, v.location_id || null);
  const isLocation = v.mode === "location";

  async function save() {
    if (busy || !data) return;
    const errs = validateItemForm(v);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setError(null);
    setBusy(true);
    const body = itemPayload(v, data.items.filter((i) => i.day_id === dayId), item);
    try {
      if (item) await update<DayItem>("items", item.id, body);
      else await create<DayItem>("items", { day_id: dayId, ...body });
      onClose();
      toast.show(item ? "Item saved" : "Item added");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  }

  function choose(m: "location" | "note") {
    setV((p) => ({ ...p, mode: m }));
    setChoosing(false);
    setPicking(m === "location");
  }

  return (
    <>
      <Sheet
        open
        title={choosing ? "Add to this day" : item ? "Edit item" : isLocation ? "Add location" : "Add note"}
        onClose={busy ? () => {} : onClose}
        footer={
          choosing ? undefined : (
          <>
            <FormError error={error} />
            <div className="flex gap-2">
              {item && (
                <Button variant="secondary" disabled={!online || busy} onClick={() => setConfirming(true)}>
                  Delete
                </Button>
              )}
              <Button type="submit" form="item-form" className="flex-1" disabled={!online} loading={busy}>
                Save
              </Button>
            </div>
          </>
          )
        }
      >
        {choosing ? (
          <div className="space-y-2">
            <Button variant="secondary" className="w-full" onClick={() => choose("location")}>
              📍 Location
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => choose("note")}>
              📝 Note
            </Button>
          </div>
        ) : (
        <form
          id="item-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="space-y-3"
        >
          {isLocation && (
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
          )}
          <TimeField label="Time (optional)" value={v.time} onChange={(x) => edit((p) => ({ ...p, time: x }))} />
          <TextArea
            label={isLocation ? "Note (optional)" : "Note"}
            value={v.note}
            onChange={(x) => {
              edit((p) => ({ ...p, note: x }));
              setErrors((p) => ({ ...p, note: undefined }));
            }}
            error={errors.note}
            placeholder="Transport, weather warnings…"
          />
        </form>
        )}
      </Sheet>
      <Sheet open={picking} title="Choose location" onClose={() => setPicking(false)} autoFocus>
        <LocationPicker
          onPick={(l) => {
            edit((p) => ({ ...p, location_id: l.id }));
            setErrors((p) => ({ ...p, location_id: undefined }));
            setPicking(false);
          }}
        />
      </Sheet>
      {item && (
        <ConfirmDeleteDialog
          open={confirming}
          title="Delete this item?"
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            await remove("items", item.id);
            setConfirming(false);
            onClose();
            toast.show("Item deleted");
          }}
        />
      )}
    </>
  );
}

// Body mounts only while open so fields reset on each open.
export default function ItemForm(props: {
  open: boolean;
  dayId: string;
  item?: DayItem;
  mode?: "location" | "note";
  onClose: () => void;
}) {
  if (!props.open) return null;
  return <Body dayId={props.dayId} item={props.item} mode={props.mode} onClose={props.onClose} />;
}
