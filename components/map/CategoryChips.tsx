"use client";

import type { Chip, CategorySelection } from "@/lib/map-data";

export default function CategoryChips({ chips, value, onChange }: {
  chips: Chip[]; value: CategorySelection; onChange: (v: CategorySelection) => void;
}) {
  return (
    <div className="pointer-events-auto flex w-fit max-w-full gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          aria-pressed={c.key === value}
          onClick={() => onChange(c.key)}
          className={`min-h-11 shrink-0 rounded-full border px-4 text-base whitespace-nowrap shadow ${
            c.key === value ? "border-red-500 bg-red-500 text-white" : "border-zinc-700 bg-zinc-900/90 text-zinc-100"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
