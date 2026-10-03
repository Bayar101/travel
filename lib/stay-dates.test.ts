import { describe, expect, it } from "vitest";
import { formatDay, formatStayRange, isCurrentStay, nightsBetween } from "./stay-dates";

describe("stay-dates", () => {
  it("formats a day without UTC shift", () => {
    expect(formatDay("2026-10-10")).toBe("Sat 10 Oct");
    expect(formatDay("2026-01-01")).toBe("Thu 1 Jan");
  });
  it("counts nights", () => {
    expect(nightsBetween("2026-10-10", "2026-10-13")).toBe(3);
    expect(nightsBetween("2026-10-31", "2026-11-01")).toBe(1);
    expect(nightsBetween("2026-12-30", "2027-01-02")).toBe(3);
  });
  it("counts nights across DST change", () => {
    expect(nightsBetween("2026-03-07", "2026-03-10")).toBe(3);
    expect(nightsBetween("2026-10-31", "2026-11-02")).toBe(2);
  });
  it("formats range with pluralised nights", () => {
    expect(formatStayRange("2026-10-09", "2026-10-12")).toBe("Fri 9 Oct → Mon 12 Oct · 3 nights");
    expect(formatStayRange("2026-10-09", "2026-10-10")).toBe("Fri 9 Oct → Sat 10 Oct · 1 night");
  });
  it("current stay is [check_in, check_out)", () => {
    const s = { check_in: "2026-10-10", check_out: "2026-10-13" };
    expect(isCurrentStay(s, "2026-10-09")).toBe(false);
    expect(isCurrentStay(s, "2026-10-10")).toBe(true);
    expect(isCurrentStay(s, "2026-10-12")).toBe(true);
    expect(isCurrentStay(s, "2026-10-13")).toBe(false);
  });
});
