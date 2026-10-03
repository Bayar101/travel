import { describe, expect, it } from "vitest";
import {
  isAirbnbUrl,
  isDeleteConfirmed,
  validateCategory,
  validateDay,
  validateItem,
  validateLocation,
  validateStay,
} from "@/lib/validation";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID2 = "22222222-2222-4222-8222-222222222222";

function okValue(r: { ok: boolean; value?: unknown; error?: string }) {
  expect(r.ok, r.error).toBe(true);
  return r.value;
}
function bad(r: { ok: boolean; error?: string }, re?: RegExp) {
  expect(r.ok).toBe(false);
  expect(typeof r.error).toBe("string");
  if (re) expect(r.error).toMatch(re);
}

describe("isDeleteConfirmed", () => {
  it.each([
    [{ confirm: "delete me" }, true],
    [{ confirm: "Delete me" }, false],
    [{ confirm: "delete me " }, false],
    [{ confirm: "" }, false],
    [{}, false],
    [null, false],
    [undefined, false],
    ["delete me", false],
    [[], false],
    [{ confirm: true }, false],
  ])("%j -> %s", (body, exp) => {
    expect(isDeleteConfirmed(body)).toBe(exp);
  });
});

describe("isAirbnbUrl", () => {
  it.each([
    ["https://www.airbnb.com/rooms/123", true],
    ["https://airbnb.com/rooms/123", true],
    ["https://airbnb.jp/rooms/1", true],
    ["https://www.airbnb.co.jp/rooms/1", true],
    ["https://ja.airbnb.com/rooms/1", true],
    ["https://abnb.me/abc", true],
    ["https://www.airbnb.com.au/rooms/1", true],
    ["https://airbnb.com.evil/rooms/1", false],
    ["http://www.airbnb.com/rooms/1", false],
    ["https://evil.com/airbnb.com", false],
    ["https://airbnb.com.evil.com/", false],
    ["https://notairbnb.com/", false],
    ["https://fakeabnb.me/", false],
    ["https://www.airbnb/rooms", false],
    ["javascript:alert(1)", false],
    ["not a url", false],
    ["", false],
  ])("%s -> %s", (u, exp) => {
    expect(isAirbnbUrl(u)).toBe(exp);
  });
});

describe("validateCategory", () => {
  it("create trims, empty emoji -> null, strips unknown keys", () => {
    expect(okValue(validateCategory({ name: "  Food ", emoji: " ", extra: 1, id: "x" }, "create"))).toEqual({
      name: "Food",
      emoji: null,
    });
  });
  it("create without emoji gives null", () => {
    expect(okValue(validateCategory({ name: "Food" }, "create"))).toEqual({ name: "Food", emoji: null });
  });
  it("create rejects bad names", () => {
    bad(validateCategory({}, "create"), /name/);
    bad(validateCategory({ name: "   " }, "create"), /name/);
    bad(validateCategory({ name: 5 }, "create"), /name/);
    bad(validateCategory({ name: "a".repeat(121) }, "create"), /name/);
    expect(validateCategory({ name: "a".repeat(120) }, "create").ok).toBe(true);
  });
  it("rejects non-object", () => {
    bad(validateCategory(null, "create"));
    bad(validateCategory("x", "update"));
    bad(validateCategory([], "update"));
  });
  it("update partial, needs >=1 field", () => {
    expect(okValue(validateCategory({ emoji: "🍜" }, "update"))).toEqual({ emoji: "🍜" });
    expect(okValue(validateCategory({ emoji: "" }, "update"))).toEqual({ emoji: null });
    bad(validateCategory({}, "update"), /field/);
    bad(validateCategory({ unknown: 1 }, "update"), /field/);
    bad(validateCategory({ name: "" }, "update"), /name/);
  });
});

