import { describe, expect, it } from "vitest";
import type { TripData, Location } from "./types";
import { boundsFor, categoryChips, filterByCategory, normalizeSelection, plannedOn, selectedLocation } from "./map-data";

const loc = (id: string, over: Partial<Location> = {}): Location => ({
  id, type: "place", parent_id: null, category_id: null, name: id, description: null,
  emoji: "📍", city: "Tokyo", lat: 35.6, lng: 139.7, ...over,
});

const data = (over: Partial<TripData> = {}): TripData => ({
  version: 1,
  categories: [
    { id: "c2", name: "Temple", emoji: "⛩️" },
    { id: "c1", name: "Food", emoji: null },
  ],
  locations: [loc("a", { category_id: "c1" }), loc("b", { category_id: "c2" }), loc("u")],
  stays: [],
  days: [
    { id: "d2", date: "2026-10-10", title: null, note: null },
    { id: "d1", date: "2026-10-09", title: null, note: null },
  ],
  items: [],
  ...over,
});

describe("categoryChips", () => {
  it("lists All, categories by name, Uncategorized when any", () => {
    expect(categoryChips(data())).toEqual([
      { key: "all", label: "All" },
      { key: "c1", label: "Food" },
      { key: "c2", label: "⛩️ Temple" },
      { key: "none", label: "Uncategorized" },
    ]);
  });
  it("omits Uncategorized when every location has a category", () => {
    const d = data({ locations: [loc("a", { category_id: "c1" })] });
    expect(categoryChips(d).map((c) => c.key)).toEqual(["all", "c1", "c2"]);
  });
});

describe("normalizeSelection", () => {
  it("keeps valid selections", () => {
    expect(normalizeSelection(data(), "all")).toBe("all");
    expect(normalizeSelection(data(), "c1")).toBe("c1");
    expect(normalizeSelection(data(), "none")).toBe("none");
  });
  it("falls back to all for deleted category or empty uncategorized", () => {
    expect(normalizeSelection(data(), "gone")).toBe("all");
    expect(normalizeSelection(data({ locations: [loc("a", { category_id: "c1" })] }), "none")).toBe("all");
  });
});

describe("filterByCategory", () => {
  const ls = data().locations;
  it("filters", () => {
    expect(filterByCategory(ls, "all").map((l) => l.id)).toEqual(["a", "b", "u"]);
    expect(filterByCategory(ls, "c2").map((l) => l.id)).toEqual(["b"]);
    expect(filterByCategory(ls, "none").map((l) => l.id)).toEqual(["u"]);
  });
});

describe("boundsFor", () => {
  it("null when empty", () => expect(boundsFor([])).toBeNull());
  it("pads a single or identical points", () => {
    expect(boundsFor([loc("a", { lat: 35, lng: 139 }), loc("b", { lat: 35, lng: 139 })])).toEqual([
      [138.99, 34.99],
      [139.01, 35.01],
    ]);
  });
  it("spans many points", () => {
    expect(boundsFor([loc("a", { lat: 34, lng: 135 }), loc("b", { lat: 36, lng: 140 })])).toEqual([
      [135, 34],
      [140, 36],
    ]);
  });
});

describe("plannedOn", () => {
  it("sorts by date then timed before anytime then time/position", () => {
    const d = data({
      items: [
        { id: "i1", day_id: "d2", location_id: "a", time: null, position: 0, note: null },
        { id: "i2", day_id: "d1", location_id: "a", time: "14:00", position: 0, note: null },
        { id: "i3", day_id: "d1", location_id: "a", time: "09:30", position: 1, note: null },
        { id: "i4", day_id: "d1", location_id: "b", time: "08:00", position: 0, note: null },
        { id: "i5", day_id: "missing", location_id: "a", time: null, position: 0, note: null },
      ],
    });
    expect(plannedOn(d, "a").map((r) => [r.item.id, r.label])).toEqual([
      ["i3", "Fri 9 Oct · 09:30"],
      ["i2", "Fri 9 Oct · 14:00"],
      ["i1", "Sat 10 Oct · Anytime"],
    ]);
  });
  it("empty when not planned", () => expect(plannedOn(data(), "u")).toEqual([]));
});

describe("selectedLocation", () => {
  it("returns the location or null when missing/deleted", () => {
    expect(selectedLocation(data(), "a")?.id).toBe("a");
    expect(selectedLocation(data(), "gone")).toBeNull();
    expect(selectedLocation(data(), null)).toBeNull();
  });
});
