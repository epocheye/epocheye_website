#!/usr/bin/env node
/**
 * Bakes the homepage globe: which parts of the earth are land, and where the
 * coastlines and country borders run, from Natural Earth (public domain) via
 * the world-atlas package's countries-110m.json.
 *
 * Writes public/home/globe.bin, little-endian:
 *   uint32  border point count B
 *   bytes   land mask, 720 × 360 cells of 0.5°, one bit per cell, row 0 at 90°N
 *   int16   B × (lat, lon) in hundredths of a degree, spaced ~0.4° along every
 *           coastline and border
 *
 * Re-run with: node scripts/build-home-globe.mjs path/to/countries-110m.json
 * (npm pack world-atlas, or any copy of the file). Uses d3-geo and
 * topojson-client from node_modules.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { geoContains, geoDistance, geoInterpolate } from "d3-geo";
import { feature, mesh } from "topojson-client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2];
if (!src) {
	console.error("Usage: node scripts/build-home-globe.mjs path/to/countries-110m.json");
	process.exit(1);
}

const topo = JSON.parse(readFileSync(src, "utf8"));
const countries = feature(topo, topo.objects.countries);
const land = feature(topo, topo.objects.land);

// Land mask at 0.5°.
const W = 720;
const H = 360;
const mask = new Uint8Array((W * H) / 8);
let landCells = 0;
for (let y = 0; y < H; y += 1) {
	const lat = 90 - (y + 0.5) * 0.5;
	for (let x = 0; x < W; x += 1) {
		const lon = -180 + (x + 0.5) * 0.5;
		if (geoContains(land, [lon, lat])) {
			const i = y * W + x;
			mask[i >> 3] |= 1 << (i & 7);
			landCells += 1;
		}
	}
}

// Coastlines and borders, resampled evenly.
const lines = mesh(topo, topo.objects.countries).coordinates;
const STEP = 0.4 * (Math.PI / 180);
const pts = [];
for (const line of lines) {
	for (let i = 0; i < line.length - 1; i += 1) {
		const a = line[i];
		const b = line[i + 1];
		const d = geoDistance(a, b);
		const n = Math.max(1, Math.ceil(d / STEP));
		const at = geoInterpolate(a, b);
		for (let k = 0; k < n; k += 1) {
			const [lon, lat] = at(k / n);
			pts.push(Math.round(lat * 100), Math.round(lon * 100));
		}
	}
}

const out = Buffer.alloc(4 + mask.length + pts.length * 2);
out.writeUInt32LE(pts.length / 2, 0);
Buffer.from(mask).copy(out, 4);
for (let i = 0; i < pts.length; i += 1) out.writeInt16LE(pts[i], 4 + mask.length + i * 2);

const dest = path.join(root, "public/home/globe.bin");
mkdirSync(path.dirname(dest), { recursive: true });
writeFileSync(dest, out);
console.log(`${countries.features.length} countries · ${landCells} land cells · ${pts.length / 2} border points · ${out.length} bytes → ${path.relative(root, dest)}`);
