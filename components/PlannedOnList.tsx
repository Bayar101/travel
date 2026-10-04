import { ChevronRightIcon } from "@/components/ui/icons";
import { CARD } from "@/components/ui/styles";
import { plannedOn } from "@/lib/map-data";
import { navigate } from "@/lib/router";
import { dateBlock, dayNumber } from "@/lib/trip";
import type { TripData } from "@/lib/types";

/** Days a location is planned on: date tile, "Day N · time", day title → opens the day. */
export default function PlannedOnList({ data, locationId }: { data: TripData; locationId: string }) {
  const planned = plannedOn(data, locationId);
  if (planned.length === 0) return <p className={`px-4 py-3 text-base text-zinc-400 ${CARD}`}>Not on any day yet</p>;
  const firstDate = data.days.reduce<string | null>((m, d) => (m === null || d.date < m ? d.date : m), null);
  return (
    <ul className={`divide-y divide-white/5 overflow-hidden ${CARD}`}>
      {planned.map(({ day, item }) => {
        const b = dateBlock(day.date);
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => navigate(`/day/${encodeURIComponent(day.id)}`)}
              className="flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left transition-colors active:bg-zinc-800"
            >
              <span aria-hidden="true" className="flex w-11 shrink-0 flex-col items-center rounded-xl bg-zinc-800 py-1">
                <span className="text-xs font-semibold uppercase text-zinc-400">{b.weekday}</span>
                <span className="text-lg font-bold leading-6 tabular-nums text-zinc-100">{b.day}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-zinc-400">
                  {firstDate ? `Day ${dayNumber(firstDate, day.date)} · ` : ""}
                  <span className="sr-only">{`${b.weekday} ${b.day} ${b.month} · `}</span>
                  {item.time ?? "Anytime"}
                </span>
                <span className="block truncate text-base text-zinc-100">{day.title || `${b.weekday} ${b.day} ${b.month}`}</span>
              </span>
              <ChevronRightIcon size={20} className="text-zinc-500" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
