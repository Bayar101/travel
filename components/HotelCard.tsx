import AirbnbButton from "@/components/ui/AirbnbButton";
import DirectionsButton from "@/components/ui/DirectionsButton";
import { BedIcon } from "@/components/ui/icons";
import { CARD } from "@/components/ui/styles";
import { checkoutOn, locationById, stayForNight } from "@/lib/selectors";
import type { TripData } from "@/lib/types";

export default function HotelCard({ data, date }: { data: TripData; date: string }) {
  const night = stayForNight(data, date);
  const out = checkoutOn(data, date);
  if (!night && !out) return null;
  const loc = night ? locationById(data, night.stay.location_id) : undefined;
  return (
    <section aria-label="Hotel" className={`space-y-3 p-3 ${CARD}`}>
      {night && (
        <>
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300"><BedIcon /></span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-base font-medium text-zinc-100">{night.stay.name}</p>
              <p className="text-base text-zinc-400">Night {night.nightIndex} of {night.nights}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {loc && <DirectionsButton lat={loc.lat} lng={loc.lng} name={night.stay.name} full className="flex-1" />}
            <AirbnbButton url={night.stay.airbnb_url} className="flex-1" />
          </div>
        </>
      )}
      {out && <p className="break-words text-base text-zinc-400">Check out: {out.name}</p>}
    </section>
  );
}
