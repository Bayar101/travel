export default function OfflineBadge() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 mx-auto flex max-w-md justify-center pt-[calc(env(safe-area-inset-top)+0.25rem)]">
      <span className="rounded-full bg-amber-500/20 px-3 py-1 text-sm font-medium text-amber-400 ring-1 ring-amber-500/40">
        Offline — view only
      </span>
    </div>
  );
}
