import { describe, expect, it } from "vitest";
import { stayPayload, stayToForm, validateStayForm, type StayFormValues } from "./stay-form";

const ok: StayFormValues = {
  location_id: "l1", name: " Inn ", airbnb_url: " https://www.airbnb.com/rooms/1 ",
  check_in: "2026-10-10", check_out: "2026-10-13",
};

describe("stay-form", () => {
  it("valid passes", () => expect(validateStayForm(ok)).toEqual({}));
  it("requires fields", () => {
    const e = validateStayForm({ location_id: "", name: " ", airbnb_url: "", check_in: "", check_out: "" });
    expect(Object.keys(e).sort()).toEqual(["airbnb_url", "check_in", "check_out", "location_id", "name"]);
  });
  it("rejects non-airbnb url", () => {
    expect(validateStayForm({ ...ok, airbnb_url: "https://example.com/x" }).airbnb_url).toBe(
      "Enter an Airbnb link (https://www.airbnb.com/...)",
    );
  });
  it("check_out must be after check_in", () => {
    expect(validateStayForm({ ...ok, check_out: "2026-10-10" }).check_out).toBe("Check-out must be after check-in");
    expect(validateStayForm({ ...ok, check_out: "2026-10-09" }).check_out).toBeDefined();
  });
  it("payload trims", () => {
    expect(stayPayload(ok)).toEqual({
      location_id: "l1", name: "Inn", airbnb_url: "https://www.airbnb.com/rooms/1",
      check_in: "2026-10-10", check_out: "2026-10-13",
    });
  });
  it("stayToForm roundtrip", () => {
    const s = { id: "s", location_id: "l1", name: "Inn", airbnb_url: "u", check_in: "a", check_out: "b" };
    expect(stayToForm(s)).toEqual({ location_id: "l1", name: "Inn", airbnb_url: "u", check_in: "a", check_out: "b" });
  });
});
