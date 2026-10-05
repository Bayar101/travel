import { describe, expect, it, vi } from "vitest";
import { createGeocoder, createSerialGate, extractShortLink, geocodeName, LruCache, lookupMapsLink, NOMINATIM_URL, normalizePlaceName, isAllowedMapsUrl, isMapsHost, placeNameFromUrl, resolveMapsLink } from "./maps-link";

describe("isMapsHost", () => {
  it("allows the listed hosts and google.<tld> subdomains", () => {
    for (const h of [
      "maps.app.goo.gl", "goo.gl", "maps.google.com", "www.google.com", "google.com",
      "www.google.co.jp", "google.co.jp", "maps.google.de", "www.google.com.au", "MAPS.APP.GOO.GL",
    ]) expect(isMapsHost(h), h).toBe(true);
  });
  it("rejects look-alikes and other hosts", () => {
    for (const h of [
      "evil.com", "google.com.evil.com", "goo.gl.evil.com", "notgoogle.com", "x.goo.gl", "app.goo.gl",
      "a.b.google.com", "127.0.0.1", "localhost", "google.c", "google.toolongtld", "", "googl.com",
    ]) expect(isMapsHost(h), h).toBe(false);
  });
});

describe("isAllowedMapsUrl", () => {
  it("https on an allowed host only", () => {
    expect(isAllowedMapsUrl("https://maps.app.goo.gl/abc")).toBe(true);
    expect(isAllowedMapsUrl("http://maps.app.goo.gl/abc")).toBe(false);
    expect(isAllowedMapsUrl("https://evil.com/maps.app.goo.gl")).toBe(false);
    expect(isAllowedMapsUrl("https://maps.app.goo.gl:8443/abc")).toBe(false);
    expect(isAllowedMapsUrl("https://user:pw@maps.app.goo.gl/abc")).toBe(false);
    expect(isAllowedMapsUrl("https://maps.app.goo.gl@evil.com/")).toBe(false);
    expect(isAllowedMapsUrl("not a url")).toBe(false);
  });
});

describe("placeNameFromUrl", () => {
  it("decodes + and %xx", () => {
    expect(placeNameFromUrl("https://www.google.com/maps/place/Park's+Inn/@33.57,-98.11,10z/data=!4m9")).toBe("Park's Inn");
    expect(placeNameFromUrl("https://www.google.com/maps/place/%E6%B5%85%E8%8D%89%E5%AF%BA/@35.7,139.7")).toBe("浅草寺");
    expect(placeNameFromUrl("https://www.google.co.jp/maps/place/Senso-ji+Temple/data=!4m2")).toBe("Senso-ji Temple");
  });
  it("null when absent or a coordinate pair", () => {
    expect(placeNameFromUrl("https://www.google.com/maps/@35.7,139.7,15z")).toBeNull();
    expect(placeNameFromUrl("https://www.google.com/maps/place/35.71,139.79/@35.7,139.7")).toBeNull();
    expect(placeNameFromUrl("https://www.google.com/maps/search/?api=1&query=1,2")).toBeNull();
    expect(placeNameFromUrl("https://www.google.com/maps/place/%E0%A4%A/@1,2")).toBeNull();
  });
  it("finds the name inside pasted text", () => {
    expect(placeNameFromUrl("look https://www.google.com/maps/place/Ichiran+Shibuya/@35.66,139.70")).toBe("Ichiran Shibuya");
  });
});

const FINAL =
  "https://www.google.com/maps/place/Toko+Fortune/@-6.6398231,106.774047,17z/data=!3m1!4b1!4m6!3m5!8m2!3d-6.6398231!4d106.774047?entry=tts";

function redirect(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } });
}

