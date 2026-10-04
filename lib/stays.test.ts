import { describe, expect, it } from "vitest";
import { gapLabel, stayStatus, stayStatusLabel, stayTimeline } from "./stays";

const s = (id: string, check_in: string, check_out: string) => ({
  id, location_id: "l", name: id, airbnb_url: "https://www.airbnb.com/rooms/1", check_in, check_out,
});

describe("stayStatus", () => {
  const st = s("a", "2026-10-20", "2026-10-24");
  it("upcoming before check-in", () => expect(stayStatus(st, "2026-10-19")).toBe("upcoming"));
  it("now from check-in until the day before check-out", () => {
    expect(stayStatus(st, "2026-10-20")).toBe("now");
    expect(stayStatus(st, "2026-10-23")).toBe("now");
  });
  it("past from check-out day", () => expect(stayStatus(st, "2026-10-24")).toBe("past"));
});

describe("stayStatusLabel", () => {
  const st = s("a", "2026-10-20", "2026-10-24");
  it("counts down to check-in", () => {
    expect(stayStatusLabel(st, "2026-10-04")).toBe("Check-in in 16 days");
    expect(stayStatusLabel(st, "2026-10-19")).toBe("Check-in tomorrow");
  });
  it("shows night progress while staying", () => {
    expect(stayStatusLabel(st, "2026-10-20")).toBe("Night 1 of 4");
    expect(stayStatusLabel(st, "2026-10-23")).toBe("Night 4 of 4 · check-out tomorrow");
  });
  it("past", () => expect(stayStatusLabel(st, "2026-10-24")).toBe("Checked out"));
});

describe("stayTimeline", () => {
  it("sorts by check-in and inserts gaps between stays", () => {
    const rows = stayTimeline([s("b", "2026-10-26", "2026-10-28"), s("a", "2026-10-20", "2026-10-24")], "2026-10-04");
    expect(rows.map((r) => (r.kind === "stay" ? r.stay.id : `gap ${r.from}..${r.to} ${r.nights}`))).toEqual([
      "a",
      "gap 2026-10-24..2026-10-25 2",
      "b",
    ]);
    expect(rows[0]).toMatchObject({ kind: "stay", status: "upcoming", nights: 4 });
  });
  it("no gap when check-out equals next check-in", () => {
    const rows = stayTimeline([s("a", "2026-10-20", "2026-10-24"), s("b", "2026-10-24", "2026-10-26")], "2026-10-04");
    expect(rows.map((r) => r.kind)).toEqual(["stay", "stay"]);
  });
  it("single-night gap", () => {
    const rows = stayTimeline([s("a", "2026-10-20", "2026-10-24"), s("b", "2026-10-25", "2026-10-26")], "2026-10-04");
    expect(rows[1]).toEqual({ kind: "gap", from: "2026-10-24", to: "2026-10-24", nights: 1 });
  });
  it("empty", () => expect(stayTimeline([], "2026-10-04")).toEqual([]));
});

describe("gapLabel", () => {
  it("range for several nights", () => {
    expect(gapLabel({ kind: "gap", from: "2026-10-24", to: "2026-10-25", nights: 2 })).toBe("Sat 24 Oct – Sun 25 Oct · 2 nights");
  });
  it("single night", () => {
    expect(gapLabel({ kind: "gap", from: "2026-10-24", to: "2026-10-24", nights: 1 })).toBe("Night of Sat 24 Oct");
  });
});
