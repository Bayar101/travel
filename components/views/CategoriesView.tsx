"use client";

import { useState } from "react";
import CategoryForm from "@/components/forms/CategoryForm";
import Header from "@/components/Header";
import EmptyState from "@/components/ui/EmptyState";
import { useTrip } from "@/lib/store";
import type { Category } from "@/lib/types";

export default function CategoriesView() {
  const { data, online } = useTrip();
  const [editing, setEditing] = useState<Category | undefined>();
  const [creating, setCreating] = useState(false);
  if (!data) return null;

  const count = (id: string) => data.locations.filter((l) => l.category_id === id).length;

  return (
    <>
      <Header
        title="Categories"
        back
        action={
          <button
            type="button"
            aria-label="New category"
            disabled={!online}
            onClick={() => setCreating(true)}
            className="flex size-11 items-center justify-center rounded-lg text-2xl text-zinc-100 active:bg-zinc-800 disabled:opacity-50"
          >
            +
          </button>
        }
      />
      {data.categories.length === 0 ? (
        <EmptyState emoji="🏷️" text="No categories yet" cta={online ? { label: "Add category", onClick: () => setCreating(true) } : undefined} />
      ) : (
        <ul className="space-y-2 p-4">
          {data.categories.map((c) => {
            const n = count(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setEditing(c)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-left active:bg-zinc-800"
                >
                  <span aria-hidden="true" className="w-8 text-center text-2xl">{c.emoji ?? "🏷️"}</span>
                  <span className="min-w-0 flex-1 truncate text-base text-zinc-100">{c.name}</span>
                  <span className="shrink-0 text-sm text-zinc-400">
                    {n} location{n === 1 ? "" : "s"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <CategoryForm open={creating} onClose={() => setCreating(false)} />
      <CategoryForm open={!!editing} category={editing} onClose={() => setEditing(undefined)} />
    </>
  );
}
