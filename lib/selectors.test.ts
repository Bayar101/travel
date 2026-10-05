import { describe, expect, it } from "vitest";
import {
  checkoutOn, deleteImpact, filterLocations, itemsForDay, localISO, placesInArea, stayForNight,
} from "./selectors";
import type { TripData } from "./types";

const loc = (id: string, over: Partial<TripData["locations"][number]> = {}) => ({
  id, type: "place" as const, parent_id: null, category_id: null, name: id,
  description: null, emoji: "📍", city: "Tokyo", lat: 0, lng: 0, google_cid: null, ...over,
});
const item = (id: string, over: Partial<TripData["items"][number]> = {}) => ({
  id, day_id: "d1", location_id: null, time: null, position: 0, note: "n", ...over,
});

const data = (): TripData => ({
  version: 1,
  categories: [{ id: "c1", name: "Food", emoji: null }],
  locations: [
    loc("a1", { type: "area", name: "Shibuya", city: "Tokyo", category_id: "c1" }),
    loc("p1", { parent_id: "a1", name: "Ramen Ichiran", description: "Great NOODLES", category_id: "c1" }),
    loc("p2", { parent_id: "a1", name: "Temple", city: "Kyoto" }),
  ],
  stays: [
    { id: "s1", location_id: "a1", name: "A", airbnb_url: "u", check_in: "2026-05-01", check_out: "2026-05-05" },
    { id: "s2", location_id: "a1", name: "B", airbnb_url: "u", check_in: "2026-05-05", check_out: "2026-05-07" },
  ],
  days: [{ id: "d1", date: "2026-05-01", title: null, note: null }],
  items: [
    item("t2", { time: "14:00" }),
    item("t1", { time: "09:30" }),
    item("n2", { position: 2 }),
    item("n1", { position: 1 }),
  ],
});

describe("itemsForDay", () => {
  it("sorts timed by time, anytime by position; ignores other days", () => {
    const d = data();
    d.items.push(item("x", { day_id: "d2", time: "01:00" }));
    const r = itemsForDay(d, "d1");
    expect(r.timed.map((i) => i.id)).toEqual(["t1", "t2"]);
    expect(r.anytime.map((i) => i.id)).toEqual(["n1", "n2"]);
  });
});

describe("stayForNight / checkoutOn", () => {
  it("includes check_in night, excludes checkout day", () => {
    const d = data();
    expect(stayForNight(d, "2026-04-30")).toBeNull();
    expect(stayForNight(d, "2026-05-01")).toMatchObject({ stay: { id: "s1" }, nightIndex: 1, nights: 4 });
    expect(stayForNight(d, "2026-05-04")).toMatchObject({ stay: { id: "s1" }, nightIndex: 4, nights: 4 });
    expect(stayForNight(d, "2026-05-05")).toMatchObject({ stay: { id: "s2" }, nightIndex: 1, nights: 2 });
    expect(stayForNight(d, "2026-05-07")).toBeNull();
  });
  it("checkoutOn finds stay checking out that date", () => {
    expect(checkoutOn(data(), "2026-05-05")?.id).toBe("s1");
    expect(checkoutOn(data(), "2026-05-04")).toBeNull();
  });
});

describe("placesInArea / filterLocations", () => {
  it("lists child places", () => {
    expect(placesInArea(data(), "a1").map((l) => l.id)).toEqual(["p1", "p2"]);
  });
  it("filters by query case-insensitively over name/city/description", () => {
    const d = data();
    expect(filterLocations(d, { query: "noodles" }).map((l) => l.id)).toEqual(["p1"]);
    expect(filterLocations(d, { query: "KYOTO" }).map((l) => l.id)).toEqual(["p2"]);
    expect(filterLocations(d, { query: "shib" }).map((l) => l.id)).toEqual(["a1"]);
  });
  it("combines type, city, category", () => {
    const d = data();
    expect(filterLocations(d, { type: "area" }).map((l) => l.id)).toEqual(["a1"]);
    expect(filterLocations(d, { city: "Kyoto" }).map((l) => l.id)).toEqual(["p2"]);
    expect(filterLocations(d, { category_id: "c1", type: "place" }).map((l) => l.id)).toEqual(["p1"]);
    expect(filterLocations(d, {})).toHaveLength(3);
  });
});

describe("deleteImpact", () => {
  it("area counts places, stays, items", () => {
    const d = data();
    d.items.push(item("l1", { location_id: "p1" }), item("l2", { location_id: "a1" }));
    expect(deleteImpact(d, "locations", "a1")).toEqual({ places: 2, stays: 2, items: 2, uncategorized: 0 });
  });
  it("category counts uncategorized locations", () => {
    expect(deleteImpact(data(), "categories", "c1")).toEqual({ places: 0, stays: 0, items: 0, uncategorized: 2 });
  });
  it("day counts items", () => {
    expect(deleteImpact(data(), "days", "d1").items).toBe(4);
  });
});

describe("localISO", () => {
  it("formats local date", () => {
    expect(localISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
