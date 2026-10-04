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
          className={`min-h-11 shrink-0 rounded-full border px-4 text-base font-medium whitespace-nowrap shadow-[0_1px_3px_#0000004d] ${
            c.key === value ? "border-[#1a73e8] bg-[#e8f0fe] text-[#1a73e8]" : "border-transparent bg-white text-[#3c4043] active:bg-zinc-100"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
