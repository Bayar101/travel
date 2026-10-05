import { mapsUrl } from "@/lib/maps";
import { DirectionsIcon } from "./icons";

/**
 * Opens Google Maps directions to a location: the named place when `cid` is known, else the lat/lng pin.
 * Default: 44px round icon button (lists). `full`: labelled "Directions" button;
 * `primary` makes it the red primary action. `name` makes the accessible name specific
 * ("Open Senso-ji in Google Maps") so a list of these buttons is distinguishable.
 */
export default function DirectionsButton({
  lat,
  lng,
  cid,
  name,
  full = false,
  primary = false,
  className = "",
}: {
  lat: number;
  lng: number;
  cid: string | null;
  name: string;
  full?: boolean;
  primary?: boolean;
  className?: string;
}) {
  const href = mapsUrl(lat, lng, cid);
  if (!full) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener"
        aria-label={`Open ${name} in Google Maps`}
        title={`Open ${name} in Google Maps`}
        onClick={(e) => e.stopPropagation()}
        className={`flex size-11 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-100 transition-colors active:bg-zinc-700 ${className}`}
      >
        <DirectionsIcon size={20} />
      </a>
    );
  }
  const tone = primary ? "bg-red-500 text-white active:bg-red-600" : "bg-zinc-800 text-zinc-100 active:bg-zinc-700";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={`Directions to ${name} (opens Google Maps)`}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-base font-medium transition-colors ${tone} ${className}`}
    >
      <DirectionsIcon size={20} />
      Directions
    </a>
  );
}
