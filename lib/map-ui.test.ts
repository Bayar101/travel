import { describe, expect, it } from "vitest";
import { DEFAULT_CAMERA, loadCamera, locateErrorMessage, saveCamera } from "./map-ui";

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
