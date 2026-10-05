import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ db: () => { throw new Error("db not used"); } }));

const { POST } = await import("./route");

// Path + query tokens that must never reach the logs (only the host may).
const SECRET = "Zx9SECRETpath";
const SHORT = `https://maps.app.goo.gl/${SECRET}?g_st=ic`;

let lines: string[];
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  lines = [];
  const sink = (l: unknown) => void lines.push(String(l));
  vi.spyOn(console, "log").mockImplementation(sink);
  vi.spyOn(console, "error").mockImplementation(sink);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  // Nothing logged in any case may contain the submitted URL's path or query.
  for (const l of lines) {
    expect(l).not.toContain(SECRET);
    expect(l).not.toContain("g_st");
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function post(body: unknown, raw = false) {
  const req = new Request("http://localhost/api/resolve-maps-link", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({}) });
}

const redirect = (to: string) => new Response(null, { status: 302, headers: { location: to } });
const ok = () => new Response("", { status: 200 });
const jsonRes = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { "content-type": "application/json" } });
const records = () => lines.map((l) => JSON.parse(l) as Record<string, unknown>);

describe("POST /api/resolve-maps-link", () => {
  it("400 when url is missing, not a string, too long, or the body is not JSON", async () => {
    for (const body of [{}, { url: 42 }, { url: null }, { url: ["x"] }, { url: `https://maps.app.goo.gl/${"a".repeat(2049)}` }]) {
      const res = await post(body);
      expect(res.status, JSON.stringify(body).slice(0, 40)).toBe(400);
    }
    expect((await post("{not json", true)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("422 { error } for a disallowed host, without fetching", async () => {
    const res = await post({ url: `https://evil.example/${SECRET}` });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "Couldn't read that link" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(records()[0]).toMatchObject({ level: "WARN", message: "maps_link_rejected", reason: "host_not_allowed" });
  });

  it("200 { lat, lng, name } for a link with coordinates; logs host only", async () => {
    fetchMock
      .mockResolvedValueOnce(redirect("https://www.google.com/maps/place/Senso-ji/@35.7148,139.7967,17z"))
      .mockResolvedValueOnce(ok());
    const res = await post({ url: SHORT });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ lat: 35.7148, lng: 139.7967, name: "Senso-ji" });
    expect(records()[0]).toMatchObject({ message: "maps_link_resolved", host: "maps.app.goo.gl", approximate: false });
  });

  it("200 includes cid when the final url carries a place id", async () => {
    fetchMock
      .mockResolvedValueOnce(redirect("https://www.google.com/maps/place/Senso-ji/@35.7,139.7,17z/data=!3m5!1s0x1:0xff!8m2!3d35.7148!4d139.7967"))
      .mockResolvedValueOnce(ok());
    const res = await post({ url: SHORT });
    expect(await res.json()).toEqual({ lat: 35.7148, lng: 139.7967, name: "Senso-ji", cid: "255" });
    expect(records()[0]).toMatchObject({ message: "maps_link_resolved", has_cid: true });
  });

  it("200 with approximate: true when the name is geocoded", async () => {
    fetchMock
      .mockResolvedValueOnce(redirect("https://www.google.com/maps/place/Kaminarimon+Gate/data=!4m2"))
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(jsonRes([{ lat: "35.711", lon: "139.796" }]));
    const res = await post({ url: SHORT });
    expect(await res.json()).toEqual({ lat: 35.711, lng: 139.796, name: "Kaminarimon Gate", approximate: true });
  });

  it("422 { error, name } when the name has no geocoder match", async () => {
    fetchMock
      .mockResolvedValueOnce(redirect("https://www.google.com/maps/place/Nowhere+Cafe+TEST/data=!4m2"))
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(jsonRes([]));
    const res = await post({ url: SHORT });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.name).toBe("Nowhere Cafe TEST");
    expect(body.error).toMatch(/Couldn't find coordinates/);
    expect(records()[0]).toMatchObject({ message: "maps_link_unresolved", reason: "geocode_no_match" });
  });

  it("422 { error } when the link has neither coordinates nor a name", async () => {
    fetchMock.mockResolvedValueOnce(redirect("https://www.google.com/maps/data=!4m2")).mockResolvedValueOnce(ok());
    const res = await post({ url: SHORT });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "Couldn't read that link" });
    expect(records()[0]).toMatchObject({ reason: "no_coordinates" });
  });

  it("422 on network failure; logs reason + error object once, URL redacted", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError(`fetch failed for ${SHORT}`));
    const res = await post({ url: SHORT });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "Couldn't read that link" });
    const recs = records();
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({
      level: "WARN", message: "maps_link_unresolved", host: "maps.app.goo.gl", reason: "network",
      error_name: "TypeError", error_message: "network",
    });
    expect(recs[0].error_stack).toEqual(expect.stringContaining("TypeError: network"));
    expect(typeof recs[0].request_id).toBe("string");
  });

  it("422 with a fixed reason when a redirect leaves the allowed hosts", async () => {
    fetchMock.mockResolvedValueOnce(redirect(`https://evil.example/${SECRET}`));
    const res = await post({ url: SHORT });
    expect(res.status).toBe(422);
    expect(records()[0]).toMatchObject({ reason: "redirect_host_not_allowed", error_name: "Error" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
