import AirbnbButton from "@/components/ui/AirbnbButton";
import MapsButton from "@/components/ui/MapsButton";
import { checkoutOn, locationById, stayForNight } from "@/lib/selectors";
import type { TripData } from "@/lib/types";

export default function HotelCard({ data, date }: { data: TripData; date: string }) {
  const night = stayForNight(data, date);
  const out = checkoutOn(data, date);
  if (!night && !out) return null;
  const loc = night ? locationById(data, night.stay.location_id) : undefined;
  return (
    <section aria-label="Hotel" className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
      {night && (
        <>
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-2xl">🏠</span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-base font-medium text-zinc-100">{night.stay.name}</p>
              <p className="text-base text-zinc-400">Night {night.nightIndex} of {night.nights}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {loc && <MapsButton lat={loc.lat} lng={loc.lng} />}
            <AirbnbButton url={night.stay.airbnb_url} />
          </div>
        </>
      )}
      {out && <p className="break-words text-base text-zinc-400">Check out: {out.name}</p>}
    </section>
  );
}
