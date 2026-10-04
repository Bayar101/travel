"use client";

import { chipState, type CategoryFilter, type Chip, type ChipState } from "@/lib/map-data";

const BASE =
  "min-h-11 shrink-0 rounded-full border px-4 text-base font-medium whitespace-nowrap shadow-[0_1px_3px_#0000004d]";
const STYLE: Record<ChipState, string> = {
  off: "border-transparent bg-white text-[#3c4043] active:bg-zinc-100",
  include: "border-[#1a73e8] bg-[#e8f0fe] text-[#1a73e8]",
  exclude: "border-[#d93025] bg-white text-[#d93025]",
};
const ARIA: Record<ChipState, string> = { off: "not filtered", include: "showing only", exclude: "hidden" };

export default function CategoryChips({ chips, filter, empty, onToggle, onClear, showHint }: {
  chips: Chip[]; filter: CategoryFilter; empty: boolean; showHint: boolean;
  onToggle: (key: string) => void; onClear: () => void;
}) {
  return (
    <>
      <div className="pointer-events-auto flex w-fit max-w-full gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
        {chips.map((c) => {
          if (c.key === "all") {
            return (
              <button
                key="all"
                type="button"
                aria-pressed={empty}
                onClick={onClear}
                className={`${BASE} ${empty ? STYLE.include : STYLE.off}`}
              >
                {c.label}
              </button>
            );
          }
          const st = chipState(filter, c.key);
          return (
            <button
              key={c.key}
              type="button"
              aria-label={`${c.label}, ${ARIA[st]}`}
              onClick={() => onToggle(c.key)}
              className={`${BASE} ${STYLE[st]}`}
            >
              {st === "include" && <span aria-hidden="true">✓ </span>}
              {st === "exclude" && <span aria-hidden="true">✕ </span>}
              <span className={st === "exclude" ? "line-through" : undefined}>{c.label}</span>
            </button>
          );
        })}
      </div>
      {showHint && (
        <p className="mx-4 w-fit max-w-[calc(100%-2rem)] rounded-2xl bg-[#e8f0fe] px-3 py-1 text-base text-[#1a73e8] shadow-[0_1px_3px_#0000004d]">
          Tap a category to show only it · tap again to hide it
        </p>
      )}
    </>
  );
}
