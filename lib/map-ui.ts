export interface Camera { center: [number, number]; zoom: number }

export const DEFAULT_CAMERA: Camera = { center: [139.76, 35.68], zoom: 10 };

let last: Camera | null = null; // session memory: returning to the Map tab restores the view

export function saveCamera(c: Camera): void {
  last = { center: [c.center[0], c.center[1]], zoom: c.zoom };
}

export function loadCamera(): Camera | null {
  return last;
}

export function locateErrorMessage(code: number): string {
  return code === 1 ? "Location permission denied — enable it in Settings" : "Couldn't get your location";
}

const EARTH_CIRCUMFERENCE_M = 40075016.686;
const MAX_ACCURACY_PX = 2000;

/** Screen radius (px) of a GPS accuracy circle on a MapLibre map (512px tiles) at `zoom`. */
export function accuracyRadiusPx(accuracyM: number, lat: number, zoom: number): number {
  if (!Number.isFinite(accuracyM) || accuracyM <= 0) return 0;
  const metresPerPx = (EARTH_CIRCUMFERENCE_M * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);
  return Math.min(accuracyM / metresPerPx, MAX_ACCURACY_PX);
}
