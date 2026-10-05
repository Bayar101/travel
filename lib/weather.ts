// Open-Meteo forecast (free, no key; CORS-enabled so the client calls it directly).
// Times come back in the location's own timezone (timezone=auto), so hours read as local.

import { checkoutOn, locationById, stayForNight } from "./selectors";
import { addDays, nightsBetween } from "./stay-dates";
import type { Location, TripData } from "./types";

/** Open-Meteo serves today plus this many days ahead. */
export const FORECAST_DAYS_AHEAD = 15;

export interface Slot { code: number; temp: number; rain: number } // temp °C (day high / night low), rain = max % chance
export interface Hour { hour: number; temp: number; code: number; rain: number; isDay: boolean }
export interface Forecast { day: Slot; night: Slot; hours: Hour[] }

export interface ForecastJson {
  hourly: {
    time: string[]; // "YYYY-MM-DDTHH:MM"
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: (number | null)[];
    is_day: number[];
  };
}

/** Where the day's weather is: that night's stay, else the stay checked out of (last day). */
export function weatherLocation(data: TripData, date: string): Location | undefined {
  const stay = stayForNight(data, date)?.stay ?? checkoutOn(data, date);
  return stay ? locationById(data, stay.location_id) : undefined;
}

export function forecastStatus(date: string, today: string): "past" | "ok" | "far" {
  const ahead = nightsBetween(today, date);
  return ahead < 0 ? "past" : ahead > FORECAST_DAYS_AHEAD ? "far" : "ok";
}

/** The date plus the next morning (for the night summary), clamped to the forecast window. */
export function forecastUrl(lat: number, lng: number, date: string, today: string): string {
  const last = addDays(today, FORECAST_DAYS_AHEAD);
  const next = addDays(date, 1);
  const q = new URLSearchParams({
    latitude: lat.toFixed(2), // ~1 km: plenty for weather, and better cache hits
    longitude: lng.toFixed(2),
    timezone: "auto",
    start_date: date,
    end_date: next > last ? last : next,
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
  });
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}

export function parseForecast(json: ForecastJson, date: string): Forecast {
  const h = json.hourly;
  const next = addDays(date, 1);
  const all = h.time.map((t, i) => ({
    date: t.slice(0, 10),
    hour: Number(t.slice(11, 13)),
    temp: Math.round(h.temperature_2m[i]),
    code: h.weather_code[i],
    rain: h.precipitation_probability[i] ?? 0,
    isDay: h.is_day[i] === 1,
  }));
  const hours: Hour[] = all
    .filter((x) => x.date === date)
    .map((x) => ({ hour: x.hour, temp: x.temp, code: x.code, rain: x.rain, isDay: x.isDay }));
  const day = hours.filter((x) => x.hour >= 6 && x.hour < 18);
  const night = [...hours.filter((x) => x.hour >= 18), ...all.filter((x) => x.date === next && x.hour < 6)];
  return { day: summarise(day, Math.max), night: summarise(night, Math.min), hours };
}

// Worst weather wins: WMO codes rise with severity.
function summarise(xs: { temp: number; code: number; rain: number }[], pick: (...n: number[]) => number): Slot {
  return {
    code: Math.max(...xs.map((x) => x.code)),
    temp: pick(...xs.map((x) => x.temp)),
    rain: Math.max(...xs.map((x) => x.rain)),
  };
}

const WMO: [codes: number[], emoji: string, label: string][] = [
  [[0], "☀️", "Clear"],
  [[1], "🌤️", "Mostly clear"],
  [[2], "⛅", "Partly cloudy"],
  [[3], "☁️", "Cloudy"],
  [[45, 48], "🌫️", "Fog"],
  [[51, 53, 55, 56, 57], "🌦️", "Drizzle"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "🌧️", "Rain"],
  [[71, 73, 75, 77, 85, 86], "🌨️", "Snow"],
  [[95, 96, 99], "⛈️", "Thunderstorm"],
];
const NIGHT: Record<number, string> = { 0: "🌙", 1: "🌙", 2: "☁️" };

export function wmo(code: number, isDay: boolean): { emoji: string; label: string } {
  const row = WMO.find(([codes]) => codes.includes(code));
  if (!row) return { emoji: "🌡️", label: "Unknown" };
  return { emoji: (!isDay && NIGHT[code]) || row[1], label: row[2] };
}