describe("resolveMapsLink", () => {
  it("follows redirects and reads coordinates + name", async () => {
    const f = vi.fn().mockResolvedValueOnce(redirect(FINAL)).mockResolvedValueOnce(new Response("", { status: 200 }));
    await expect(resolveMapsLink("https://maps.app.goo.gl/5a2iNmeLGDpY9gc36", f)).resolves.toEqual({
      ll: { lat: -6.6398231, lng: 106.774047 }, name: "Toko Fortune", cid: null,
    });
    expect(f).toHaveBeenNthCalledWith(1, "https://maps.app.goo.gl/5a2iNmeLGDpY9gc36", expect.objectContaining({ redirect: "manual" }));
  });
  it("resolves relative Location headers against the current hop", async () => {
    const f = vi.fn().mockResolvedValueOnce(redirect("/maps/place/X/@1,2,3z")).mockResolvedValueOnce(new Response("", { status: 200 }));
    await expect(resolveMapsLink("https://www.google.com/maps?x", f)).resolves.toEqual({ ll: { lat: 1, lng: 2 }, name: "X", cid: null });
    expect(f.mock.calls[1][0]).toBe("https://www.google.com/maps/place/X/@1,2,3z");
  });
  it("rejects a redirect to a disallowed host without fetching it", async () => {
    const f = vi.fn().mockResolvedValueOnce(redirect("https://169.254.169.254/latest/meta-data"));
    await expect(resolveMapsLink("https://maps.app.goo.gl/a", f)).rejects.toThrow("host");
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("rejects a disallowed start url without fetching", async () => {
    const f = vi.fn();
    await expect(resolveMapsLink("https://evil.com/x", f)).rejects.toThrow("host");
    expect(f).not.toHaveBeenCalled();
  });
  it("gives up after 5 redirects", async () => {
    const f = vi.fn().mockImplementation(async () => redirect("https://maps.app.goo.gl/loop"));
    await expect(resolveMapsLink("https://maps.app.goo.gl/loop", f)).rejects.toThrow("redirects");
    expect(f).toHaveBeenCalledTimes(6);
  });
  it("name only when the final url has no coordinates", async () => {
    const f = vi.fn().mockResolvedValueOnce(redirect("https://www.google.com/maps/place/X/data=!4m2")).mockResolvedValueOnce(new Response("", { status: 200 }));
    await expect(resolveMapsLink("https://maps.app.goo.gl/a", f)).resolves.toEqual({ ll: null, name: "X", cid: null });
  });
  it("reads the place cid from the final url", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(redirect("https://www.google.com/maps/place/X/@1,2,3z/data=!3m5!1s0x1:0xff!8m2!3d1!4d2"))
      .mockResolvedValueOnce(new Response("", { status: 200 }));
    await expect(resolveMapsLink("https://maps.app.goo.gl/a", f)).resolves.toEqual({ ll: { lat: 1, lng: 2 }, name: "X", cid: "255" });
  });
  it("null on an error status", async () => {
    const f = vi.fn().mockResolvedValueOnce(new Response("", { status: 404 }));
    await expect(resolveMapsLink("https://maps.app.goo.gl/a", f)).resolves.toBeNull();
  });
  it("cancels unread bodies", async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    const res = new Response("big", { status: 200 });
    Object.defineProperty(res, "body", { value: { cancel } });
    const f = vi.fn().mockResolvedValueOnce(res);
    await resolveMapsLink("https://www.google.com/maps/@1,2,3z", f);
    expect(cancel).toHaveBeenCalled();
  });
});

describe("extractShortLink", () => {
  it("pulls the link out of shared text and forces https", () => {
    expect(extractShortLink("Toko Fortune\nhttps://maps.app.goo.gl/5a2iNmeLGDpY9gc36")).toBe("https://maps.app.goo.gl/5a2iNmeLGDpY9gc36");
    expect(extractShortLink("maps.app.goo.gl/abc?g_st=ic")).toBe("https://maps.app.goo.gl/abc?g_st=ic");
    expect(extractShortLink("http://goo.gl/maps/xyz")).toBe("https://goo.gl/maps/xyz");
    expect(extractShortLink("https://www.google.com/maps")).toBeNull();
  });
});

