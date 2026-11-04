#!/usr/bin/env node
/**
 * Bakes the homepage's two maps from Natural Earth's admin-0 countries as seen
 * from India (ne_10m_admin_0_countries_ind.geojson, public domain), so India
 * carries its official boundary, all of Jammu & Kashmir and Ladakh included:
 *
 *   public/home/globe.bin — the earth, little-endian:
 *     uint32  border point count B
 *     bytes   land mask, 720 × 360 cells of 0.5°, one bit per cell, row 0 at 90°N
 *     int16   B × (lat, lon) in hundredths of a degree, one every ~0.5° along
 *             every coastline and border
 *
 *   public/home/india.bin — India alone, at finer grain:
 *     float32 latMin, latMax, lonMin, lonMax (the grid's bounds)
 *     uint32  columns, rows, border point count B
 *     bytes   land mask over those bounds, 0.08° cells, one bit per cell, row 0 at latMax
 *     int16   B × (lat, lon) in hundredths of a degree, one every ~0.05° along
 *             its coast and borders
 *
 * Re-run with:
 *   node scripts/build-home-globe.mjs path/to/ne_10m_admin_0_countries_ind.geojson
 * (from github.com/nvkelso/natural-earth-vector, geojson/). No dependencies.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2];
if (!src) {
	console.error("Usage: node scripts/build-home-globe.mjs path/to/ne_10m_admin_0_countries_ind.geojson");
	process.exit(1);
}

const countries = JSON.parse(readFileSync(src, "utf8")).features;
const ringsOf = (f) => {
	const g = f.geometry;
	const polys = g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];
	return polys.flat();
};

/**
 * Even-odd scanline fill of rings ([lon, lat] points) onto a grid of
 * `cols` × `rows` cells covering [lonMin, lonMax] × [latMin, latMax]; row 0 is
 * the north edge. Countries don't overlap, so even-odd over all of them at
 * once fills each one and leaves its holes empty.
 */
function rasterize(rings, { lonMin, lonMax, latMin, latMax, cols, rows }) {
	const cell = (latMax - latMin) / rows;
	const crossings = Array.from({ length: rows }, () => []);
	for (const ring of rings) {
		for (let i = 0; i < ring.length - 1; i += 1) {
			const [x1, y1] = ring[i];
			const [x2, y2] = ring[i + 1];
			if (y1 === y2 || Math.abs(x2 - x1) > 180) continue; // flat, or wrapping the antimeridian
			const top = Math.max(y1, y2);
			const bottom = Math.min(y1, y2);
			const r0 = Math.max(0, Math.ceil((latMax - top) / cell - 0.5));
			const r1 = Math.min(rows - 1, Math.floor((latMax - bottom) / cell - 0.5));
			for (let r = r0; r <= r1; r += 1) {
				const lat = latMax - (r + 0.5) * cell;
				if (lat < bottom || lat >= top) continue;
				crossings[r].push(x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1));
			}
		}
	}
	const mask = new Uint8Array(Math.ceil((cols * rows) / 8));
	const width = (lonMax - lonMin) / cols;
	let filled = 0;
	crossings.forEach((xs, r) => {
		xs.sort((a, b) => a - b);
		for (let k = 0; k + 1 < xs.length; k += 2) {
			const c0 = Math.max(0, Math.ceil((xs[k] - lonMin) / width - 0.5));
			const c1 = Math.min(cols - 1, Math.floor((xs[k + 1] - lonMin) / width - 0.5));
			for (let c = c0; c <= c1; c += 1) {
				const i = r * cols + c;
				mask[i >> 3] |= 1 << (i & 7);
				filled += 1;
			}
		}
	});
	return { mask, filled };
}

/** Points every `step` degrees of arc along each ring, as [lat×100, lon×100]. */
function resample(rings, step) {
	const out = [];
	const rad = Math.PI / 180;
	for (const ring of rings) {
		let carry = 0;
		for (let i = 0; i < ring.length - 1; i += 1) {
			const [x1, y1] = ring[i];
			const [x2, y2] = ring[i + 1];
			if (Math.abs(x2 - x1) > 180) continue;
			const d = Math.hypot((x2 - x1) * Math.cos(((y1 + y2) / 2) * rad), y2 - y1);
			let t = carry;
			while (t < d) {
				const k = d ? t / d : 0;
				out.push(Math.round((y1 + (y2 - y1) * k) * 100), Math.round((x1 + (x2 - x1) * k) * 100));
				t += step;
			}
			carry = t - d;
		}
	}
	return out;
}

const write = (file, buf) => {
	const dest = path.join(root, "public/home", file);
	mkdirSync(path.dirname(dest), { recursive: true });
	writeFileSync(dest, buf);
	return path.relative(root, dest);
};

// The earth.
{
	const rings = countries.flatMap(ringsOf);
	const { mask, filled } = rasterize(rings, { lonMin: -180, lonMax: 180, latMin: -90, latMax: 90, cols: 720, rows: 360 });
	const pts = resample(rings, 0.5);
	const buf = Buffer.alloc(4 + mask.length + pts.length * 2);
	buf.writeUInt32LE(pts.length / 2, 0);
	Buffer.from(mask).copy(buf, 4);
	pts.forEach((v, i) => buf.writeInt16LE(v, 4 + mask.length + i * 2));
	console.log(`globe: ${countries.length} countries · ${filled} land cells · ${pts.length / 2} border points · ${buf.length} bytes → ${write("globe.bin", buf)}`);
}

// India.
{
	const india = countries.find((f) => f.properties.ADMIN === "India");
	const rings = ringsOf(india);
	const box = { latMin: 6.4, latMax: 37.4, lonMin: 67.8, lonMax: 97.8 };
	const CELL = 0.08;
	const grid = { ...box, cols: Math.round((box.lonMax - box.lonMin) / CELL), rows: Math.round((box.latMax - box.latMin) / CELL) };
	const { mask, filled } = rasterize(rings, grid);
	const pts = resample(rings, 0.05);
	const head = 16 + 12;
	const buf = Buffer.alloc(head + mask.length + pts.length * 2);
	[box.latMin, box.latMax, box.lonMin, box.lonMax].forEach((v, i) => buf.writeFloatLE(v, i * 4));
	buf.writeUInt32LE(grid.cols, 16);
	buf.writeUInt32LE(grid.rows, 20);
	buf.writeUInt32LE(pts.length / 2, 24);
	Buffer.from(mask).copy(buf, head);
	pts.forEach((v, i) => buf.writeInt16LE(v, head + mask.length + i * 2));
	console.log(`india: ${grid.cols}×${grid.rows} grid · ${filled} land cells · ${pts.length / 2} border points · ${buf.length} bytes → ${write("india.bin", buf)}`);
}
