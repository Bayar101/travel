import { describe, expect, it } from "vitest";
import { DEFAULT_CAMERA, accuracyRadiusPx, loadCamera, locateErrorMessage, saveCamera } from "./map-ui";

describe("camera memory", () => {
  it("starts empty then remembers the last camera", () => {
    expect(loadCamera()).toBeNull();
    saveCamera({ center: [135.5, 34.7], zoom: 12 });
    expect(loadCamera()).toEqual({ center: [135.5, 34.7], zoom: 12 });
  });
  it("default camera is Tokyo", () => {
    expect(DEFAULT_CAMERA).toEqual({ center: [139.76, 35.68], zoom: 10 });
  });
});

describe("locateErrorMessage", () => {
  it("maps geolocation error codes", () => {
    expect(locateErrorMessage(1)).toBe("Location permission denied — enable it in Settings");
    expect(locateErrorMessage(2)).toBe("Couldn't get your location");
    expect(locateErrorMessage(3)).toBe("Couldn't get your location");
  });
});

describe("accuracyRadiusPx", () => {
  it("converts metres to screen pixels at the equator", () => {
    // z0: 40075016.686 m spread over 512 px
    expect(accuracyRadiusPx(40075016.686 / 512, 0, 0)).toBeCloseTo(1, 6);
  });
  it("doubles per zoom level and shrinks the metre/pixel ratio with latitude", () => {
    const a = accuracyRadiusPx(100, 35.69, 15);
    expect(accuracyRadiusPx(100, 35.69, 16)).toBeCloseTo(a * 2, 6);
    expect(a).toBeGreaterThan(accuracyRadiusPx(100, 0, 15));
  });
  it("is 0 for unknown or invalid accuracy and is capped", () => {
    expect(accuracyRadiusPx(Number.NaN, 35, 15)).toBe(0);
    expect(accuracyRadiusPx(-5, 35, 15)).toBe(0);
    expect(accuracyRadiusPx(1e9, 35, 20)).toBe(2000);
  });
});
