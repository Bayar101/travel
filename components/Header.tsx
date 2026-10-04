"use client";

import IconButton from "@/components/ui/IconButton";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { goBack } from "@/lib/router";

/**
 * Sticky top bar. Top-level tabs (no `back`): large bold title. Detail pages (`back`):
 * back chevron + compact title. `action`: 44px IconButtons (SVG icons).
 */
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
    <header className="pt-safe sticky top-0 z-30 border-b border-white/5 bg-zinc-950/85 backdrop-blur-md">
      <div className={`flex h-14 items-center gap-1 ${back ? "px-1" : "pl-4 pr-1"}`}>
        {back && (
          <IconButton label="Back" onClick={goBack}>
            <ChevronLeftIcon size={26} />
          </IconButton>
        )}
        <h1
          className={`min-w-0 flex-1 truncate text-zinc-100 ${
            back ? "text-lg font-semibold" : "text-2xl font-bold tracking-tight"
          }`}
        >
          {title}
        </h1>
        {action && <div className="flex shrink-0 items-center gap-0.5">{action}</div>}
      </div>
    </header>
  );
}
