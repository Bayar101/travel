import { describe, expect, it } from "vitest";
import { mapsUrl, parseLatLng } from "./maps";

describe("mapsUrl", () => {
  it("builds search url", () => {
    expect(mapsUrl(35.6, 139.7)).toBe("https://www.google.com/maps/search/?api=1&query=35.6,139.7");
  });
});

describe("parseLatLng", () => {
  it("plain pair", () => {
    expect(parseLatLng("35.6, 139.7")).toEqual({ lat: 35.6, lng: 139.7 });
    expect(parseLatLng("  35.6,139.7 ")).toEqual({ lat: 35.6, lng: 139.7 });
    expect(parseLatLng("-33.86 151.2")).toEqual({ lat: -33.86, lng: 151.2 });
  });
  it("prefers !3d!4d pin over @ viewport", () => {
    const u =
      "https://www.google.com/maps/place/Senso-ji/@35.7100000,139.7900000,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d35.7147651!4d139.7966553";
    expect(parseLatLng(u)).toEqual({ lat: 35.7147651, lng: 139.7966553 });
  });
  it("@lat,lng,zoom", () => {
    expect(parseLatLng("https://www.google.com/maps/@35.68,139.76,15z")).toEqual({ lat: 35.68, lng: 139.76 });
  });
  it("?q=", () => {
    expect(parseLatLng("https://maps.google.com/?q=35.6,139.7")).toEqual({ lat: 35.6, lng: 139.7 });
  });
  it("query= encoded", () => {
    expect(parseLatLng("https://www.google.com/maps/search/?api=1&query=35.6%2C139.7")).toEqual({
      lat: 35.6,
      lng: 139.7,
    });
  });
  it("short links and junk -> null", () => {
    expect(parseLatLng("https://maps.app.goo.gl/abc123")).toBeNull();
    expect(parseLatLng("")).toBeNull();
    expect(parseLatLng("hello")).toBeNull();
  });
  it("out of range -> null", () => {
    expect(parseLatLng("95, 139")).toBeNull();
    expect(parseLatLng("35, 190")).toBeNull();
  });
  it("fullwidth separators and leading +", () => {
    expect(parseLatLng("35.6，139.7")).toEqual({ lat: 35.6, lng: 139.7 });
    expect(parseLatLng("35.6、139.7")).toEqual({ lat: 35.6, lng: 139.7 });
    expect(parseLatLng("+35.6, +139.7")).toEqual({ lat: 35.6, lng: 139.7 });
  });
  it("negative !3d/!4d", () => {
    expect(parseLatLng("https://www.google.com/maps/place/X/data=!8m2!3d-33.8688!4d-70.5")).toEqual({
      lat: -33.8688,
      lng: -70.5,
    });
  });
  it("boundaries inclusive", () => {
    expect(parseLatLng("90, 180")).toEqual({ lat: 90, lng: 180 });
    expect(parseLatLng("-90, -180")).toEqual({ lat: -90, lng: -180 });
    expect(parseLatLng("90.1, 0")).toBeNull();
  });
  it("ll= and center=", () => {
    expect(parseLatLng("https://maps.google.com/?ll=35.1,139.2&z=10")).toEqual({ lat: 35.1, lng: 139.2 });
    expect(parseLatLng("https://www.google.com/maps?center=35.1,139.2")).toEqual({ lat: 35.1, lng: 139.2 });
  });
});
