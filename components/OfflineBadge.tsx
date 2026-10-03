// In-flow strip above the sticky header, so it never covers the title.
export default function OfflineBadge() {
  return (
    <div className="pt-safe flex justify-center bg-zinc-950 pb-1">
      <span className="rounded-full bg-amber-500/20 px-3 py-1 text-sm font-medium text-amber-400 ring-1 ring-amber-500/40">
        Offline — view only
      </span>
    </div>
  );
}
