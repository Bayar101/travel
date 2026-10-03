export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

const NUM = "-?\\d+(?:\\.\\d+)?";

function valid(lat: number, lng: number): { lat: number; lng: number } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function fromMatch(m: RegExpMatchArray | null) {
  return m ? valid(Number(m[1]), Number(m[2])) : null;
}

// Accepts "lat, lng" or a full Google Maps URL. Short links (maps.app.goo.gl) -> null.
export function parseLatLng(input: string): { lat: number; lng: number } | null {
  let s = input.trim();
  if (!s) return null;
  try {
    s = decodeURIComponent(s);
  } catch {
    // keep raw
  }
  const plain = s.match(new RegExp(`^(${NUM})\\s*[,\\s]\\s*(${NUM})$`));
  if (plain) return fromMatch(plain);
  const patterns = [
    `!3d(${NUM})!4d(${NUM})`, // place pin
    `@(${NUM}),(${NUM})`, // viewport
    `[?&](?:q|query|ll|center)=(${NUM}),\\s*(${NUM})`,
  ];
  for (const p of patterns) {
    const r = fromMatch(s.match(new RegExp(p)));
    if (r) return r;
  }
  return null;
}
