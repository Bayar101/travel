import { describe, expect, it } from "vitest";
import {
  itemPayload, itemToForm, moveId, nextAnytimePosition, validateItemForm, type ItemFormValues,
} from "./day-items";
import type { DayItem } from "./types";

const it_ = (id: string, time: string | null, position: number): DayItem => ({
  id, day_id: "d", location_id: "l", time, position, note: null,
});

describe("nextAnytimePosition", () => {
  it("0 when no anytime items", () => {
    expect(nextAnytimePosition([])).toBe(0);
    expect(nextAnytimePosition([it_("a", "09:00", 5)])).toBe(0);
  });
  it("max anytime + 1, ignoring timed", () => {
    expect(nextAnytimePosition([it_("a", null, 0), it_("b", null, 4), it_("c", "10:00", 9)])).toBe(5);
  });
});

describe("moveId", () => {
  it("moves up and down", () => {
    expect(moveId(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveId(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
  });
  it("null at edges / unknown", () => {
    expect(moveId(["a", "b"], "a", -1)).toBeNull();
    expect(moveId(["a", "b"], "b", 1)).toBeNull();
    expect(moveId(["a"], "z", 1)).toBeNull();
  });
});

const loc: ItemFormValues = { mode: "location", location_id: "l1", time: null, note: "" };

describe("validateItemForm", () => {
  it("location mode needs location", () => {
    expect(validateItemForm({ ...loc, location_id: "" }).location_id).toBe("Choose a location");
    expect(validateItemForm(loc)).toEqual({});
  });
  it("note mode needs note", () => {
    expect(validateItemForm({ mode: "note", location_id: "", time: null, note: "  " }).note).toBe("Note is required");
    expect(validateItemForm({ mode: "note", location_id: "", time: null, note: "x" })).toEqual({});
  });
});

describe("itemPayload", () => {
  const sibs = [it_("a", null, 0), it_("b", null, 3), it_("t", "09:00", 1)];
  it("create untimed: position max+1", () => {
    expect(itemPayload(loc, sibs)).toEqual({ location_id: "l1", time: null, note: null, position: 4 });
  });
  it("create timed still gets position", () => {
    expect(itemPayload({ ...loc, time: "08:00", note: " hi " }, sibs)).toEqual({
      location_id: "l1", time: "08:00", note: "hi", position: 4,
    });
  });
  it("note mode drops location", () => {
    expect(itemPayload({ mode: "note", location_id: "l1", time: null, note: "x" }, []).location_id).toBeNull();
  });
  it("edit keeps position when time unchanged", () => {
    expect(itemPayload(loc, sibs, sibs[0]).position).toBe(0);
  });
  it("edit timed -> cleared moves to anytime end (excluding self)", () => {
    const t = it_("t", "09:00", 10);
    expect(itemPayload(loc, [...sibs, t], t).position).toBe(4);
  });
  it("edit anytime -> timed keeps position", () => {
    expect(itemPayload({ ...loc, time: "10:00" }, sibs, sibs[1]).position).toBe(3);
  });
});

describe("itemToForm", () => {
  it("detects mode", () => {
    expect(itemToForm({ ...it_("a", "09:00", 0), note: "n" })).toEqual({
      mode: "location", location_id: "l", time: "09:00", note: "n",
    });
    expect(itemToForm({ ...it_("a", null, 0), location_id: null, note: "n" }).mode).toBe("note");
  });
});
