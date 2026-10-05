"use client";

import { useState } from "react";
import StayForm from "@/components/forms/StayForm";
import Header from "@/components/Header";
import AirbnbButton from "@/components/ui/AirbnbButton";
import EmptyState from "@/components/ui/EmptyState";
import DirectionsButton from "@/components/ui/DirectionsButton";
import Fab from "@/components/ui/Fab";
import { AlertIcon, ChevronRightIcon } from "@/components/ui/icons";
import { CARD, EMOJI_TILE } from "@/components/ui/styles";
import { locationById } from "@/lib/selectors";
import { useToday } from "@/components/ui/useToday";
import { formatDay, nightsBetween } from "@/lib/stay-dates";
import { gapLabel, stayStatusLabel, stayTimeline, type GapRow, type StayRow } from "@/lib/stays";
import { useTrip } from "@/lib/store";
import type { Stay, TripData } from "@/lib/types";

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

const STATUS_PILL: Record<StayRow["status"], string> = {
  now: "bg-red-500 text-white",
  upcoming: "bg-zinc-800 text-zinc-300",
  past: "bg-zinc-800/60 text-zinc-500",
};
const STATUS_TEXT: Record<StayRow["status"], string> = { now: "Now", upcoming: "Upcoming", past: "Past" };

// Rail dot on the left of each timeline row.
function Dot({ status }: { status: StayRow["status"] }) {
  const cls =
    status === "now"
      ? "bg-red-500 ring-4 ring-red-500/25"
      : status === "upcoming"
        ? "bg-zinc-950 ring-2 ring-zinc-500"
        : "bg-zinc-700";
  return <span aria-hidden="true" className={`absolute top-6 left-[6px] size-3 rounded-full ${cls}`} />;
}

function DateBar({ row, today }: { row: StayRow; today: string }) {
  const { stay, status, nights } = row;
  const done = status === "now" ? nightsBetween(stay.check_in, today) + 0.5 : status === "past" ? nights : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Check-in</p>
          <p className="text-base font-medium tabular-nums text-zinc-100">{formatDay(stay.check_in)}</p>
        </div>
        <span className="mb-0.5 rounded-full bg-zinc-800 px-2.5 py-0.5 text-sm tabular-nums text-zinc-300">
          {plural(nights, "night")}
        </span>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Check-out</p>
          <p className="text-base font-medium tabular-nums text-zinc-100">{formatDay(stay.check_out)}</p>
        </div>
      </div>
      {/* One segment per night; nights already slept fill in. */}
      <div aria-hidden="true" className="flex gap-1">
        {Array.from({ length: nights }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < Math.floor(done) ? (status === "past" ? "bg-zinc-600" : "bg-red-500") : i < done ? "bg-red-500/50" : "bg-zinc-800"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function StayCard({ row, data, today, onEdit }: { row: StayRow; data: TripData; today: string; onEdit: (s: Stay) => void }) {
  const { stay, status } = row;
  const loc = locationById(data, stay.location_id);
  return (
    <div className={`${CARD} ${status === "now" ? "ring-2 ring-red-500" : ""} ${status === "past" ? "opacity-60" : ""}`}>
      <button
        type="button"
        onClick={() => onEdit(stay)}
        aria-label={`Edit ${stay.name}`}
        className="block w-full space-y-3 rounded-t-2xl p-3 text-left transition-colors active:bg-zinc-800"
      >
        <span className="flex items-start gap-3">
          <span aria-hidden="true" className={EMOJI_TILE}>{loc?.emoji ?? "🏠"}</span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 break-words text-base font-semibold text-zinc-100">{stay.name}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${STATUS_PILL[status]}`}>
                {STATUS_TEXT[status]}
              </span>
              <span className={`text-sm ${status === "now" ? "text-red-300" : "text-zinc-400"}`}>
                {[loc?.city, stayStatusLabel(stay, today)].filter(Boolean).join(" · ")}
              </span>
            </span>
          </span>
          <ChevronRightIcon size={20} className="mt-3 text-zinc-600" />
        </span>
        <DateBar row={row} today={today} />
      </button>
      <div className="flex gap-2 px-3 pb-3">
        {loc && <DirectionsButton lat={loc.lat} lng={loc.lng} cid={loc.google_cid} name={stay.name} full primary={status === "now"} className="flex-1" />}
        <AirbnbButton url={stay.airbnb_url} className="flex-1" />
      </div>
    </div>
  );
}

function GapCard({ gap }: { gap: GapRow }) {
  return (
    <div role="note" className="flex items-start gap-3 rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
      <AlertIcon size={20} className="mt-0.5 text-amber-400" />
      <div className="min-w-0">
        <p className="text-base font-medium text-amber-200">No stay booked</p>
        <p className="text-sm text-amber-300/80">{gapLabel(gap)}</p>
      </div>
    </div>
  );
}

export default function StaysView() {
  const { data, online } = useTrip();
  const [editing, setEditing] = useState<Stay | undefined>();
  const [creating, setCreating] = useState(false);
  const today = useToday();
  if (!data) return null;

  const rows = stayTimeline(data.stays, today);
  const stays = rows.filter((r): r is StayRow => r.kind === "stay");
  const gaps = rows.filter((r): r is GapRow => r.kind === "gap");
  const nights = stays.reduce((n, r) => n + r.nights, 0);
  const unbooked = gaps.reduce((n, g) => n + g.nights, 0);

  return (
    <>
      <Header title="Stays" />
      {stays.length === 0 ? (
        <EmptyState emoji="🏠" text="No stays yet" cta={online ? { label: "Add stay", onClick: () => setCreating(true) } : undefined} />
      ) : (
        <div className="space-y-3 p-4">
          <p className="text-sm text-zinc-400">
            {plural(stays.length, "stay")} · {plural(nights, "night")}
            {unbooked > 0 && <span className="text-amber-300"> · {plural(unbooked, "night")} unbooked</span>}
          </p>
          <ol className="relative space-y-3">
            {/* Rail behind the dots */}
            {rows.length > 1 && <span aria-hidden="true" className="absolute top-6 bottom-6 left-3 w-px -translate-x-1/2 bg-zinc-800" />}
            {rows.map((r) =>
              r.kind === "stay" ? (
                <li key={r.stay.id} className="relative pl-7">
                  <Dot status={r.status} />
                  <StayCard row={r} data={data} today={today} onEdit={setEditing} />
                </li>
              ) : (
                <li key={`gap-${r.from}`} className="relative pl-7">
                  <span aria-hidden="true" className="absolute top-4 left-[6px] size-3 rounded-full bg-zinc-950 ring-2 ring-amber-500" />
                  <GapCard gap={r} />
                </li>
              ),
            )}
          </ol>
        </div>
      )}
      {stays.length > 0 && <Fab label="New stay" disabled={!online} onClick={() => setCreating(true)} />}
      <StayForm open={creating} onClose={() => setCreating(false)} />
      <StayForm open={!!editing} stay={editing} onClose={() => setEditing(undefined)} />
    </>
  );
}
