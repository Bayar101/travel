"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import { DateField, TextArea, TextField } from "@/components/ui/fields";
import Sheet from "@/components/ui/Sheet";
import { useToast } from "@/components/Toast";
import { create, update } from "@/lib/api-client";
import { dayPayload, dayToForm, defaultNewDayDate, validateDayForm, type DayFormErrors, type DayFormValues } from "@/lib/day-form";
import { deleteImpact, todayISO } from "@/lib/selectors";
import { useTrip } from "@/lib/store";
import type { Day } from "@/lib/types";

function Body({ day, onClose, onDelete }: { day?: Day; onClose: () => void; onDelete?: () => Promise<void> }) {
  const { data, online } = useTrip();
  const toast = useToast();
  const [v, setV] = useState<DayFormValues>(() =>
    day ? dayToForm(day) : { date: defaultNewDayDate(data?.days ?? [], todayISO()), title: "", note: "" },
  );
  const [errors, setErrors] = useState<DayFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!data) return null;

  const set = <K extends keyof DayFormValues>(k: K, val: DayFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const n = day ? deleteImpact(data, "days", day.id).items : 0;

  async function save() {
    if (busy) return;
    const errs = validateDayForm(v);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setError(null);
    setBusy(true);
    const body = dayPayload(v);
    try {
      if (day) await update<Day>("days", day.id, body);
      else await create<Day>("days", body);
      onClose();
      toast.show(day ? "Day saved" : "Day added");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed"); // incl. 409 duplicate date
      setBusy(false);
    }
  }

  return (
    <>
      <Sheet
        open
        title={day ? "Edit day" : "New day"}
        onClose={busy ? () => {} : onClose}
        footer={
          <div className="flex gap-2">
            {day && onDelete && (
              <Button variant="secondary" disabled={!online || busy} onClick={() => setConfirming(true)}>
                Delete
              </Button>
            )}
            <Button type="submit" form="day-form" className="flex-1" disabled={!online} loading={busy}>
              Save
            </Button>
          </div>
        }
      >
        <form
          id="day-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="space-y-3"
        >
          <DateField label="Date" value={v.date} onChange={(x) => set("date", x)} error={errors.date} />
          <TextField label="Title" value={v.title} onChange={(x) => set("title", x)} placeholder="Tokyo arrival" autoComplete="off" />
          <TextArea label="Note" value={v.note} onChange={(x) => set("note", x)} placeholder="Weather, transport, reminders…" />
          {error && (
            <p role="alert" className="text-base text-red-400">
              {error}
            </p>
          )}
        </form>
      </Sheet>
      {day && onDelete && (
        <ConfirmDeleteDialog
          open={confirming}
          title="Delete this day?"
          impact={`Also deletes: ${n} item${n === 1 ? "" : "s"}`}
          onClose={() => setConfirming(false)}
          onConfirm={onDelete}
        />
      )}
    </>
  );
}

// Body mounts only while open so fields reset on each open. `onDelete` runs the delete + navigation (parent owns it).
export default function DayForm(props: { open: boolean; day?: Day; onClose: () => void; onDelete?: () => Promise<void> }) {
  if (!props.open) return null;
  return <Body day={props.day} onClose={props.onClose} onDelete={props.onDelete} />;
}
