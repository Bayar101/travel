import { describe, expect, it } from "vitest";
import { dayPayload, dayToForm, defaultNewDayDate, validateDayForm } from "./day-form";

describe("day-form", () => {
  it("date required", () => {
    expect(validateDayForm({ date: "", title: "", note: "" }).date).toBe("Date is required");
    expect(validateDayForm({ date: "2026-10-09", title: "", note: "" })).toEqual({});
  });
  it("payload trims, empty -> null", () => {
    expect(dayPayload({ date: "2026-10-09", title: "  Tokyo ", note: "  " })).toEqual({
      date: "2026-10-09", title: "Tokyo", note: null,
    });
  });
  it("note keeps inner line breaks", () => {
    expect(dayPayload({ date: "d", title: "", note: "a\nb\n" }).note).toBe("a\nb");
  });
  it("dayToForm nulls -> empty", () => {
    expect(dayToForm({ id: "x", date: "d", title: null, note: null })).toEqual({ date: "d", title: "", note: "" });
  });
  it("default date: day after latest, month rollover, else today", () => {
    expect(defaultNewDayDate([], "2026-10-03")).toBe("2026-10-03");
    expect(defaultNewDayDate([{ date: "2026-10-09" }, { date: "2026-10-31" }], "x")).toBe("2026-11-01");
  });
});