describe("validateLocation", () => {
  const base = { type: "place", name: " Ramen ", city: "Tokyo", lat: 35.6, lng: 139.7 };
  it("create place with defaults", () => {
    expect(okValue(validateLocation(base, "create"))).toEqual({
      type: "place",
      parent_id: null,
      category_id: null,
      name: "Ramen",
      description: null,
      emoji: "📍",
      city: "Tokyo",
      lat: 35.6,
      lng: 139.7,
    });
  });
  it("create place with parent, category, description, emoji", () => {
    const v = okValue(
      validateLocation(
        { ...base, parent_id: UUID, category_id: UUID2, description: " good ", emoji: "🍜", junk: 1 },
        "create",
      ),
    );
    expect(v).toMatchObject({ parent_id: UUID, category_id: UUID2, description: "good", emoji: "🍜" });
    expect(v).not.toHaveProperty("junk");
  });
  it("area with parent rejected", () => {
    bad(validateLocation({ ...base, type: "area", parent_id: UUID }, "create"), /area/);
    expect(validateLocation({ ...base, type: "area", parent_id: null }, "create").ok).toBe(true);
    expect(validateLocation({ ...base, type: "area", parent_id: "" }, "create").ok).toBe(true);
  });
  it("update to area with parent rejected; parent only without type is ok", () => {
    bad(validateLocation({ type: "area", parent_id: UUID }, "update"), /area/);
    expect(okValue(validateLocation({ parent_id: UUID }, "update"))).toEqual({ parent_id: UUID });
    expect(okValue(validateLocation({ type: "area" }, "update"))).toEqual({ type: "area" });
  });
  it.each([
    ["type", { type: "city" }],
    ["type", { type: undefined }],
    ["name", { name: "" }],
    ["name", { name: "x".repeat(121) }],
    ["city", { city: " " }],
    ["lat", { lat: 90.1 }],
    ["lat", { lat: -90.1 }],
    ["lat", { lat: "35" }],
    ["lat", { lat: NaN }],
    ["lat", { lat: Infinity }],
    ["lng", { lng: 180.1 }],
    ["lng", { lng: -181 }],
    ["lng", { lng: null }],
    ["parent_id", { parent_id: "nope" }],
    ["category_id", { category_id: 5 }],
    ["emoji", { emoji: "" }],
  ])("create rejects invalid %s", (field, patch) => {
    bad(validateLocation({ ...base, ...patch }, "create"), new RegExp(field));
  });
  it("accepts boundary coords", () => {
    expect(validateLocation({ ...base, lat: 90, lng: -180 }, "create").ok).toBe(true);
    expect(validateLocation({ ...base, lat: -90, lng: 180 }, "create").ok).toBe(true);
    expect(validateLocation({ ...base, lat: 0, lng: 0 }, "create").ok).toBe(true);
  });
  it("create requires required fields", () => {
    for (const k of ["type", "name", "city", "lat", "lng"]) {
      const b: Record<string, unknown> = { ...base };
      delete b[k];
      bad(validateLocation(b, "create"), new RegExp(k));
    }
  });
  it("update partial", () => {
    expect(okValue(validateLocation({ name: " New ", lat: 1 }, "update"))).toEqual({ name: "New", lat: 1 });
    expect(okValue(validateLocation({ description: "" , category_id: null }, "update"))).toEqual({
      description: null,
      category_id: null,
    });
    bad(validateLocation({}, "update"), /field/);
    bad(validateLocation({ lat: 100 }, "update"), /lat/);
  });
});

describe("validateStay", () => {
  const base = {
    location_id: UUID,
    name: " Hotel ",
    airbnb_url: "https://www.airbnb.com/rooms/1",
    check_in: "2026-04-01",
    check_out: "2026-04-03",
  };
  it("create ok", () => {
    expect(okValue(validateStay({ ...base, x: 1 }, "create"))).toEqual({ ...base, name: "Hotel" });
  });
  it("check_out must be after check_in", () => {
    bad(validateStay({ ...base, check_out: "2026-04-01" }, "create"), /check_out/);
    bad(validateStay({ ...base, check_out: "2026-03-31" }, "create"), /check_out/);
  });
  it("update with both dates checks order; with one does not", () => {
    bad(validateStay({ check_in: "2026-05-01", check_out: "2026-04-01" }, "update"), /check_out/);
    expect(okValue(validateStay({ check_in: "2026-05-01" }, "update"))).toEqual({ check_in: "2026-05-01" });
  });
  it.each([
    "2026-02-30",
    "2026-13-01",
    "2026-4-1",
    "20260401",
    "2026-04-01T00:00",
    "",
    "abcd-ef-gh",
  ])("rejects bad date %s", (d) => {
    bad(validateStay({ ...base, check_in: d }, "create"), /check_in/);
  });
  it("accepts leap day only in leap year", () => {
    expect(validateStay({ ...base, check_in: "2028-02-29", check_out: "2028-03-01" }, "create").ok).toBe(true);
    bad(validateStay({ ...base, check_in: "2027-02-29", check_out: "2027-03-01" }, "create"), /check_in/);
  });
  it("rejects bad urls and missing fields", () => {
    bad(validateStay({ ...base, airbnb_url: "https://example.com/x" }, "create"), /airbnb_url/);
    bad(validateStay({ ...base, airbnb_url: "http://airbnb.com/x" }, "create"), /airbnb_url/);
    bad(validateStay({ ...base, airbnb_url: "" }, "create"), /airbnb_url/);
    bad(validateStay({ ...base, location_id: "x" }, "create"), /location_id/);
    bad(validateStay({ ...base, name: "" }, "create"), /name/);
    for (const k of Object.keys(base)) {
      const b: Record<string, unknown> = { ...base };
      delete b[k];
      bad(validateStay(b, "create"), new RegExp(k));
    }
  });
  it("trims url; update needs a field", () => {
    expect(okValue(validateStay({ airbnb_url: " https://abnb.me/x " }, "update"))).toEqual({
      airbnb_url: "https://abnb.me/x",
    });
    bad(validateStay({}, "update"), /field/);
    bad(validateStay({ airbnb_url: "https://evil.com" }, "update"), /airbnb_url/);
  });
});

