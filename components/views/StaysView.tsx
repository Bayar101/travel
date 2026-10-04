"use client";

import { useState } from "react";
import StayForm from "@/components/forms/StayForm";
import Header from "@/components/Header";
import AirbnbButton from "@/components/ui/AirbnbButton";
import EmptyState from "@/components/ui/EmptyState";
import DirectionsButton from "@/components/ui/DirectionsButton";
import Fab from "@/components/ui/Fab";
import { CARD } from "@/components/ui/styles";
import { locationById, todayISO } from "@/lib/selectors";
import { formatStayRange, isCurrentStay } from "@/lib/stay-dates";
import { useTrip } from "@/lib/store";
import type { Stay } from "@/lib/types";

export default function StaysView() {
  const { data, online } = useTrip();
  const [editing, setEditing] = useState<Stay | undefined>();
  const [creating, setCreating] = useState(false);
  if (!data) return null;

  const today = todayISO();
  const stays = [...data.stays].sort((a, b) => a.check_in.localeCompare(b.check_in));

  return (
    <>
      <Header title="Stays" />
      {stays.length === 0 ? (
        <EmptyState emoji="🏠" text="No stays yet" cta={online ? { label: "Add stay", onClick: () => setCreating(true) } : undefined} />
      ) : (
        <ul className="space-y-3 p-4">
          {stays.map((s) => {
            const loc = locationById(data, s.location_id);
            const now = isCurrentStay(s, today);
            return (
              <li
                key={s.id}
                className={`${CARD} ${now ? "ring-2 ring-red-500" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  className="flex min-h-14 w-full items-start gap-3 rounded-t-2xl p-3 text-left active:bg-zinc-800"
                >
                  <span aria-hidden="true" className="w-8 pt-0.5 text-center text-2xl">{loc?.emoji ?? "🏠"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 truncate text-base font-medium text-zinc-100">{s.name}</span>
                      {now && (
                        <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-sm font-medium text-white">Now</span>
                      )}
                    </span>
                    <span className="block text-base text-zinc-100">{formatStayRange(s.check_in, s.check_out)}</span>
                    {loc && <span className="block truncate text-sm text-zinc-400">{loc.city}</span>}
                  </span>
                </button>
                <div className="flex gap-2 px-3 pb-3">
                  {loc && <DirectionsButton lat={loc.lat} lng={loc.lng} full className="flex-1" />}
                  <AirbnbButton url={s.airbnb_url} className="flex-1" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {stays.length > 0 && <Fab label="New stay" disabled={!online} onClick={() => setCreating(true)} />}
      <StayForm open={creating} onClose={() => setCreating(false)} />
      <StayForm open={!!editing} stay={editing} onClose={() => setEditing(undefined)} />
    </>
  );
}
