import { describe, expect, it } from "vitest";
import {
  activeFilter, applyFilter, categoryChipLabel, categoryChoices, EMPTY_FILTER, groupByCity, isFiltered, locationSubtitle,
} from "./locations-list";
import type { Location, TripData } from "./types";

const loc = (id: string, over: Partial<Location> = {}): Location => ({
  id, type: "place", parent_id: null, category_id: null, name: id,
  description: null, emoji: "📍", city: "Tokyo", lat: 0, lng: 0, ...over,
});

const data = (): TripData => ({
  version: 1,
  categories: [
    { id: "c1", name: "Food", emoji: "🍜" },
    { id: "c2", name: "Temple", emoji: null },
  ],
  locations: [
    loc("a1", { type: "area", name: "Shibuya" }),
    loc("p1", { parent_id: "a1", name: "Ichiran", category_id: "c1" }),
    loc("p2", { name: "Fushimi", city: "Kyoto", category_id: "c2" }),
    loc("p3", { parent_id: "a1", name: "ahead", category_id: "c1" }),
  ],
  stays: [],
  days: [],
  items: [],
});

describe("groupByCity", () => {
  it("groups by city sorted, names sorted case-insensitively", () => {
    const g = groupByCity(data().locations);
    expect(g.map((x) => x.city)).toEqual(["Kyoto", "Tokyo"]);
    expect(g[1].locations.map((l) => l.name)).toEqual(["ahead", "Ichiran", "Shibuya"]);
  });
  it("empty in, empty out", () => {
    expect(groupByCity([])).toEqual([]);
  });
});

describe("locationSubtitle", () => {
  const d = data();
  it("place: category · in area", () => {
    expect(locationSubtitle(d, d.locations[1])).toBe("Food · in Shibuya");
  });
  it("place without emoji category, no area", () => {
    expect(locationSubtitle(d, d.locations[2])).toBe("Temple");
  });
  it("area: place count", () => {
    expect(locationSubtitle(d, d.locations[0])).toBe("2 places");
  });
  it("withCity prefixes city", () => {
    expect(locationSubtitle(d, d.locations[2], { withCity: true })).toBe("Kyoto · Temple");
  });
  it("withArea false omits the area", () => {
    expect(locationSubtitle(d, d.locations[1], { withArea: false })).toBe("Food");
  });
  it("singular place", () => {
    const x = { ...d, locations: d.locations.slice(0, 2) };
    expect(locationSubtitle(x, x.locations[0])).toBe("1 place");
  });
});

describe("filters", () => {
  it("activeFilter drops vanished city/category", () => {
    const f = activeFilter(data(), { ...EMPTY_FILTER, city: "Osaka", categoryId: "gone" });
    expect(f.city).toBe("");
    expect(f.categoryId).toBe("");
  });
  it("activeFilter keeps valid values", () => {
    const f = activeFilter(data(), { query: "x", type: "place", city: "Kyoto", categoryId: "c2" });
    expect(f).toEqual({ query: "x", type: "place", city: "Kyoto", categoryId: "c2" });
  });
  it("applyFilter combines type, city, category, query", () => {
    const d = data();
    expect(applyFilter(d, { ...EMPTY_FILTER, categoryId: "c1" }).map((l) => l.id)).toEqual(["p1", "p3"]);
    expect(applyFilter(d, { ...EMPTY_FILTER, type: "area" }).map((l) => l.id)).toEqual(["a1"]);
    expect(applyFilter(d, { ...EMPTY_FILTER, city: "Kyoto" }).map((l) => l.id)).toEqual(["p2"]);
    expect(applyFilter(d, { ...EMPTY_FILTER, query: "ichi" }).map((l) => l.id)).toEqual(["p1"]);
  });
  it("isFiltered", () => {
    expect(isFiltered(EMPTY_FILTER)).toBe(false);
    expect(isFiltered({ ...EMPTY_FILTER, query: "  " })).toBe(false);
    expect(isFiltered({ ...EMPTY_FILTER, city: "Kyoto" })).toBe(true);
  });
});

describe("categories", () => {
  it("choices with counts, sorted by name", () => {
    expect(categoryChoices(data())).toEqual([
      { id: "c1", name: "Food", emoji: "🍜", count: 2 },
      { id: "c2", name: "Temple", emoji: null, count: 1 },
    ]);
  });
  it("chip label", () => {
    const d = data();
    expect(categoryChipLabel(d, "")).toBe("Category");
    expect(categoryChipLabel(d, "c1")).toBe("🍜 Food");
    expect(categoryChipLabel(d, "c2")).toBe("Temple");
    expect(categoryChipLabel(d, "gone")).toBe("Category");
  });
});
