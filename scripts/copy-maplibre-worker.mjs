// Copies MapLibre's worker (+ the shared chunk it imports as ./maplibre-gl-shared.mjs) to
// public/maplibre/<version>/. Turbopack can't serve them: maplibre-gl builds the worker URL from
// import.meta.url, which is file:// in the bundle. MapCanvas points setWorkerUrl() here.
import { copyFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "maplibre-gl", "dist");
const { version } = JSON.parse(readFileSync(join(src, "..", "package.json"), "utf8"));
const out = join(root, "public", "maplibre");

rmSync(out, { recursive: true, force: true }); // drop other versions
mkdirSync(join(out, version), { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(join(src, f), join(out, version, f));
console.log(`maplibre-gl ${version} worker -> public/maplibre/${version}/`);
