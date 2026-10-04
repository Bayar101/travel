import { describe, expect, it } from "vitest";
import { parseHash } from "./parse-hash";

describe("parseHash", () => {
  it("parses known routes", () => {
    expect(parseHash("#/")).toEqual({ view: "days" });
    expect(parseHash("#/day/abc")).toEqual({ view: "day", id: "abc" });
    expect(parseHash("#/locations")).toEqual({ view: "locations" });
    expect(parseHash("#/location/x1")).toEqual({ view: "location", id: "x1" });
    expect(parseHash("#/categories")).toEqual({ view: "categories" });
    expect(parseHash("#/stays")).toEqual({ view: "stays" });
  });
  it("falls back to days", () => {
    for (const h of ["", "#", "#/nope", "#/day", "#/day/", "#/location", "garbage"]) {
      expect(parseHash(h)).toEqual({ view: "days" });
    }
  });
  it("decodes ids and tolerates trailing slash", () => {
    expect(parseHash("#/day/a%20b/")).toEqual({ view: "day", id: "a b" });
    expect(parseHash("#/stays/")).toEqual({ view: "stays" });
  });
  it("parses the map route", () => {
    expect(parseHash("#/map")).toEqual({ view: "map" });
    expect(parseHash("#/map/")).toEqual({ view: "map" });
    expect(parseHash("#/map/x")).toEqual({ view: "days" });
  });
});
