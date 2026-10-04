// "YYYY-MM-DD" helpers. Parse as local/UTC-free date parts; never `new Date("YYYY-MM-DD")` (UTC shift).

const FMT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

// "Fri 10 Oct"
export function formatDay(iso: string): string {
  const [y, m, d] = parts(iso);
  const p = Object.fromEntries(FMT.formatToParts(new Date(y, m - 1, d, 12)).map((x) => [x.type, x.value]));
  return `${p.weekday} ${p.day} ${p.month}`;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const [y1, m1, d1] = parts(checkIn);
  const [y2, m2, d2] = parts(checkOut);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// "Fri 10 Oct → Mon 13 Oct · 3 nights"
export function formatStayRange(checkIn: string, checkOut: string): string {
  const n = nightsBetween(checkIn, checkOut);
  return `${formatDay(checkIn)} → ${formatDay(checkOut)} · ${n} night${n === 1 ? "" : "s"}`;
}

/** Milliseconds from `now` to the next local midnight (when "today" changes). */
export function msUntilNextDay(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}