const jsonRes = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("geocodeName", () => {
  it("queries Nominatim (fixed host, jp, UA) and parses the first hit", async () => {
    const f = vi.fn().mockResolvedValueOnce(jsonRes([{ lat: "35.7148", lon: "139.7967", display_name: "浅草寺" }]));
    await expect(geocodeName("Senso-ji", f)).resolves.toEqual({ lat: 35.7148, lng: 139.7967 });
    const [url, init] = f.mock.calls[0];
    const u = new URL(url);
    expect(`${u.origin}${u.pathname}`).toBe(NOMINATIM_URL);
    expect(Object.fromEntries(u.searchParams)).toEqual({ format: "jsonv2", limit: "1", countrycodes: "jp", q: "Senso-ji" });
    expect(new Headers(init.headers).get("user-agent")).toMatch(/japan-trip-planner/);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
  it("encodes the name as a query value only (no host injection)", async () => {
    const f = vi.fn().mockResolvedValueOnce(jsonRes([]));
    await geocodeName("x&q=y@evil.com/#", f);
    const u = new URL(f.mock.calls[0][0]);
    expect(u.host).toBe("nominatim.openstreetmap.org");
    expect(u.searchParams.get("q")).toBe("x&q=y@evil.com/#");
  });
  it("null on no hits or bad numbers; throws on an error status (not a cacheable miss)", async () => {
    await expect(geocodeName("a", vi.fn().mockResolvedValueOnce(jsonRes([])))).resolves.toBeNull();
    await expect(geocodeName("a", vi.fn().mockResolvedValueOnce(jsonRes([{ lat: "x", lon: "1" }])))).resolves.toBeNull();
    await expect(geocodeName("a", vi.fn().mockResolvedValueOnce(jsonRes([{ lat: "95", lon: "1" }])))).resolves.toBeNull();
    await expect(geocodeName("a", vi.fn().mockResolvedValueOnce(jsonRes({ error: "x" }, 429)))).rejects.toThrow("geocoder status 429");
    await expect(geocodeName("a", vi.fn().mockResolvedValueOnce(jsonRes({})))).resolves.toBeNull();
  });
});

describe("lookupMapsLink", () => {
  const ok = () => new Response("", { status: 200 });
  const lookup = (url: string, f: typeof fetch) => lookupMapsLink(url, f, createGeocoder({ minIntervalMs: 0 }));
  it("exact coordinates from the link", async () => {
    const f = vi.fn().mockResolvedValueOnce(redirect(FINAL)).mockResolvedValueOnce(ok());
    await expect(lookup("https://maps.app.goo.gl/a", f)).resolves.toEqual({
      ok: true, lat: -6.6398231, lng: 106.774047, name: "Toko Fortune", cid: null, approximate: false,
    });
  });
  it("geocodes the place name when the link has no coordinates", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(redirect("https://www.google.com/maps/place/Senso-ji/data=!4m2!3m1!1s0x1?entry=gps"))
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(jsonRes([{ lat: "35.7148", lon: "139.7967" }]));
    await expect(lookup("https://maps.app.goo.gl/a", f)).resolves.toEqual({
      ok: true, lat: 35.7148, lng: 139.7967, name: "Senso-ji", cid: null, approximate: true,
    });
    expect(new URL(f.mock.calls[2][0]).host).toBe("nominatim.openstreetmap.org");
  });
  it("name only when geocoding finds nothing", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(redirect("https://www.google.com/maps/place/Nowhere/data=!4m2"))
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(jsonRes([]));
    await expect(lookup("https://maps.app.goo.gl/a", f)).resolves.toEqual({ ok: false, name: "Nowhere" });
  });
  it("geocoder failure still returns the name", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(redirect("https://www.google.com/maps/place/Nowhere/data=!4m2"))
      .mockResolvedValueOnce(ok())
      .mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(lookup("https://maps.app.goo.gl/a", f)).resolves.toEqual({ ok: false, name: "Nowhere" });
  });
  it("no name, no coordinates", async () => {
    const f = vi.fn().mockResolvedValueOnce(redirect("https://www.google.com/maps/data=!4m2")).mockResolvedValueOnce(ok());
    await expect(lookup("https://maps.app.goo.gl/a", f)).resolves.toEqual({ ok: false, name: null });
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe("normalizePlaceName", () => {
  it("case, width and whitespace insensitive", () => {
    expect(normalizePlaceName("  Senso-ji   Temple ")).toBe("senso-ji temple");
    expect(normalizePlaceName("ＳＥＮＳＯ")).toBe("senso");
  });
});

describe("LruCache", () => {
  it("expires entries after the TTL", () => {
    let t = 0;
    const c = new LruCache<number | null>(10, 1000, () => t);
    c.set("a", null);
    expect(c.get("a")).toEqual({ value: null });
    t = 999;
    expect(c.get("a")).toEqual({ value: null });
    t = 1000;
    expect(c.get("a")).toBeUndefined();
  });
  it("evicts the least recently used past max", () => {
    const c = new LruCache<number>(2, 60_000);
    c.set("a", 1);
    c.set("b", 2);
    c.get("a"); // a is now most recent
    c.set("c", 3);
    expect(c.get("b")).toBeUndefined();
    expect(c.get("a")).toEqual({ value: 1 });
    expect(c.get("c")).toEqual({ value: 3 });
  });
});

function fakeClock() {
  let t = 0;
  return {
    now: () => t,
    sleep: vi.fn(async (ms: number) => {
      t += ms;
    }),
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("createSerialGate", () => {
  it("runs one at a time with >= 1 s between starts", async () => {
    const clock = fakeClock();
    const gate = createSerialGate(1000, clock.now, clock.sleep);
    const starts: number[] = [];
    let running = 0;
    let maxRunning = 0;
    const job = () => gate(async () => {
      starts.push(clock.now());
      maxRunning = Math.max(maxRunning, ++running);
      clock.advance(200); // request takes 200 ms
      await Promise.resolve();
      running--;
      return starts.length;
    });
    await expect(Promise.all([job(), job(), job()])).resolves.toEqual([1, 2, 3]);
    expect(starts).toEqual([0, 1000, 2000]);
    expect(maxRunning).toBe(1);
  });
  it("no wait once the interval has passed; a failure does not block the queue", async () => {
    const clock = fakeClock();
    const gate = createSerialGate(1000, clock.now, clock.sleep);
    await expect(gate(async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    clock.advance(1500);
    await expect(gate(async () => "ok")).resolves.toBe("ok");
    expect(clock.sleep).not.toHaveBeenCalled();
  });
});

describe("createGeocoder", () => {
  const hit = () => jsonRes([{ lat: "35.7148", lon: "139.7967" }]);
  it("caches by normalized name, including no-match results", async () => {
    const clock = fakeClock();
    const geocode = createGeocoder({ now: clock.now, sleep: clock.sleep });
    const f = vi.fn().mockResolvedValueOnce(hit()).mockResolvedValueOnce(jsonRes([]));
    await expect(geocode("Senso-ji", f)).resolves.toEqual({ lat: 35.7148, lng: 139.7967 });
    await expect(geocode("  senso-JI ", f)).resolves.toEqual({ lat: 35.7148, lng: 139.7967 });
    await expect(geocode("Nowhere", f)).resolves.toBeNull();
    await expect(geocode("nowhere", f)).resolves.toBeNull();
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("does not cache failures; refetches after 24 h", async () => {
    const clock = fakeClock();
    const geocode = createGeocoder({ now: clock.now, sleep: clock.sleep });
    const f = vi.fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(hit())
      .mockResolvedValueOnce(hit());
    await expect(geocode("A", f)).rejects.toThrow();
    await expect(geocode("A", f)).rejects.toThrow();
    await expect(geocode("A", f)).resolves.toEqual({ lat: 35.7148, lng: 139.7967 });
    await geocode("A", f);
    expect(f).toHaveBeenCalledTimes(3);
    clock.advance(24 * 60 * 60 * 1000);
    await geocode("A", f);
    expect(f).toHaveBeenCalledTimes(4);
  });
  it("spaces Nominatim requests >= 1 s apart; cache hits skip the gate", async () => {
    const clock = fakeClock();
    const geocode = createGeocoder({ now: clock.now, sleep: clock.sleep });
    const at: number[] = [];
    const f = vi.fn(async () => {
      at.push(clock.now());
      return hit();
    });
    await Promise.all([geocode("a", f), geocode("b", f), geocode("c", f)]);
    expect(at).toEqual([0, 1000, 2000]);
    await geocode("a", f);
    expect(f).toHaveBeenCalledTimes(3);
  });
});
