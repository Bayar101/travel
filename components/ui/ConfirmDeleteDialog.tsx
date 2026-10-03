"use client";

import { useState } from "react";
import Button from "./Button";
import Sheet from "./Sheet";

const PHRASE = "delete me";

function Body({
  title,
  impact,
  onConfirm,
  onClose,
}: {
  title: string;
  impact?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ok = value === PHRASE;

  async function run() {
    if (!ok || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      title={title}
      onClose={busy ? () => {} : onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" className="flex-1" onClick={run} disabled={!ok} loading={busy}>
            Delete
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
        className="space-y-3"
      >
        {impact && <p className="rounded-lg bg-amber-500/10 p-3 text-base text-amber-300">{impact}</p>}
        <label className="block">
          <span className="mb-1 block text-base text-zinc-400">
            Type <b className="text-zinc-100">{PHRASE}</b> to confirm
          </span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={PHRASE}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-base text-zinc-100 placeholder:text-zinc-600"
          />
        </label>
        {error && (
          <p role="alert" className="text-base text-red-400">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}

// Body is mounted only while open so typed text / error reset on each open.
export default function ConfirmDeleteDialog(props: {
  open: boolean;
  title: string;
  impact?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  if (!props.open) return null;
  return <Body {...props} />;
}
