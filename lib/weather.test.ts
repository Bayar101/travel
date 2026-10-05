import { describe, expect, it } from "vitest";
import { forecastStatus, forecastUrl, parseForecast, weatherLocation, wmo, type ForecastJson } from "./weather";
import type { TripData } from "./types";

const loc = (id: string, lat: number) => ({
  id, type: "area" as const, parent_id: null, category_id: null, name: id,
  description: null, emoji: "📍", city: "Tokyo", lat, lng: 139,
});

const data = (): TripData => ({
  version: 1,
  categories: [],
  locations: [loc("tokyo", 35), loc("kyoto", 34)],
  stays: [
    { id: "s1", location_id: "tokyo", name: "A", airbnb_url: "u", check_in: "2026-10-01", check_out: "2026-10-04" },
    { id: "s2", location_id: "kyoto", name: "B", airbnb_url: "u", check_in: "2026-10-04", check_out: "2026-10-06" },
  ],
  days: [],
  items: [],
});

describe("weatherLocation", () => {
  it("uses the stay for that night", () => {
    expect(weatherLocation(data(), "2026-10-03")?.id).toBe("tokyo");
    expect(weatherLocation(data(), "2026-10-04")?.id).toBe("kyoto"); // move day: tonight's stay wins
  });
  it("falls back to the checkout stay on the last day", () => {
    expect(weatherLocation(data(), "2026-10-06")?.id).toBe("kyoto");
  });
  it("is undefined without a stay", () => {
    expect(weatherLocation(data(), "2026-09-01")).toBeUndefined();
  });
});

describe("forecastStatus", () => {
  it("covers today through 15 days ahead", () => {
    expect(forecastStatus("2026-10-05", "2026-10-05")).toBe("ok");
    expect(forecastStatus("2026-10-20", "2026-10-05")).toBe("ok");
    expect(forecastStatus("2026-10-21", "2026-10-05")).toBe("far");
    expect(forecastStatus("2026-10-04", "2026-10-05")).toBe("past");
  });
});

describe("forecastUrl", () => {
  it("requests the date plus the next morning", () => {
    const u = new URL(forecastUrl(35.6812, 139.7671, "2026-10-06", "2026-10-05"));
    expect(u.searchParams.get("start_date")).toBe("2026-10-06");
    expect(u.searchParams.get("end_date")).toBe("2026-10-07");
    expect(u.searchParams.get("timezone")).toBe("auto");
    expect(u.searchParams.get("latitude")).toBe("35.68");
  });
  it("clamps the end to the last forecast day", () => {
    const u = new URL(forecastUrl(35, 139, "2026-10-20", "2026-10-05"));
    expect(u.searchParams.get("end_date")).toBe("2026-10-20");
  });
});

describe("wmo", () => {
  it("maps codes, with a moon for clear nights", () => {
    expect(wmo(0, true)).toEqual({ emoji: "☀️", label: "Clear" });
    expect(wmo(0, false).emoji).toBe("🌙");
    expect(wmo(63, true).label).toBe("Rain");
    expect(wmo(95, true).label).toBe("Thunderstorm");
    expect(wmo(999, true).label).toBe("Unknown");
  });
});

describe("parseForecast", () => {
  const hours = (date: string) => Array.from({ length: 24 }, (_, h) => `${date}T${String(h).padStart(2, "0")}:00`);
  const json = (): ForecastJson => {
    const time = [...hours("2026-10-06"), ...hours("2026-10-07")];
    return {
      hourly: {
        time,
        temperature_2m: time.map((_, i) => 10 + (i % 24)), // 10..33 each day
        weather_code: time.map((_, i) => (i === 14 ? 61 : i === 20 ? 3 : 0)),
        precipitation_probability: time.map((_, i) => (i === 14 ? 70 : i === 26 ? 40 : 0)),
        is_day: time.map((_, i) => (i % 24 >= 6 && i % 24 < 18 ? 1 : 0)),
      },
    };
  };

  it("lists the 24 hours of the date", () => {
    const f = parseForecast(json(), "2026-10-06");
    expect(f.hours).toHaveLength(24);
    expect(f.hours[0]).toEqual({ hour: 0, temp: 10, code: 0, rain: 0, isDay: false });
    expect(f.hours[14]).toMatchObject({ hour: 14, code: 61, rain: 70, isDay: true });
  });

  it("summarises day (06-18) and night (18-06 next morning)", () => {
    const f = parseForecast(json(), "2026-10-06");
    expect(f.day).toEqual({ code: 61, temp: 27, rain: 70 }); // worst code, high, max rain
    expect(f.night).toEqual({ code: 3, temp: 10, rain: 40 }); // low includes next 00:00
  });

  it("night uses evening only when next morning is missing", () => {
    const j = json();
    const keep = 24;
    const h = j.hourly;
    j.hourly = {
      time: h.time.slice(0, keep), temperature_2m: h.temperature_2m.slice(0, keep),
      weather_code: h.weather_code.slice(0, keep), precipitation_probability: h.precipitation_probability.slice(0, keep),
      is_day: h.is_day.slice(0, keep),
    };
    expect(parseForecast(j, "2026-10-06").night).toEqual({ code: 3, temp: 28, rain: 0 });
  });

  it("treats null rain as 0 and rounds temps", () => {
    const j = json();
    j.hourly.precipitation_probability = j.hourly.precipitation_probability.map(() => null);
    j.hourly.temperature_2m = j.hourly.temperature_2m.map((t) => t + 0.6);
    const f = parseForecast(j, "2026-10-06");
    expect(f.day.rain).toBe(0);
    expect(f.hours[0].temp).toBe(11);
  });
});
