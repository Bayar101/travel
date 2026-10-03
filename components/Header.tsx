"use client";

import { goBack } from "@/lib/router";

export default function Header({
  title,
  back,
  action,
}: {
  title: string;
  back?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="flex min-h-14 items-center gap-1 px-2">
        {back && (
          <button
            type="button"
            aria-label="Back"
            onClick={goBack}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-2xl text-zinc-100 active:bg-zinc-800"
          >
            ←
          </button>
        )}
        <h1 className={`min-w-0 flex-1 truncate text-lg font-semibold ${back ? "" : "px-2"}`}>{title}</h1>
        {action && <div className="flex shrink-0 items-center">{action}</div>}
      </div>
    </header>
  );
}
