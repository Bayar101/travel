import { describe, expect, it } from "vitest";
import {
  adjacentDayIds, dateBlock, dayListRows, dayNumber, itemPreviews, swipeDirection, tripStatus, tripSummary,
} from "./trip";
import type { Day, TripData } from "./types";

const day = (id: string, date: string): Day => ({ id, date, title: null, note: null });
const DAYS = [day("c", "2026-10-25"), day("a", "2026-10-20"), day("b", "2026-10-21")];

describe("dayNumber", () => {
  it("is the calendar day of the trip, 1-based", () => {
    expect(dayNumber("2026-10-20", "2026-10-20")).toBe(1);
    expect(dayNumber("2026-10-20", "2026-10-25")).toBe(6);
    expect(dayNumber("2026-10-30", "2026-11-02")).toBe(4); // month boundary
  });
});

describe("tripStatus", () => {
  it("empty without days", () => {
    expect(tripStatus([], "2026-10-04")).toEqual({ kind: "empty" });
  });
  it("before: days until start and range", () => {
    expect(tripStatus(DAYS, "2026-10-04")).toEqual({
      kind: "before", daysUntil: 16, first: "2026-10-20", last: "2026-10-25",
    });
    expect(tripStatus(DAYS, "2026-10-19")).toMatchObject({ kind: "before", daysUntil: 1 });
  });
  it("during: day X of N with today's day id", () => {
    expect(tripStatus(DAYS, "2026-10-20")).toEqual({ kind: "during", dayNumber: 1, total: 6, todayId: "a" });
    expect(tripStatus(DAYS, "2026-10-25")).toEqual({ kind: "during", dayNumber: 6, total: 6, todayId: "c" });
  });
  it("during on an unplanned date: no todayId", () => {
    expect(tripStatus(DAYS, "2026-10-23")).toEqual({ kind: "during", dayNumber: 4, total: 6, todayId: null });
  });
  it("after", () => {
    expect(tripStatus(DAYS, "2026-10-26")).toEqual({ kind: "after" });
  });
});

describe("tripSummary", () => {
  it("before", () => {
    expect(tripSummary({ kind: "before", daysUntil: 16, first: "2026-10-20", last: "2026-10-25" })).toEqual({
      title: "Trip starts in 16 days", detail: "Tue 20 Oct – Sun 25 Oct",
    });
    expect(tripSummary({ kind: "before", daysUntil: 1, first: "2026-10-20", last: "2026-10-20" })).toEqual({
      title: "Trip starts tomorrow", detail: "Tue 20 Oct",
    });
  });
  it("during", () => {
    expect(tripSummary({ kind: "during", dayNumber: 2, total: 6, todayId: "b" })).toEqual({ title: "Day 2 of 6", detail: null });
    expect(tripSummary({ kind: "during", dayNumber: 4, total: 6, todayId: null })).toEqual({
      title: "Day 4 of 6", detail: "Nothing planned today",
    });
  });
  it("after", () => {
    expect(tripSummary({ kind: "after" })).toEqual({ title: "Trip complete", detail: null });
  });
});

describe("dayListRows", () => {
  it("sorts, numbers days from the first date and inserts gaps", () => {
    expect(dayListRows(DAYS)).toEqual([
      { kind: "day", day: DAYS[1], dayNumber: 1 },
      { kind: "day", day: DAYS[2], dayNumber: 2 },
      { kind: "gap", key: "gap-b", days: 3, label: "3 days without plans" },
      { kind: "day", day: DAYS[0], dayNumber: 6 },
    ]);
  });
  it("singular gap label", () => {
    const rows = dayListRows([day("a", "2026-10-20"), day("b", "2026-10-22")]);
    expect(rows[1]).toEqual({ kind: "gap", key: "gap-a", days: 1, label: "1 day without plans" });
  });
  it("empty", () => {
    expect(dayListRows([])).toEqual([]);
  });
});

describe("adjacentDayIds", () => {
  it("prev/next by date, null at ends", () => {
    expect(adjacentDayIds(DAYS, "a")).toEqual({ prev: null, next: "b" });
    expect(adjacentDayIds(DAYS, "b")).toEqual({ prev: "a", next: "c" });
    expect(adjacentDayIds(DAYS, "c")).toEqual({ prev: "b", next: null });
  });
  it("unknown id", () => {
    expect(adjacentDayIds(DAYS, "zz")).toEqual({ prev: null, next: null });
  });
});

describe("dateBlock", () => {
  it("weekday, day of month, month", () => {
    expect(dateBlock("2026-10-20")).toEqual({ weekday: "Tue", day: "20", month: "Oct" });
  });
});

describe("itemPreviews", () => {
  const data: TripData = {
    version: 1,
    categories: [],
    locations: [
      { id: "l1", type: "place", parent_id: null, category_id: null, name: "Senso-ji", description: null, emoji: "⛩️", city: "Tokyo", lat: 0, lng: 0 },
      { id: "l2", type: "area", parent_id: null, category_id: null, name: "Shibuya", description: null, emoji: "🏙️", city: "Tokyo", lat: 0, lng: 0 },
    ],
    stays: [],
    days: [day("d1", "2026-10-20")],
    items: [
      { id: "i3", day_id: "d1", location_id: "l2", time: null, position: 0, note: null },
      { id: "i1", day_id: "d1", location_id: "l1", time: "08:00", position: 1, note: "umbrella" },
      { id: "i2", day_id: "d1", location_id: null, time: "15:30", position: 2, note: "Narita Express\nto Shinjuku" },
      { id: "i4", day_id: "d1", location_id: "gone", time: null, position: 3, note: null },
      { id: "x", day_id: "d2", location_id: "l1", time: null, position: 0, note: null },
    ],
  };
  it("timed first, then anytime; notes use their first line; capped with remainder", () => {
    expect(itemPreviews(data, "d1", 3)).toEqual({
      previews: [
        { id: "i1", time: "08:00", emoji: "⛩️", text: "Senso-ji" },
        { id: "i2", time: "15:30", emoji: "📝", text: "Narita Express" },
        { id: "i3", time: null, emoji: "🏙️", text: "Shibuya" },
      ],
      more: 1,
    });
  });
  it("unknown location", () => {
    expect(itemPreviews(data, "d1", 10).previews[3]).toEqual({ id: "i4", time: null, emoji: "❓", text: "Unknown location" });
  });
  it("empty day", () => {
    expect(itemPreviews(data, "nope", 3)).toEqual({ previews: [], more: 0 });
  });
});

describe("swipeDirection", () => {
  it("horizontal swipes past threshold", () => {
    expect(swipeDirection(-80, 10)).toBe("next"); // finger moves left -> next day
    expect(swipeDirection(80, -10)).toBe("prev");
  });
  it("ignores short or mostly vertical swipes", () => {
    expect(swipeDirection(-40, 0)).toBeNull();
    expect(swipeDirection(-80, 70)).toBeNull();
    expect(swipeDirection(0, 0)).toBeNull();
  });
});
