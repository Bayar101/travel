"use client";

import { useLayoutEffect, useRef, useState } from "react";
import DayForm from "@/components/forms/DayForm";
import Header from "@/components/Header";
import { useToast } from "@/components/Toast";
import { Spinner } from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Fab from "@/components/ui/Fab";
import IconButton from "@/components/ui/IconButton";
import { BedIcon, CalendarIcon, ChevronRightIcon, LogoutIcon, MoreIcon, TagIcon } from "@/components/ui/icons";
import Sheet from "@/components/ui/Sheet";
import { CARD, CARD_BUTTON } from "@/components/ui/styles";
import { logout } from "@/lib/api-client";
import { claimScroll, navigate } from "@/lib/router";
import { stayForNight } from "@/lib/selectors";
import { useToday } from "@/components/ui/useToday";
import { useTrip } from "@/lib/store";
import { dateBlock, dayListRows, itemPreviews, tripStatus, tripSummary } from "@/lib/trip";
import type { Day, TripData } from "@/lib/types";

const PREVIEWS = 3;

// Days list scroll for this session: null until first shown (then centered on today);
// afterwards the position when leaving, restored on return (back from a day, tab switch).
let savedY: number | null = null;

const openDay = (id: string) => navigate(`/day/${encodeURIComponent(id)}`);

