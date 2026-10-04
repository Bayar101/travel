import { describe, expect, it } from "vitest";
import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import { GOOGLE_PALETTE as P, PATCHED_LAYER_IDS, googleMapStyle, placeholderImage } from "./google-map-style";
import realLiberty from "./fixtures/openfreemap-liberty.json";

// Minimal Liberty-shaped style: same ids/types/source-layers as tiles.openfreemap.org/styles/liberty.
function layer(id: string, type: string, extra: Record<string, unknown> = {}): LayerSpecification {
  const base: Record<string, unknown> = { id, type, ...extra };
  if (type !== "background") base.source = type === "raster" ? "ne2_shaded" : "openmaptiles";
  return base as unknown as LayerSpecification;
}

function liberty(): StyleSpecification {
  return {
    version: 8,
    sources: {
      ne2_shaded: { type: "raster", tiles: ["https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 6 },
      openmaptiles: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
    },
    sprite: "https://tiles.openfreemap.org/sprites/ofm_f384/ofm",
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    layers: [
      layer("background", "background", { paint: { "background-color": "#f8f4f0" } }),
      layer("natural_earth", "raster", { maxzoom: 7, paint: { "raster-opacity": 0.6 } }),
      layer("park", "fill", { paint: { "fill-color": "#d8e8c8", "fill-opacity": 0.7 } }),
      layer("water", "fill", { paint: { "fill-color": "rgb(158,189,255)" } }),
      layer("road_area_pattern", "fill", { paint: { "fill-pattern": "pedestrian_polygon" } }),
      layer("road_minor_casing", "line", { paint: { "line-color": "#cfcdca", "line-width": 2 } }),
      layer("road_minor", "line", { paint: { "line-color": "#fff", "line-width": 2 } }),
      layer("road_trunk_primary", "line", { paint: { "line-color": "#fea", "line-width": 3 } }),
      layer("road_motorway_casing", "line", { paint: { "line-color": "#e9ac77" } }),
      layer("road_motorway", "line", { paint: { "line-color": ["interpolate", ["linear"], ["zoom"], 5, "hsl(26,87%,62%)", 6, "#fc8"] } }),
      layer("tunnel_motorway", "line", { paint: { "line-color": "#ffdaa6" } }),
      layer("road_major_rail", "line", { paint: { "line-color": "#bbb" } }),
      layer("building", "fill", { minzoom: 13, maxzoom: 14, paint: { "fill-color": "hsl(35,8%,85%)" } }),
      layer("building-3d", "fill-extrusion", { minzoom: 14, paint: { "fill-extrusion-color": "hsl(35,8%,85%)" } }),
      layer("water_name_line_label", "symbol", { layout: { "text-font": ["Noto Sans Italic"] }, paint: { "text-color": "#495e91" } }),
      layer("poi_r1", "symbol", {
        minzoom: 15,
        layout: { "icon-image": ["get", "class"], "text-font": ["Noto Sans Italic"], "text-size": 12 },
        paint: { "text-color": "#666" },
      }),
      layer("poi_transit", "symbol", { layout: { "icon-image": ["get", "class"], "text-field": ["get", "name"] }, paint: { "text-color": "#2e5a80" } }),
      layer("highway-name-minor", "symbol", { paint: { "text-color": "#666" } }),
      layer("label_city", "symbol", { minzoom: 3, paint: { "text-color": "#000", "text-halo-color": "#fff", "text-halo-blur": 1 } }),
      layer("some_future_layer", "line", { paint: { "line-color": "#123456" } }),
    ],
  };
}

const byId = (s: StyleSpecification, id: string) => s.layers.find((l) => l.id === id) as unknown as {
  type: string;
  minzoom?: number;
  maxzoom?: number;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
};

describe("googleMapStyle", () => {
  it("does not mutate its input", () => {
    const input = liberty();
    const snapshot = JSON.parse(JSON.stringify(input));
    googleMapStyle(input);
    expect(input).toEqual(snapshot);
  });

  it("leaves sources, glyphs, sprite and version untouched", () => {
    const input = liberty();
    const out = googleMapStyle(input);
    expect(out.sources).toEqual(input.sources);
    expect(out.glyphs).toBe(input.glyphs);
    expect(out.sprite).toEqual(input.sprite);
    expect(out.version).toBe(8);
  });

  it("keeps layer ids, order and types", () => {
    const input = liberty();
    const out = googleMapStyle(input);
    expect(out.layers.map((l) => [l.id, l.type])).toEqual(input.layers.map((l) => [l.id, l.type]));
  });

  it("passes unknown layers through unchanged", () => {
    const input = liberty();
    expect(byId(googleMapStyle(input), "some_future_layer")).toEqual(byId(input, "some_future_layer"));
  });

  it("recolours land, water and parks", () => {
    const out = googleMapStyle(liberty());
    expect(byId(out, "background").paint!["background-color"]).toBe(P.land);
    expect(byId(out, "water").paint!["fill-color"]).toBe(P.water);
    expect(byId(out, "park").paint!["fill-color"]).toBe(P.park);
  });

  it("hides the shaded-relief raster", () => {
    expect(byId(googleMapStyle(liberty()), "natural_earth").layout!.visibility).toBe("none");
  });

  it("draws roads white with grey casing and motorways amber", () => {
    const out = googleMapStyle(liberty());
    expect(byId(out, "road_minor").paint!["line-color"]).toBe(P.road);
    expect(byId(out, "road_minor_casing").paint!["line-color"]).toBe(P.roadCasing);
    expect(byId(out, "road_trunk_primary").paint!["line-color"]).toBe(P.majorRoad);
    expect(byId(out, "road_motorway").paint!["line-color"]).toBe(P.motorway);
    expect(byId(out, "road_motorway_casing").paint!["line-color"]).toBe(P.motorwayCasing);
    expect(byId(out, "tunnel_motorway").paint!["line-color"]).toBe(P.motorway);
    expect(byId(out, "road_major_rail").paint!["line-color"]).toBe(P.rail);
    // widths are Liberty's
    expect(byId(out, "road_minor").paint!["line-width"]).toBe(2);
  });

  it("swaps the pedestrian pattern for a flat fill", () => {
    const paint = byId(googleMapStyle(liberty()), "road_area_pattern").paint!;
    expect(paint["fill-pattern"]).toBeUndefined();
    expect(paint["fill-color"]).toBe(P.pedestrian);
  });

  it("draws flat outlined buildings at every zoom instead of 3D", () => {
    const out = googleMapStyle(liberty());
    const b = byId(out, "building");
    expect(b.paint!["fill-color"]).toBe(P.building);
    expect(b.maxzoom).toBeUndefined();
    expect(b.minzoom).toBe(13);
    expect(b.paint!["fill-outline-color"]).toBeDefined();
    expect(byId(out, "building-3d").layout!.visibility).toBe("none");
  });

  it("uses Google label colours with white halos", () => {
    const out = googleMapStyle(liberty());
    const city = byId(out, "label_city").paint!;
    expect(city["text-color"]).toBe(P.labelDark);
    expect(city["text-halo-color"]).toBe(P.halo);
    expect(city["text-halo-blur"]).toBe(0);
    expect(byId(out, "water_name_line_label").paint!["text-color"]).toBe(P.waterLabel);
    expect(byId(out, "highway-name-minor").paint!["text-color"]).toBe(P.label);
  });

  it("keeps POI icons from z15 and colours their text by category", () => {
    const poi = byId(googleMapStyle(liberty()), "poi_r1");
    expect(poi.minzoom).toBe(15);
    expect(poi.layout!["icon-image"]).toEqual(["get", "class"]);
    expect(poi.layout!["text-font"]).toEqual(["Noto Sans Regular"]);
    const color = poi.paint!["text-color"] as unknown[];
    expect(color[0]).toBe("match");
    expect(color.flat()).toContain("restaurant");
    expect(color[color.length - 1]).toBe(P.label);
  });

  it("keeps bus stops off the transit layer until z17, rail stations always", () => {
    const layout = byId(googleMapStyle(liberty()), "poi_transit").layout!;
    const isBus = ["==", ["get", "class"], "bus"];
    const hidden = (v: unknown) => ["step", ["zoom"], ["case", isBus, "", v], 17, v];
    expect(layout["icon-image"]).toEqual(hidden(["get", "class"]));
    expect(layout["text-field"]).toEqual(hidden(["get", "name"]));
  });

  it("tolerates a style missing some layers", () => {
    const s = liberty();
    s.layers = s.layers.filter((l) => l.id === "water");
    expect(googleMapStyle(s).layers).toHaveLength(1);
  });
});

// Snapshot of https://tiles.openfreemap.org/styles/liberty (2026-10-04).
describe("googleMapStyle on the real Liberty style", () => {
  const input = realLiberty as unknown as StyleSpecification;
  it("produces a valid style (an invalid one blanks the map)", () => {
    expect(validateStyleMin(googleMapStyle(input)).map((e) => e.message)).toEqual([]);
  });
  it("targets only layer ids Liberty has", () => {
    const ids = new Set(input.layers.map((l) => l.id));
    expect(PATCHED_LAYER_IDS.filter((id) => !ids.has(id))).toEqual([]);
  });
});

describe("placeholderImage", () => {
  it("is a transparent RGBA image of the requested size", () => {
    const img = placeholderImage(2);
    expect(img.width).toBe(2);
    expect(img.height).toBe(2);
    expect(img.data).toHaveLength(16);
    expect([...img.data].every((v) => v === 0)).toBe(true);
  });
});
