import { describe, expect, it } from "vitest";
import { cityList, defaultEmoji, locationPayload, validateLocationForm, type LocationFormValues } from "./location-form";
import type { TripData } from "./types";

const base: LocationFormValues = {
  type: "place", parent_id: "a1", name: " Ramen ", description: " ", category_id: "",
  emoji: "🍜", city: " Tokyo ", lat: "35.6", lng: "139.7",
};

describe("validateLocationForm", () => {
  it("accepts valid", () => expect(validateLocationForm(base)).toEqual({}));
  it("requires name, city, emoji", () => {
    const e = validateLocationForm({ ...base, name: " ", city: "", emoji: "" });
    expect(Object.keys(e).sort()).toEqual(["city", "emoji", "name"]);
  });
  it("checks coordinates", () => {
    expect(validateLocationForm({ ...base, lat: "", lng: "x" })).toEqual({
      lat: expect.any(String), lng: expect.any(String),
    });
    expect(validateLocationForm({ ...base, lat: "91" }).lat).toBeDefined();
    expect(validateLocationForm({ ...base, lng: "-181" }).lng).toBeDefined();
    expect(validateLocationForm({ ...base, lat: "-90", lng: "180" })).toEqual({});
  });
  it("empty coords say required", () => {
    const e = validateLocationForm({ ...base, lat: "", lng: " " });
    expect(e.lat).toBe("Latitude is required");
    expect(e.lng).toBe("Longitude is required");
  });
  it("rejects non-decimal forms", () => {
    for (const bad of ["1e1", "0x10", "Infinity", "1,5", "--1"]) {
      expect(validateLocationForm({ ...base, lat: bad }).lat).toBeDefined();
    }
    for (const ok of ["+35.6", "-1", ".5", "10."]) {
      expect(validateLocationForm({ ...base, lat: ok }).lat).toBeUndefined();
    }
  });
});

describe("locationPayload", () => {
  it("trims, nulls empties, numbers coords", () => {
    expect(locationPayload(base)).toEqual({
      type: "place", parent_id: "a1", category_id: null, name: "Ramen", description: null,
      emoji: "🍜", city: "Tokyo", lat: 35.6, lng: 139.7,
    });
  });
  it("area never has parent", () => {
    expect(locationPayload({ ...base, type: "area" }).parent_id).toBeNull();
  });
});

describe("cityList", () => {
  it("unique sorted", () => {
    const d = { locations: [{ city: "Tokyo" }, { city: "Kyoto" }, { city: "Tokyo" }] } as TripData;
    expect(cityList(d)).toEqual(["Kyoto", "Tokyo"]);
  });
});

describe("defaultEmoji", () => {
  it("category emoji else pin", () => {
    expect(defaultEmoji({ id: "c", name: "F", emoji: "🍜" })).toBe("🍜");
    expect(defaultEmoji({ id: "c", name: "F", emoji: null })).toBe("📍");
    expect(defaultEmoji(undefined)).toBe("📍");
  });
});
