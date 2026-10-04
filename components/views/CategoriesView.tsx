"use client";

import { useState } from "react";
import CategoryForm from "@/components/forms/CategoryForm";
import Header from "@/components/Header";
import EmptyState from "@/components/ui/EmptyState";
import Fab from "@/components/ui/Fab";
import { ChevronRightIcon } from "@/components/ui/icons";
import { CARD_BUTTON, EMOJI_TILE } from "@/components/ui/styles";
import { categoryChoices } from "@/lib/locations-list";
import { useTrip } from "@/lib/store";
import type { Category } from "@/lib/types";

export default function CategoriesView() {
  const { data, online } = useTrip();
  const [editing, setEditing] = useState<Category | undefined>();
  const [creating, setCreating] = useState(false);
  if (!data) return null;

  const cats = categoryChoices(data);

  return (
    <>
      <Header title="Categories" back />
      {cats.length === 0 ? (
        <EmptyState emoji="🏷️" text="No categories yet" cta={online ? { label: "Add category", onClick: () => setCreating(true) } : undefined} />
      ) : (
        <ul className="space-y-2 p-4">
          {cats.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setEditing(data.categories.find((x) => x.id === c.id))}
                className={`flex min-h-16 w-full items-center gap-3 py-2.5 pl-2.5 pr-3 ${CARD_BUTTON}`}
              >
                <span aria-hidden="true" className={EMOJI_TILE}>{c.emoji ?? "🏷️"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium text-zinc-100">{c.name}</span>
                  <span className="block text-sm text-zinc-400">
                    {c.count === 0 ? "No locations" : `${c.count} location${c.count === 1 ? "" : "s"}`}
                  </span>
                </span>
                <ChevronRightIcon size={20} className="text-zinc-500" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {cats.length > 0 && <Fab label="New category" disabled={!online} onClick={() => setCreating(true)} />}
      <CategoryForm open={creating} onClose={() => setCreating(false)} />
      <CategoryForm open={!!editing} category={editing} onClose={() => setEditing(undefined)} />
    </>
  );
}
