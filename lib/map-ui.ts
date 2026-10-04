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
