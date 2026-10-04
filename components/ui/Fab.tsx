"use client";

import { PlusIcon } from "./icons";

/**
 * Primary floating "add" button: 56px red circle, bottom-right above the bottom nav and
 * safe area, aligned to the max-w-md app column. Renders an in-flow spacer so the last
 * list row can scroll clear of it.
 */
export default function Fab({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <>
      <div aria-hidden="true" className="h-20" />
      <div className="pointer-events-none fixed inset-x-0 bottom-(--fab-bottom) z-30 mx-auto flex max-w-md justify-end px-4">
        <button
          type="button"
          aria-label={label}
          title={label}
          disabled={disabled}
          onClick={onClick}
          className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-black/50 ring-1 ring-white/10 transition-transform active:scale-95 active:bg-red-600 disabled:bg-zinc-700 disabled:text-zinc-400 disabled:shadow-none"
        >
          <PlusIcon size={28} strokeWidth={2.25} />
        </button>
      </div>
    </>
  );
}
