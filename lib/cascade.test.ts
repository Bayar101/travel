import { describe, expect, it } from "vitest";
import { pruneDeleted } from "./cascade";
import type { TripData } from "./types";

const loc = (id: string, over: Partial<TripData["locations"][number]> = {}) => ({
  id, type: "place" as const, parent_id: null, category_id: null, name: id,
  description: null, emoji: "📍", city: "Tokyo", lat: 0, lng: 0, ...over,
});

const base = (): TripData => ({
  version: 3,
  categories: [{ id: "c1", name: "Food", emoji: null }, { id: "c2", name: "Fun", emoji: null }],
  locations: [
    loc("a1", { type: "area", category_id: "c1" }),
    loc("p1", { parent_id: "a1", category_id: "c1" }),
    loc("p2", { parent_id: "a1" }),
    loc("p3", { category_id: "c2" }),
  ],
  stays: [
    { id: "s1", location_id: "a1", name: "S1", airbnb_url: "u", check_in: "2026-01-01", check_out: "2026-01-03" },
    { id: "s2", location_id: "p3", name: "S2", airbnb_url: "u", check_in: "2026-01-03", check_out: "2026-01-05" },
  ],
  days: [{ id: "d1", date: "2026-01-01", title: null, note: null }, { id: "d2", date: "2026-01-02", title: null, note: null }],
  items: [
    { id: "i1", day_id: "d1", location_id: "p1", time: null, position: 0, note: null },
    { id: "i2", day_id: "d1", location_id: "p3", time: null, position: 1, note: null },
    { id: "i3", day_id: "d2", location_id: null, time: null, position: 0, note: "n" },
    { id: "i4", day_id: "d2", location_id: "a1", time: null, position: 1, note: null },
  ],
});

describe("pruneDeleted", () => {
  it("category: nulls location.category_id, keeps locations", () => {
    const r = pruneDeleted(base(), "categories", "c1");
    expect(r.categories.map((c) => c.id)).toEqual(["c2"]);
    expect(r.locations).toHaveLength(4);
    expect(r.locations.find((l) => l.id === "a1")!.category_id).toBeNull();
    expect(r.locations.find((l) => l.id === "p1")!.category_id).toBeNull();
    expect(r.locations.find((l) => l.id === "p3")!.category_id).toBe("c2");
  });

  it("area: removes places, their stays and items", () => {
    const r = pruneDeleted(base(), "locations", "a1");
    expect(r.locations.map((l) => l.id)).toEqual(["p3"]);
    expect(r.stays.map((s) => s.id)).toEqual(["s2"]);
    expect(r.items.map((i) => i.id)).toEqual(["i2", "i3"]);
  });

  it("place: removes only itself, its stays and items", () => {
    const r = pruneDeleted(base(), "locations", "p3");
    expect(r.locations.map((l) => l.id)).toEqual(["a1", "p1", "p2"]);
    expect(r.stays.map((s) => s.id)).toEqual(["s1"]);
    expect(r.items.map((i) => i.id)).toEqual(["i1", "i3", "i4"]);
  });

  it("day: removes its items", () => {
    const r = pruneDeleted(base(), "days", "d1");
    expect(r.days.map((d) => d.id)).toEqual(["d2"]);
    expect(r.items.map((i) => i.id)).toEqual(["i3", "i4"]);
  });

  it("stay and item: remove only themselves", () => {
    expect(pruneDeleted(base(), "stays", "s1").stays.map((s) => s.id)).toEqual(["s2"]);
    expect(pruneDeleted(base(), "items", "i1").items.map((i) => i.id)).toEqual(["i2", "i3", "i4"]);
  });

  it("does not mutate input", () => {
    const d = base();
    pruneDeleted(d, "locations", "a1");
    expect(d.locations).toHaveLength(4);
  });
});
