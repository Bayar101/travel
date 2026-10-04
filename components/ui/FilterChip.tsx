"use client";

import { SearchIcon } from "./icons";

/**
 * Filter pill in a horizontally scrolling chip row: 36px pill inside a 44px tap target.
 * Active = red; inactive = zinc-800.
 */
export default function FilterChip({
  active,
  onClick,
  children,
  ...rest
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children">) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className="group flex h-11 shrink-0 items-center" {...rest}>
      <span
        className={`flex h-9 items-center gap-1 whitespace-nowrap rounded-full px-3.5 text-base transition-colors ${
          active ? "bg-red-500 font-medium text-white" : "bg-zinc-800 text-zinc-200 group-active:bg-zinc-700"
        }`}
      >
        {children}
      </span>
    </button>
  );
}

/** Horizontal scroll row for FilterChips; bleeds to the screen edges (inside a px-4 parent). */
export function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </div>
  );
}

/** Search field with leading icon (Locations list, picker). Never autofocuses. */
export function SearchField({
  value,
  onChange,
  placeholder = "Search locations",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <SearchIcon size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="search"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        className="min-h-11 w-full rounded-xl bg-zinc-800/70 pl-10 pr-3 text-base text-zinc-100 ring-1 ring-white/5 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/60"
      />
    </div>
  );
}
