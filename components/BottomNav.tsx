"use client";

import { navigate, type Route } from "@/lib/router";

const TABS = [
  { path: "/", label: "Days", emoji: "📅", views: ["days", "day"] },
  { path: "/locations", label: "Locations", emoji: "📍", views: ["locations", "location", "categories"] },
  { path: "/stays", label: "Stays", emoji: "🏠", views: ["stays"] },
  { path: "/map", label: "Map", emoji: "🗺️", views: ["map"] },
] as const;

export default function BottomNav({ route }: { route: Route }) {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const active = (t.views as readonly string[]).includes(route.view);
          return (
            <button
              key={t.path}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => navigate(t.path)}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-sm ${
                active ? "text-red-500" : "text-zinc-400"
              }`}
            >
              <span className="text-xl leading-none" aria-hidden>{t.emoji}</span>
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