describe("validateDay", () => {
  it("create ok, nullables empty -> null", () => {
    expect(okValue(validateDay({ date: "2026-04-01", title: " Tokyo ", note: "" }, "create"))).toEqual({
      date: "2026-04-01",
      title: "Tokyo",
      note: null,
    });
    expect(okValue(validateDay({ date: "2026-04-01" }, "create"))).toEqual({
      date: "2026-04-01",
      title: null,
      note: null,
    });
  });
  it("rejects bad/missing date", () => {
    bad(validateDay({}, "create"), /date/);
    bad(validateDay({ date: "2026-02-31" }, "create"), /date/);
    bad(validateDay({ date: 20260401 }, "create"), /date/);
  });
  it("rejects non-string title", () => {
    bad(validateDay({ date: "2026-04-01", title: 4 }, "create"), /title/);
  });
  it("update partial", () => {
    expect(okValue(validateDay({ title: null }, "update"))).toEqual({ title: null });
    bad(validateDay({}, "update"), /field/);
  });
});

describe("validateItem", () => {
  it("create with location", () => {
    expect(okValue(validateItem({ day_id: UUID, location_id: UUID2, time: "09:30" }, "create"))).toEqual({
      day_id: UUID,
      location_id: UUID2,
      time: "09:30",
      position: 0,
      note: null,
    });
  });
  it("create note only", () => {
    expect(okValue(validateItem({ day_id: UUID, note: " rain " , position: 3 }, "create"))).toEqual({
      day_id: UUID,
      location_id: null,
      time: null,
      position: 3,
      note: "rain",
    });
  });
  it("create needs location or non-empty note", () => {
    bad(validateItem({ day_id: UUID }, "create"), /location_id|note/);
    bad(validateItem({ day_id: UUID, note: "  " }, "create"), /location_id|note/);
    bad(validateItem({ day_id: UUID, location_id: null, note: null }, "create"), /location_id|note/);
  });
  it("create needs day_id", () => {
    bad(validateItem({ note: "x" }, "create"), /day_id/);
    bad(validateItem({ day_id: "bad", note: "x" }, "create"), /day_id/);
  });
  it.each(["00:00", "09:05", "23:59"])("accepts time %s", (t) => {
    expect(validateItem({ day_id: UUID, note: "x", time: t }, "create").ok).toBe(true);
  });
  it.each(["24:00", "9:30", "12:60", "12:5", "12:30:00", "ab:cd", " 12:30"])("rejects time %s", (t) => {
    bad(validateItem({ day_id: UUID, note: "x", time: t }, "create"), /time/);
  });
  it("empty time -> null", () => {
    expect(okValue(validateItem({ day_id: UUID, note: "x", time: "" }, "create"))).toMatchObject({ time: null });
  });
  it("position must be non-negative integer", () => {
    bad(validateItem({ day_id: UUID, note: "x", position: -1 }, "create"), /position/);
    bad(validateItem({ day_id: UUID, note: "x", position: 1.5 }, "create"), /position/);
    bad(validateItem({ day_id: UUID, note: "x", position: "1" }, "create"), /position/);
  });
  it("update partial; day_id not updatable (stripped)", () => {
    expect(okValue(validateItem({ time: "10:00", day_id: UUID }, "update"))).toEqual({ time: "10:00" });
    expect(okValue(validateItem({ note: "" }, "update"))).toEqual({ note: null });
    bad(validateItem({}, "update"), /field/);
    bad(validateItem({ day_id: UUID }, "update"), /field/);
    bad(validateItem({ time: "99:99" }, "update"), /time/);
  });
});
