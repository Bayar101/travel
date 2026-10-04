import { describe, expect, it } from "vitest";
import {
  clearAutoCoords, cityList, coordsSummary, defaultEmoji, locationPayload, shouldFillName, QUICK_EMOJI, validateLocationForm, type LocationFormValues,
} from "./location-form";
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

describe("QUICK_EMOJI", () => {
  it("has ~12 unique emoji", () => {
    expect(QUICK_EMOJI.length).toBe(12);
    expect(new Set(QUICK_EMOJI).size).toBe(12);
  });
});

describe("coordsSummary", () => {
  it("formats valid coords to 5 decimals", () => {
    expect(coordsSummary({ lat: "35.7147651", lng: "139.7966553" })).toBe("35.71477, 139.79666");
  });
  it("null when missing or invalid", () => {
    expect(coordsSummary({ lat: "", lng: "139" })).toBeNull();
    expect(coordsSummary({ lat: "abc", lng: "139" })).toBeNull();
    expect(coordsSummary({ lat: "95", lng: "139" })).toBeNull();
  });
});

describe("link autofill helpers", () => {
  const v = { lat: "35.1", lng: "139.2" };
  it("clearAutoCoords clears only coordinates a link filled", () => {
    expect(clearAutoCoords(v, { lat: "35.1", lng: "139.2" })).toEqual({ lat: "", lng: "" });
    expect(clearAutoCoords(v, null)).toEqual(v);
    expect(clearAutoCoords({ lat: "35.1", lng: "139.3" }, { lat: "35.1", lng: "139.2" })).toEqual({ lat: "35.1", lng: "139.3" });
  });
  it("shouldFillName: empty or still the previous auto-filled name", () => {
    expect(shouldFillName("", null, "A")).toBe(true);
    expect(shouldFillName("  ", null, "A")).toBe(true);
    expect(shouldFillName("A", "A", "B")).toBe(true);
    expect(shouldFillName("Mine", "A", "B")).toBe(false);
    expect(shouldFillName("", null, null)).toBe(false);
  });
});
