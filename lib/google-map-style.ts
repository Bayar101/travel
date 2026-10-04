import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

// Recolours OpenFreeMap "Liberty" (tiles.openfreemap.org/styles/liberty) to Google Maps' light
// palette. Pure: style JSON in, patched copy out. Only paint/layout/zoom of known layer ids change;
// sources, glyphs, sprite and unknown layers pass through, so a Liberty update degrades gracefully.

export const GOOGLE_PALETTE = {
  land: "#f5f3ef",
  urban: "#eceae4",
  water: "#aadaff",
  park: "#cfe8c4",
  green: "#d6eacd",
  sand: "#f5efdc",
  ice: "#f1f3f4",
  hospital: "#fbe4e2",
  school: "#efeae0",
  airport: "#e8eaed",
  pedestrian: "#eeeeee",
  road: "#ffffff",
  roadCasing: "#dadce0",
  majorRoad: "#fdfcf8",
  majorCasing: "#d3cfc6",
  motorway: "#fbd38d",
  motorwayCasing: "#f0b24e",
  rail: "#bdc1c6",
  building: "#e8e8e8",
  buildingOutline: "#d6d6d6",
  boundary: "#9aa0a6",
  label: "#5f6368",
  labelDark: "#3c4043",
  labelLight: "#80868b",
  halo: "#ffffff",
  waterLabel: "#4a7fb5",
  poiFood: "#b8560b",
  poiShop: "#1967d2",
  poiLodging: "#c2185b",
  poiCulture: "#0b7285",
  poiNature: "#188038",
  poiHealth: "#c5221f",
  transit: "#1a73e8",
} as const;

const P = GOOGLE_PALETTE;

type Props = Record<string, unknown>;
interface Patch {
  paint?: Props;
  layout?: Props;
  dropPaint?: string[];
  minzoom?: number;
  maxzoom?: number | null; // null removes the limit
  hide?: boolean;
  layoutFrom?: (layout: Props) => Props; // derived from the layer's own layout
}

const POI_TEXT_COLOR = [
  "match",
  ["get", "class"],
  ["restaurant", "fast_food", "cafe", "bar", "beer", "bakery", "ice_cream", "alcohol_shop"],
  P.poiFood,
  ["shop", "grocery", "clothing_store", "florist", "furniture", "gift", "commercial"],
  P.poiShop,
  ["lodging"],
  P.poiLodging,
  ["museum", "attraction", "art_gallery", "castle", "monument", "theatre", "cinema", "place_of_worship", "religious_christian", "religious_muslim", "religious_jewish"],
  P.poiCulture,
  ["park", "garden", "zoo", "playground", "campsite", "picnic_site", "dog_park", "golf", "pitch", "stadium"],
  P.poiNature,
  ["hospital", "doctors", "pharmacy", "dentist", "veterinary"],
  P.poiHealth,
  P.label,
];

