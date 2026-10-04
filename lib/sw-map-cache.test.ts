import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const mc = require("../public/sw-map-cache.js");

describe("sw-map-cache", () => {
  it("classifies requests", () => {
    const k = (u: string) => mc.mapRequestKind(new URL(u));
    expect(k("https://tiles.openfreemap.org/styles/dark")).toBe("meta");
    expect(k("https://tiles.openfreemap.org/planet")).toBe("meta");
    expect(k("https://tiles.openfreemap.org/planet/20260927_080001_pt/10/909/403.pbf")).toBe("asset");
    expect(k("https://tiles.openfreemap.org/fonts/Noto%20Sans%20Regular/0-255.pbf")).toBe("asset");
    expect(k("https://tiles.openfreemap.org/sprites/ofm_f384/ofm.json")).toBe("asset");
    expect(k("https://example.com/planet")).toBeNull();
    expect(k("https://tiles.openfreemap.org.evil.com/styles/dark")).toBeNull();
  });
  it("trims oldest keys over the cap", () => {
    expect(mc.keysToTrim([1, 2, 3], 5)).toEqual([]);
    expect(mc.keysToTrim([1, 2, 3, 4, 5], 5)).toEqual([]);
    expect(mc.keysToTrim([1, 2, 3, 4, 5, 6, 7], 5)).toEqual([1, 2]);
  });
  it("exposes constants", () => {
    expect(mc.MAP_CACHE).toBe("map-v1");
    expect(mc.MAP_MAX_ENTRIES).toBe(2500);
  });
  it("accepts only ok cors/basic responses", () => {
    expect(mc.mapCacheable({ ok: true, type: "cors" })).toBe(true);
    expect(mc.mapCacheable({ ok: true, type: "opaque" })).toBe(false);
    expect(mc.mapCacheable({ ok: false, type: "cors" })).toBe(false);
  });
});
