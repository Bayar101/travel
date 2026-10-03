import { mapsUrl } from "@/lib/maps";

export default function MapsButton({
  lat,
  lng,
  compact = false,
  className = "",
}: {
  lat: number;
  lng: number;
  compact?: boolean;
  className?: string;
}) {
  return (
    <a
      href={mapsUrl(lat, lng)}
      target="_blank"
      rel="noopener"
      aria-label={compact ? "Open in Google Maps" : undefined}
      className={
        compact
          ? `flex size-11 shrink-0 items-center justify-center rounded-lg text-xl active:bg-zinc-800 ${className}`
          : `inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-zinc-800 px-4 text-base font-medium text-zinc-100 active:bg-zinc-700 ${className}`
      }
    >
      <span aria-hidden="true">📍</span>
      {!compact && " Maps"}
    </a>
  );
}
