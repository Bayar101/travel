import { describe, expect, it } from "vitest";
import { getResource, mapPgError, normalizeRow, normalizeTime } from "./resources";

describe("getResource", () => {
  it("maps items to day_items", () => expect(getResource("items")?.table).toBe("day_items"));
  it("finds all resources", () => {
    for (const r of ["categories", "locations", "stays", "days", "items"]) expect(getResource(r)).not.toBeNull();
  });
  it("unknown -> null", () => {
    expect(getResource("nope")).toBeNull();
    expect(getResource("constructor")).toBeNull();
    expect(getResource("reorder")).toBeNull();
  });
  it("validates via task 2 validators", () => {
    expect(getResource("categories")!.validate({ name: "Food" }, "create").ok).toBe(true);
    expect(getResource("categories")!.validate({}, "create").ok).toBe(false);
  });
});

describe("normalizeTime", () => {
  it("HH:MM:SS -> HH:MM", () => expect(normalizeTime("09:30:00")).toBe("09:30"));
  it("keeps HH:MM", () => expect(normalizeTime("09:30")).toBe("09:30"));
  it("null -> null", () => expect(normalizeTime(null)).toBeNull());
});

describe("normalizeRow", () => {
  it("normalizes item time", () =>
    expect(normalizeRow("items", { id: "x", time: "18:05:00" })).toEqual({ id: "x", time: "18:05" }));
  it("keeps null time", () => expect(normalizeRow("items", { time: null })).toEqual({ time: null }));
  it("leaves other resources", () => expect(normalizeRow("days", { time: "1:2:3" })).toEqual({ time: "1:2:3" }));
});

describe("mapPgError", () => {
  it("23505 category", () =>
    expect(mapPgError({ code: "23505", message: 'duplicate key value violates unique constraint "categories_name_key"' })).toEqual({
      status: 409,
      message: "Category name already exists",
    }));
  it("23505 day", () =>
    expect(mapPgError({ code: "23505", message: 'violates unique constraint "days_date_key"' })?.message).toBe(
      "A day with that date already exists",
    ));
  it("23505 generic", () => expect(mapPgError({ code: "23505", message: "x" })).toEqual({ status: 409, message: "Already exists" }));
  it("23P01 overlap", () =>
    expect(mapPgError({ code: "23P01", message: "conflicting key value violates exclusion constraint" })).toEqual({
      status: 409,
      message: "Stay dates overlap another stay",
    }));
  it("23503 fk", () => expect(mapPgError({ code: "23503", message: "fk" })?.status).toBe(400));
  it("23514 check names", () => {
    expect(mapPgError({ code: "23514", message: 'violates check constraint "day_items_location_or_note"' })).toEqual({
      status: 400,
      message: "location_id or note is required",
    });
    expect(mapPgError({ code: "23514", message: 'violates check constraint "stays_dates_order"' })?.message).toBe(
      "check_out must be after check_in",
    );
    expect(mapPgError({ code: "23514", message: 'violates check constraint "locations_area_no_parent"' })?.message).toBe(
      "an area cannot have a parent_id",
    );
  });
  it("trigger parent must be area", () =>
    expect(mapPgError({ code: "P0001", message: "parent_id must reference a location of type area" })).toEqual({
      status: 400,
      message: "parent_id must reference a location of type area",
    }));
  it("unknown check -> generic 400", () => expect(mapPgError({ code: "23514", message: "?" })).toEqual({ status: 400, message: "Invalid data" }));
  it("unexpected -> null", () => {
    expect(mapPgError({ code: "XX000", message: "boom" })).toBeNull();
    expect(mapPgError({})).toBeNull();
  });
});
