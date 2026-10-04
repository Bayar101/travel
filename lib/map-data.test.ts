import { describe, expect, it } from "vitest";
import type { TripData, Location } from "./types";
import {
  applyCategoryFilter, boundsFor, categoryChips, chipState, cycleChip, filterKey, isEmptyFilter,
  normalizeFilter, plannedOn, selectedLocation, type CategoryFilter,
} from "./map-data";

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

const ids = (ls: Location[]) => ls.map((l) => l.id);
const F = (include: string[] = [], exclude: string[] = []): CategoryFilter => ({ include, exclude });

describe("cycleChip", () => {
  it("cycles off -> include -> exclude -> off", () => {
    const inc = cycleChip(F(), "c1");
    expect(inc).toEqual(F(["c1"], []));
    const exc = cycleChip(inc, "c1");
    expect(exc).toEqual(F([], ["c1"]));
    expect(cycleChip(exc, "c1")).toEqual(F());
  });
  it("leaves other chips alone and does not mutate", () => {
    const f = F(["c1"], ["c2"]);
    expect(cycleChip(f, "none")).toEqual(F(["c1", "none"], ["c2"]));
    expect(cycleChip(f, "c1")).toEqual(F([], ["c2", "c1"]));
    expect(f).toEqual(F(["c1"], ["c2"]));
  });
});

describe("chipState", () => {
  it("reports state", () => {
    const f = F(["c1"], ["c2"]);
    expect([chipState(f, "c1"), chipState(f, "c2"), chipState(f, "none")]).toEqual(["include", "exclude", "off"]);
  });
});

describe("isEmptyFilter / filterKey", () => {
  it("detects empty", () => {
    expect(isEmptyFilter(F())).toBe(true);
    expect(isEmptyFilter(F(["a"]))).toBe(false);
    expect(isEmptyFilter(F([], ["a"]))).toBe(false);
  });
  it("is stable regardless of order", () => {
    expect(filterKey(F(["b", "a"], ["d", "c"]))).toBe(filterKey(F(["a", "b"], ["c", "d"])));
    expect(filterKey(F(["a"]))).not.toBe(filterKey(F([], ["a"])));
    expect(filterKey(F())).toBe(filterKey(F()));
  });
});

describe("normalizeFilter", () => {
  it("keeps valid keys", () => {
    const f = F(["c1", "none"], ["c2"]);
    expect(normalizeFilter(data(), f)).toBe(f);
  });
  it("drops deleted categories and emptied uncategorized", () => {
    const d = data({ locations: [loc("a", { category_id: "c1" })] });
    expect(normalizeFilter(d, F(["gone", "none"], ["c2", "x"]))).toEqual(F([], ["c2"]));
  });
});

describe("applyCategoryFilter", () => {
  const ls = data().locations; // a:c1, b:c2, u:none
  it("empty shows all", () => expect(ids(applyCategoryFilter(ls, F()))).toEqual(["a", "b", "u"]));
  it("include only", () => expect(ids(applyCategoryFilter(ls, F(["c2"])))).toEqual(["b"]));
  it("multiple includes", () => expect(ids(applyCategoryFilter(ls, F(["c1", "c2"])))).toEqual(["a", "b"]));
  it("uncategorized include", () => expect(ids(applyCategoryFilter(ls, F(["none"])))).toEqual(["u"]));
  it("exclude only", () => expect(ids(applyCategoryFilter(ls, F([], ["c1"])))).toEqual(["b", "u"]));
  it("multiple excludes incl. uncategorized", () =>
    expect(ids(applyCategoryFilter(ls, F([], ["c1", "none"])))).toEqual(["b"]));
  it("mixed: include then exclude", () => {
    expect(ids(applyCategoryFilter(ls, F(["c1", "none"], ["none"])))).toEqual(["a"]);
    expect(ids(applyCategoryFilter(ls, F(["c1"], ["c2"])))).toEqual(["a"]);
  });
  it("excluding everything yields empty", () =>
    expect(applyCategoryFilter(ls, F([], ["c1", "c2", "none"]))).toEqual([]));
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
