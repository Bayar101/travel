// With a cid Google Maps opens the named place; otherwise a bare coordinate pin.
export function mapsUrl(lat: number, lng: number, cid?: string | null): string {
  if (cid) return `https://www.google.com/maps?cid=${cid}`;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Google's place cid (decimal string; exceeds Number precision) from a full Maps URL: the second
 * half of the "!1s0x…:0x…" feature id, or a ?cid= param. Null for links without a place id.
 */
export function placeCid(input: string): string | null {
  const s = input.replace(/%3A/gi, ":");
  const fid = s.match(/!1s0x[0-9a-f]+:0x([0-9a-f]{1,16})(?![0-9a-f])/i);
  const cid = fid ? BigInt(`0x${fid[1]}`).toString() : s.match(/[?&]cid=(\d{1,20})(?!\d)/)?.[1];
  return cid && cid !== "0" ? cid : null;
}

const NUM = "[-+]?\\d+(?:\\.\\d+)?";

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
  s = s.replace(/[，、]/g, ",");
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
