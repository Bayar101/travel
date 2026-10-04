import { mapsUrl } from "@/lib/maps";
import { DirectionsIcon } from "./icons";

/**
 * Opens Google Maps directions to a location.
 * Default: 44px round icon button (lists). `full`: labelled "Directions" button;
 * `primary` makes it the red primary action.
 */
export default function DirectionsButton({
  lat,
  lng,
  full = false,
  primary = false,
  className = "",
}: {
  lat: number;
  lng: number;
  full?: boolean;
  primary?: boolean;
  className?: string;
}) {
  const href = mapsUrl(lat, lng);
  if (!full) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener"
        aria-label="Open in Google Maps"
        title="Open in Google Maps"
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
      aria-label="Directions (opens Google Maps)"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-base font-medium transition-colors ${tone} ${className}`}
    >
      <DirectionsIcon size={20} />
      Directions
    </a>
  );
}
