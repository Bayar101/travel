"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import { TextField } from "@/components/ui/fields";
import Sheet from "@/components/ui/Sheet";
import { useToast } from "@/components/Toast";
import { create, remove, update } from "@/lib/api-client";
import { deleteImpact } from "@/lib/selectors";
import { useTrip } from "@/lib/store";
import type { Category } from "@/lib/types";

function Body({
  category,
  onClose,
  onSaved,
}: {
  category?: Category;
  onClose: () => void;
  onSaved?: (c: Category) => void;
}) {
  const { data, online } = useTrip();
  const toast = useToast();
  const [name, setName] = useState(category?.name ?? "");
  const [emoji, setEmoji] = useState(category?.emoji ?? "");
  const [nameError, setNameError] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function save() {
    if (busy) return;
    if (!name.trim()) return setNameError("Name is required");
    setNameError(undefined);
    setError(null);
    setBusy(true);
    const body = { name: name.trim(), emoji: emoji.trim() || null };
    try {
      const saved = category
        ? await update<Category>("categories", category.id, body)
        : await create<Category>("categories", body);
      onClose();
      toast.show(category ? "Category saved" : "Category added");
      onSaved?.(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  }

  const impact = category && data ? deleteImpact(data, "categories", category.id).uncategorized : 0;

  return (
    <>
      <Sheet
        open
        title={category ? "Edit category" : "New category"}
        onClose={busy ? () => {} : onClose}
        footer={
          <div className="flex gap-2">
            {category && (
              <Button variant="secondary" disabled={!online || busy} onClick={() => setConfirming(true)}>
                Delete
              </Button>
            )}
            <Button type="submit" form="category-form" className="flex-1" disabled={!online} loading={busy}>
              Save
            </Button>
          </div>
        }
      >
        <form
          id="category-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="space-y-3"
        >
          <TextField label="Name" value={name} onChange={setName} error={nameError} autoComplete="off" />
          <TextField label="Emoji (optional)" value={emoji} onChange={setEmoji} maxLength={8} autoComplete="off" />
          {error && (
            <p role="alert" className="text-base text-red-400">
              {error}
            </p>
          )}
        </form>
      </Sheet>
      {category && (
        <ConfirmDeleteDialog
          open={confirming}
          title={`Delete ${category.name}?`}
          impact={`${impact} location${impact === 1 ? "" : "s"} will become uncategorized`}
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            await remove("categories", category.id);
            setConfirming(false);
            onClose();
            toast.show("Category deleted");
          }}
        />
      )}
    </>
  );
}

// Body mounts only while open so fields reset on each open.
export default function CategoryForm(props: {
  open: boolean;
  category?: Category;
  onClose: () => void;
  onSaved?: (c: Category) => void;
}) {
  if (!props.open) return null;
  return <Body category={props.category} onClose={props.onClose} onSaved={props.onSaved} />;
}
