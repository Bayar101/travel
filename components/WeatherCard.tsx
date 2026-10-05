"use client";

import { useEffect, useRef, useState } from "react";
import { get, set } from "idb-keyval";
import { CARD, SECTION_HEADING } from "@/components/ui/styles";
import { useToday } from "@/components/ui/useToday";
import type { TripData } from "@/lib/types";
import {
  forecastStatus, forecastUrl, parseForecast, weatherLocation, wmo, type Forecast, type ForecastJson, type Slot,
} from "@/lib/weather";

const FRESH_MS = 3 * 60 * 60 * 1000;
type Cached = { at: number; forecast: Forecast };
type State = { forecast: Forecast | null; ageH: number; failed: boolean };

// Cached per place + date in IndexedDB: fresh copies skip the network, stale ones show offline.
function useForecast(url: string, date: string): State {
  const [state, setState] = useState<State>({ forecast: null, ageH: 0, failed: false });
  useEffect(() => {
    let live = true;
    const key = `weather:${url}`;
    (async () => {
      const hit = await get<Cached>(key).catch(() => undefined);
      if (!live) return;
      if (hit) setState({ forecast: hit.forecast, ageH: Math.floor((Date.now() - hit.at) / 3_600_000), failed: false });
      if (hit && Date.now() - hit.at < FRESH_MS) return;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const fresh = { at: Date.now(), forecast: parseForecast((await res.json()) as ForecastJson, date) };
        if (!live) return;
        setState({ forecast: fresh.forecast, ageH: 0, failed: false });
        set(key, fresh).catch(() => {});
      } catch {
        if (live && !hit) setState({ forecast: null, ageH: 0, failed: true });
      }
    })();
    return () => {
      live = false;
    };
  }, [url, date]);
  return state;
}

export default function WeatherCard({ data, date }: { data: TripData; date: string }) {
  const today = useToday();
  const loc = weatherLocation(data, date);
  if (!loc) return null;
  const status = forecastStatus(date, today);
  if (status === "past") return null;
  const place = loc.city || loc.name;
  if (status === "far") {
    return (
      <section aria-label="Weather" className={`p-3 ${CARD}`}>
        <p className="text-sm text-zinc-400">🌤️ {place} forecast shows ~2 weeks before</p>
      </section>
    );
  }
  return <Forecasted url={forecastUrl(loc.lat, loc.lng, date, today)} date={date} place={place} isToday={date === today} />;
}

function Forecasted({ url, date, place, isToday }: { url: string; date: string; place: string; isToday: boolean }) {
  const { forecast: f, ageH, failed } = useForecast(url, date);
  if (failed) return null;
  return (
    <section aria-label="Weather" className={`space-y-3 p-3 ${CARD}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className={SECTION_HEADING}>Weather · {place}</h3>
        {ageH >= 3 && <span className="text-xs text-zinc-500">Updated {ageH}h ago</span>}
      </div>
      {f ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <SlotTile label="Day" slot={f.day} isDay />
            <SlotTile label="Night" slot={f.night} isDay={false} />
          </div>
          <HourStrip hours={f.hours} isToday={isToday} />
        </>
      ) : (
        <div aria-busy="true" className="h-[9.5rem] animate-pulse rounded-xl bg-zinc-800/60" />
      )}
    </section>
  );
}

function SlotTile({ label, slot, isDay }: { label: string; slot: Slot; isDay: boolean }) {
  const { emoji, label: desc } = wmo(slot.code, isDay);
  return (
    <div className="flex items-center gap-2 rounded-xl bg-zinc-800/60 p-2.5">
      <span aria-hidden="true" className="text-3xl">{emoji}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
        <p className="text-lg font-semibold tabular-nums leading-tight text-zinc-100">
          {slot.temp}°<span className="sr-only"> {isDay ? "high" : "low"}</span>
        </p>
        <p className="truncate text-xs text-zinc-400">
          {desc}
          {slot.rain >= 10 && ` · 💧${slot.rain}%`}
        </p>
      </div>
    </div>
  );
}

function HourStrip({ hours, isToday }: { hours: Forecast["hours"]; isToday: boolean }) {
  const strip = useRef<HTMLOListElement>(null);
  const [start] = useState(() => (isToday ? new Date().getHours() : 6)); // device clock ≈ trip timezone while travelling
  useEffect(() => {
    const el = strip.current?.children[start] as HTMLElement | undefined;
    if (el && strip.current) strip.current.scrollLeft = el.offsetLeft - strip.current.offsetLeft;
  }, [start]);
  // Own the horizontal gesture so it scrolls the strip instead of swiping to another day.
  const stop = (e: React.TouchEvent) => e.stopPropagation();
  return (
    <ol
      ref={strip}
      aria-label="Hourly forecast"
      onTouchStart={stop}
      onTouchMove={stop}
      onTouchEnd={stop}
      className="-mx-3 flex overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {hours.map((h) => (
        <li key={h.hour} className="flex w-12 shrink-0 flex-col items-center gap-1 py-1">
          <span className={`text-xs tabular-nums ${isToday && h.hour === start ? "font-semibold text-red-400" : "text-zinc-500"}`}>
            {isToday && h.hour === start ? "Now" : String(h.hour).padStart(2, "0")}
          </span>
          <span aria-label={wmo(h.code, h.isDay).label} className="text-xl">{wmo(h.code, h.isDay).emoji}</span>
          <span className="text-sm font-semibold tabular-nums text-zinc-100">{h.temp}°</span>
          <span className="h-4 text-[0.6875rem] tabular-nums text-sky-400">{h.rain >= 20 ? `${h.rain}%` : ""}</span>
        </li>
      ))}
    </ol>
  );
}
