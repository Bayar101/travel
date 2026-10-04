"use client";

import { BedIcon, CalendarIcon, MapIcon, MapPinIcon } from "@/components/ui/icons";
import { navigate, type Route } from "@/lib/router";

const TABS = [
  { path: "/", label: "Days", Icon: CalendarIcon, views: ["days", "day"] },
  { path: "/locations", label: "Locations", Icon: MapPinIcon, views: ["locations", "location", "categories"] },
  { path: "/stays", label: "Stays", Icon: BedIcon, views: ["stays"] },
  { path: "/map", label: "Map", Icon: MapIcon, views: ["map"] },
] as const;

export default function BottomNav({ route }: { route: Route }) {
  return (
    <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-md">
        {TABS.map(({ path, label, Icon, views }) => {
          const active = (views as readonly string[]).includes(route.view);
          return (
            <button
              key={path}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => navigate(path)}
              className={`flex h-16 flex-1 flex-col items-center justify-center gap-1 text-sm font-medium transition-colors ${
                active ? "text-red-500" : "text-zinc-500 active:text-zinc-300"
              }`}
            >
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                  active ? "bg-red-500/15" : ""
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2 : 1.75} />
              </span>
              <span className="leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
