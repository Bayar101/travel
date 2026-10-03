// Fixed above the bottom nav (top is left to the header's safe-area padding).
export default function OfflineBadge() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md justify-center px-4">
      <span className="rounded-full bg-amber-500/20 px-3 py-1 text-sm font-medium text-amber-400 ring-1 ring-amber-500/40 backdrop-blur">
        Offline — view only
      </span>
    </div>
  );
}