function TripCard({ days, today }: { days: Day[]; today: string }) {
  const status = tripStatus(days, today);
  if (status.kind === "empty") return null;
  const { title, detail } = tripSummary(status);
  const todayId = status.kind === "during" ? status.todayId : null;
  const progress = status.kind === "during" ? status.dayNumber / status.total : null;
  return (
    <section aria-label="Trip" className={`${CARD} space-y-3 p-4`}>
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
          <CalendarIcon size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-zinc-100">{title}</p>
          {detail && <p className="text-sm text-zinc-400">{detail}</p>}
        </div>
        {todayId && (
          <button
            type="button"
            onClick={() => openDay(todayId)}
            className="flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-red-500 pl-4 pr-3 text-base font-semibold text-white active:bg-red-600"
          >
            Today
            <ChevronRightIcon size={18} strokeWidth={2.25} />
          </button>
        )}
      </div>
      {progress !== null && (
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </section>
  );
}

function DayCard({ data, day, n, isToday, isPast }: { data: TripData; day: Day; n: number; isToday: boolean; isPast: boolean }) {
  const night = stayForNight(data, day.date);
  const { previews, more } = itemPreviews(data, day.id, PREVIEWS);
  const timeCol = previews.some((p) => p.time); // keep emoji aligned when timed and untimed mix
  const b = dateBlock(day.date);
  return (
    <button
      type="button"
      onClick={() => openDay(day.id)}
      className={`flex w-full gap-3 p-3 ${CARD_BUTTON} ${isToday ? "ring-2 ring-red-500" : ""} ${isPast ? "opacity-60" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 ${isToday ? "bg-red-500 text-white" : "bg-zinc-800 text-zinc-100"}`}
      >
        <span className={`text-xs font-semibold uppercase ${isToday ? "text-white/85" : "text-zinc-400"}`}>{b.weekday}</span>
        <span className="text-2xl font-bold leading-7 tabular-nums">{b.day}</span>
        <span className={`text-xs ${isToday ? "text-white/85" : "text-zinc-500"}`}>{b.month}</span>
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${isToday ? "text-red-400" : "text-zinc-500"}`}>
            Day {n}
          </span>
          {isToday && <span className="rounded-full bg-red-500 px-2 text-xs font-semibold leading-5 text-white">Today</span>}
          <span className="sr-only">{`, ${b.weekday} ${b.day} ${b.month}`}</span>
        </span>
        {day.title && <span className="block break-words text-base font-semibold leading-snug text-zinc-100">{day.title}</span>}
        {night && (
          <span className="flex items-center gap-1.5 text-sm text-zinc-400">
            <BedIcon size={16} className="text-zinc-500" />
            <span className="min-w-0 truncate">{night.stay.name}</span>
          </span>
        )}
        {previews.length > 0 ? (
          <span className="block space-y-0.5 pt-1">
            {previews.map((p) => (
              <span key={p.id} className="flex items-center gap-1.5 text-sm text-zinc-300">
                {timeCol && <span className="w-11 shrink-0 tabular-nums text-zinc-400">{p.time}</span>}
                <span aria-hidden="true" className="shrink-0">{p.emoji}</span>
                <span className="min-w-0 truncate">{p.text}</span>
              </span>
            ))}
            {more > 0 && <span className="block text-sm text-zinc-500">+{more} more</span>}
          </span>
        ) : (
          <span className="block pt-1 text-sm text-zinc-500">No plans yet</span>
        )}
      </span>
      <ChevronRightIcon size={20} className="self-center text-zinc-600" />
    </button>
  );
}

export default function DaysView() {
  const { data, online } = useTrip();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [menu, setMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const target = useRef<HTMLLIElement>(null);
  const today = useToday();

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

  const rows = dayListRows(data.days);
  const dayRows = rows.filter((r) => r.kind === "day");
  // First shown: centre on today / next upcoming day; before the trip, stay at the top.
  const started = dayRows.length > 0 && dayRows[0].day.date <= today;
  const ongoing = started && today <= dayRows[dayRows.length - 1].day.date; // dim past days only mid-trip
  const targetId = started ? (dayRows.find((r) => r.day.date >= today) ?? dayRows[dayRows.length - 1]).day.id : null;

  async function doLogout() {
    setLoggingOut(true);
    try {
      await logout(); // redirects to /login on success
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Logout failed", "error");
      setLoggingOut(false);
    }
  }

  const MENU_ROW = "flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left text-base transition-colors active:bg-zinc-800 disabled:opacity-50";

  return (
    <>
      <Header
        title="Days"
        action={
          <IconButton label="More" onClick={() => setMenu(true)}>
            <MoreIcon size={24} />
          </IconButton>
        }
      />
      {rows.length === 0 ? (
        <EmptyState emoji="📅" text="No days yet" cta={online ? { label: "New day", onClick: () => setCreating(true) } : undefined} />
      ) : (
        <div className="space-y-4 p-4">
          <TripCard days={data.days} today={today} />
          <ul className="space-y-3">
            {rows.map((r) =>
              r.kind === "gap" ? (
                <li key={r.key} className="flex items-center gap-3 px-1 py-0.5" aria-label={r.label}>
                  <span className="h-px flex-1 bg-zinc-800" />
                  <span className="text-sm text-zinc-500">{r.label}</span>
                  <span className="h-px flex-1 bg-zinc-800" />
                </li>
              ) : (
                <li key={r.day.id} ref={r.day.id === targetId ? target : undefined}>
                  <DayCard data={data} day={r.day} n={r.dayNumber} isToday={r.day.date === today} isPast={ongoing && r.day.date < today} />
                </li>
              ),
            )}
          </ul>
        </div>
      )}
      {rows.length > 0 && <Fab label="New day" disabled={!online} onClick={() => setCreating(true)} />}
      <DayForm open={creating} onClose={() => setCreating(false)} />
      <Sheet open={menu} title="Menu" onClose={() => setMenu(false)}>
        <div className="space-y-1">
          <button
            type="button"
            className={`${MENU_ROW} text-zinc-100`}
            onClick={() => {
              setMenu(false);
              navigate("/categories");
            }}
          >
            <TagIcon size={22} className="text-zinc-400" />
            <span className="flex-1">Categories</span>
            <ChevronRightIcon size={20} className="text-zinc-600" />
          </button>
          <button type="button" className={`${MENU_ROW} text-red-400`} disabled={!online || loggingOut} onClick={() => void doLogout()}>
            <LogoutIcon size={22} />
            <span className="flex-1">Log out</span>
            {loggingOut && <Spinner />}
          </button>
        </div>
      </Sheet>
    </>
  );
}
