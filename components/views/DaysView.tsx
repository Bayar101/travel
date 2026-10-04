"use client";

import { useLayoutEffect, useRef, useState } from "react";
import DayForm from "@/components/forms/DayForm";
import Header from "@/components/Header";
import { useToast } from "@/components/Toast";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Fab from "@/components/ui/Fab";
import { CARD } from "@/components/ui/styles";
import { logout } from "@/lib/api-client";
import { claimScroll, navigate } from "@/lib/router";
import { stayForNight, todayISO } from "@/lib/selectors";
import { formatDay } from "@/lib/stay-dates";
import { useTrip } from "@/lib/store";

// Days list scroll for this session: null until first shown (then centered on today);
// afterwards the position when leaving, restored on return (back from a day, tab switch).
let savedY: number | null = null;

export default function DaysView() {
  const { data, online } = useTrip();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const target = useRef<HTMLLIElement>(null);

  // Layout effects: restore before paint, and save on unmount while the list is still in the DOM.
  useLayoutEffect(() => {
    claimScroll({ view: "days" });
    if (savedY === null) target.current?.scrollIntoView({ block: "center" });
    else window.scrollTo(0, savedY);
    return () => {
      savedY = window.scrollY;
    };
  }, []);

  if (!data) return null;

  const today = todayISO();
  const days = [...data.days].sort((a, b) => a.date.localeCompare(b.date));
  const hasToday = days.some((d) => d.date === today);
  const targetId = (days.find((d) => d.date >= today) ?? days[days.length - 1])?.id;
  const counts = new Map<string, number>();
  for (const i of data.items) counts.set(i.day_id, (counts.get(i.day_id) ?? 0) + 1);

  async function doLogout() {
    setLoggingOut(true);
    try {
      await logout(); // redirects to /login on success
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Logout failed", "error");
      setLoggingOut(false);
    }
  }

  return (
    <>
      <Header title="Days" />
      {days.length === 0 ? (
        <EmptyState emoji="📅" text="No days yet" cta={online ? { label: "New day", onClick: () => setCreating(true) } : undefined} />
      ) : (
        <>
          {hasToday && (
            <div className="pointer-events-none sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 flex justify-end px-4 pt-2">
              <button
                type="button"
                onClick={() => target.current?.scrollIntoView({ block: "center", behavior: "smooth" })}
                className="pointer-events-auto min-h-11 rounded-full bg-red-500 px-4 text-base font-medium text-white shadow-lg active:bg-red-600"
              >
                Today
              </button>
            </div>
          )}
          <ul className="space-y-3 p-4">
            {days.map((d) => {
              const isToday = d.date === today;
              const night = stayForNight(data, d.date);
              const n = counts.get(d.id) ?? 0;
              return (
                <li key={d.id} ref={d.id === targetId ? target : undefined}>
                  <button
                    type="button"
                    onClick={() => navigate(`/day/${encodeURIComponent(d.id)}`)}
                    className={`block min-h-14 w-full space-y-0.5 p-3 text-left active:bg-zinc-800 ${CARD} ${
                      isToday ? "ring-2 ring-red-500" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-lg font-semibold text-zinc-100">{formatDay(d.date)}</span>
                      {isToday && (
                        <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-sm font-medium text-white">Today</span>
                      )}
                    </span>
                    {d.title && <span className="block break-words text-base text-zinc-100">{d.title}</span>}
                    <span className="flex items-center gap-2 text-sm text-zinc-400">
                      <span className="min-w-0 flex-1 truncate">{night ? `🏠 ${night.stay.name}` : "No hotel"}</span>
                      <span className="shrink-0">{n} item{n === 1 ? "" : "s"}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <div className="flex justify-center px-4 pb-6 pt-2">
        <Button variant="ghost" className="text-zinc-400" disabled={!online} loading={loggingOut} onClick={() => void doLogout()}>
          Log out
        </Button>
      </div>
      {days.length > 0 && <Fab label="New day" disabled={!online} onClick={() => setCreating(true)} />}
      <DayForm open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