const halo = { "text-halo-color": P.halo, "text-halo-width": 1.5, "text-halo-blur": 0 };
const label = (color: string): Patch => ({ paint: { "text-color": color, ...halo } });
const line = (color: string, extra: Props = {}): Patch => ({ paint: { "line-color": color, ...extra } });
const fill = (color: string, extra: Props = {}): Patch => ({ paint: { "fill-color": color, ...extra } });
const TUNNEL = { "line-opacity": 0.55 };
// Google draws low-zoom highways as thin fills without casing; casings fade in by z9.
const CASING_FADE = { "line-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0, 9, 1] };

function each(ids: string[], patch: Patch): [string, Patch][] {
  return ids.map((id) => [id, patch]);
}

const PATCHES: Record<string, Patch> = Object.fromEntries([
  ["background", { paint: { "background-color": P.land } }],
  ["natural_earth", { hide: true }],
  ["park", fill(P.park, { "fill-opacity": 1, "fill-outline-color": P.park })],
  ["park_outline", { hide: true }],
  ["landuse_residential", fill(P.urban, { "fill-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0.8, 12, 0] })],
  ["landcover_wood", fill(P.green, { "fill-opacity": 0.8 })],
  ["landcover_grass", fill(P.green, { "fill-opacity": 0.8 })],
  ["landcover_ice", fill(P.ice, { "fill-opacity": 1 })],
  ["landcover_sand", fill(P.sand)],
  ...each(["landuse_pitch", "landuse_track", "landuse_cemetery"], fill(P.green)),
  ["landuse_hospital", fill(P.hospital)],
  ["landuse_school", fill(P.school)],
  ...each(["waterway_tunnel", "waterway_river", "waterway_other"], line(P.water)),
  ["water", fill(P.water)],
  ["aeroway_fill", fill(P.airport, { "fill-opacity": 1 })],
  ...each(["aeroway_runway", "aeroway_taxiway"], line(P.road)),
  ["road_area_pattern", { ...fill(P.pedestrian), dropPaint: ["fill-pattern"] }],

  // Minor streets: white, light grey casing.
  ...each(
    ["road_minor_casing", "road_service_track_casing", "bridge_street_casing", "bridge_service_track_casing", "bridge_path_pedestrian_casing"],
    line(P.roadCasing),
  ),
  ...each(["tunnel_street_casing", "tunnel_service_track_casing"], line(P.roadCasing, TUNNEL)),
  ...each(
    ["road_minor", "road_service_track", "road_path_pedestrian", "bridge_street", "bridge_service_track", "bridge_path_pedestrian"],
    line(P.road),
  ),
  ...each(["tunnel_minor", "tunnel_service_track", "tunnel_path_pedestrian"], line(P.road, TUNNEL)),

  // Arterials: near-white, warm grey casing.
  ...each(
    ["road_link_casing", "road_secondary_tertiary_casing", "road_trunk_primary_casing", "bridge_link_casing", "bridge_secondary_tertiary_casing", "bridge_trunk_primary_casing"],
    line(P.majorCasing, CASING_FADE),
  ),
  ...each(["tunnel_link_casing", "tunnel_secondary_tertiary_casing", "tunnel_trunk_primary_casing"], line(P.majorCasing, TUNNEL)),
  ...each(["road_link", "road_secondary_tertiary", "road_trunk_primary", "bridge_link", "bridge_secondary_tertiary", "bridge_trunk_primary"], line(P.majorRoad)),
  ...each(["tunnel_link", "tunnel_secondary_tertiary", "tunnel_trunk_primary"], line(P.majorRoad, TUNNEL)),

  // Motorways: amber, orange casing.
  ...each(["road_motorway_casing", "road_motorway_link_casing", "bridge_motorway_casing", "bridge_motorway_link_casing"], line(P.motorwayCasing, CASING_FADE)),
  ...each(["tunnel_motorway_casing", "tunnel_motorway_link_casing"], line(P.motorwayCasing, TUNNEL)),
  ...each(["road_motorway", "road_motorway_link", "bridge_motorway", "bridge_motorway_link"], line(P.motorway)),
  ...each(["tunnel_motorway", "tunnel_motorway_link"], line(P.motorway, TUNNEL)),

  ...each(
    [
      "road_major_rail", "road_major_rail_hatching", "road_transit_rail", "road_transit_rail_hatching",
      "bridge_major_rail", "bridge_major_rail_hatching", "bridge_transit_rail", "bridge_transit_rail_hatching",
      "tunnel_major_rail", "tunnel_major_rail_hatching", "tunnel_transit_rail", "tunnel_transit_rail_hatching",
    ],
    line(P.rail),
  ),

  // Flat, outlined buildings at every zoom (Google's top-down look) instead of Liberty's 3D extrusions.
  [
    "building",
    {
      maxzoom: null,
      ...fill(P.building, {
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0.25, 15, 0.5, 17, 1],
        "fill-outline-color": ["interpolate", ["linear"], ["zoom"], 15, P.building, 17, P.buildingOutline],
      }),
    },
  ],
  ["building-3d", { hide: true }],

  ["boundary_3", line(P.boundary)],
  ...each(["boundary_2", "boundary_disputed"], line(P.boundary)),

  ...each(["waterway_line_label", "water_name_point_label", "water_name_line_label"], label(P.waterLabel)),
  ...each(["poi_r20", "poi_r7", "poi_r1"], {
    layout: { "text-font": ["Noto Sans Regular"] },
    paint: { "text-color": POI_TEXT_COLOR, ...halo },
  }),
  // Route shields: Google shows far fewer; space them out and keep them off the country view.
  ...each(["highway-shield-non-us", "highway-shield-us-interstate", "road_shield_us"], {
    minzoom: 10,
    layout: { "symbol-spacing": 600 },
    paint: { "text-color": P.labelDark },
  }),
  // Bus stops (dozens per station in Tokyo) only from z17, like Google; rail/airports always.
  [
    "poi_transit",
    {
      layout: { "text-font": ["Noto Sans Regular"] },
      layoutFrom: (l) => {
        // ["zoom"] must be the input of a top-level step, so branch on the class inside it.
        const busHidden = (v: unknown) => ["step", ["zoom"], ["case", ["==", ["get", "class"], "bus"], "", v], 17, v];
        const out: Props = {};
        for (const k of ["icon-image", "text-field"]) if (l[k] !== undefined) out[k] = busHidden(l[k]);
        return out;
      },
      ...label(P.transit),
    },
  ],
  ...each(["highway-name-path", "highway-name-minor", "highway-name-major", "airport"], label(P.label)),
  ...each(["label_other", "label_state"], label(P.labelLight)),
  ...each(["label_village", "label_town"], label(P.label)),
  ...each(["label_city", "label_city_capital", "label_country_1", "label_country_2", "label_country_3"], label(P.labelDark)),
]);

export const PATCHED_LAYER_IDS = Object.keys(PATCHES);

function applyPatch(layer: LayerSpecification, patch: Patch): LayerSpecification {
  const out = { ...layer } as Record<string, unknown> & { paint?: Props; layout?: Props };
  if (patch.paint || patch.dropPaint) {
    const paint: Props = { ...(out.paint ?? {}), ...(patch.paint ?? {}) };
    for (const k of patch.dropPaint ?? []) delete paint[k];
    out.paint = paint;
  }
  if (patch.layout || patch.layoutFrom || patch.hide) {
    const own = out.layout ?? {};
    out.layout = {
      ...own,
      ...(patch.layout ?? {}),
      ...(patch.layoutFrom?.(own) ?? {}),
      ...(patch.hide ? { visibility: "none" } : {}),
    };
  }
  if (patch.minzoom !== undefined) out.minzoom = patch.minzoom;
  if (patch.maxzoom === null) delete out.maxzoom;
  else if (patch.maxzoom !== undefined) out.maxzoom = patch.maxzoom;
  return out as unknown as LayerSpecification;
}

export function googleMapStyle(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map((l) => (Object.hasOwn(PATCHES, l.id) ? applyPatch(l, PATCHES[l.id]) : l)),
  };
}

/** Transparent stand-in for sprite images a style references but the sprite lacks. */
export function placeholderImage(size = 1): { width: number; height: number; data: Uint8Array } {
  return { width: size, height: size, data: new Uint8Array(size * size * 4) };
}
