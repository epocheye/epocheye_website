// The homepage's monuments are maquettes: each shape from ../home3d/shapes is
// sampled as points, then snapped to a grid of small cubes. Every model uses the
// same number of cubes, so any two can morph cube for cube.
import * as S from "../home3d/shapes";
import { assets, loadAsset } from "./assets";

const SAMPLES = 36000;

/**
 * Each model: how to make its points, the data it waits on, how it is posed
 * (`rx`/`ry` tilt, `spin` turns per second), and the box it is fitted into.
 * `ground` puts a soft shadow under it.
 */
export const MODELS = {
	scatter: { make: (N) => scatter(N), pose: { rx: 0, ry: 0 }, fit: [9, 6] },
	temple: { make: (N, d) => S.temple(N, d.scan), needs: ["scan"], pose: { rx: 0.18, ry: 0.5, spin: 0.08 }, fit: [5.4, 3.1], ground: true },
	india: { make: (N, d) => S.india(N, d.india), needs: ["india"], pose: { rx: -0.85, ry: 0 }, fit: [5, 5] },
	phone: { make: (N, d) => S.phone(N, d.scan), needs: ["scan"], pose: { rx: 0.05, ry: -0.45 }, fit: [3.6, 5.2] },
	wave: { make: (N) => S.wave(N), pose: { rx: 0.55, ry: -0.3 }, fit: [6.4, 3.2] },
	cards: { make: (N) => S.cards(N), pose: { rx: 0.08, ry: -0.4 }, fit: [5, 4.6] },
	pyramids: { make: (N) => S.pyramids(N), pose: { rx: 0.22, ry: 0.55, spin: 0.06 }, fit: [6.4, 3.4], ground: true },
	colosseum: { make: (N) => S.colosseum(N, 1), pose: { rx: 0.5, ry: 0.2, spin: 0.06 }, fit: [5.8, 3.8], ground: true },
	taj: { make: (N) => S.taj(N), pose: { rx: 0.12, ry: 0, spin: 0.05 }, fit: [6, 4.2], ground: true },
	rome: { make: (N) => S.colosseum(N, 0), pose: { rx: 0.45, ry: 0.2, spin: 0.06 }, fit: [5.8, 3.8], ground: true },
	angkor: { make: (N) => S.angkor(N), pose: { rx: 0.22, ry: 0.5, spin: 0.08 }, fit: [5.2, 4.2], ground: true },
	terraces: { make: (N) => S.terraces(N), pose: { rx: 0.32, ry: 0.3, spin: 0.07 }, fit: [6.2, 3.6], ground: true },
	globe: { make: (N, d) => S.globe(N, d.geo), needs: ["geo"], pose: { rx: 0.25, ry: 0, spin: 0.09 }, fit: [5.4, 5.4] },
	network: { make: (N) => S.network(N), pose: { rx: 0.1, ry: 0, spin: 0.06 }, fit: [6.6, 4.6] },
	logo: { make: (N, d) => plainLetters(S.logo(N, d.mark)), needs: ["mark"], pose: { rx: 0, ry: -0.2, sway: 0.4 }, fit: [5, 5] },
};

/** The mark in one colour, so the accent is only the dust around it. */
function plainLetters(shape) {
	for (let i = 0; i < shape.meta.length; i += 4) if (shape.meta[i] === 1) shape.meta[i] = 0;
	return shape;
}

/** A loose cloud the cubes fly in from. */
function scatter(N) {
	const r = S.rng(7);
	const pos = new Float32Array(N * 3);
	const meta = new Float32Array(N * 4);
	for (let i = 0; i < N; i += 1) {
		pos[i * 3] = (r() - 0.5) * 16;
		pos[i * 3 + 1] = (r() - 0.5) * 10;
		pos[i * 3 + 2] = (r() - 0.5) * 8 - 2;
		meta[i * 4] = r() < 0.08 ? 1 : 0;
	}
	return { pos, meta };
}

export const isReady = (key) => (MODELS[key].needs ?? []).every((n) => assets[n]);

/** Starts loading whatever a model waits on. */
export const prepare = (key) => (MODELS[key].needs ?? []).forEach(loadAsset);

const cache = new Map();

// Grid cells as one number: three 11-bit signed indices.
const pack = (x, y, z) => ((x + 1024) * 2048 + (y + 1024)) * 2048 + (z + 1024);
const unpack = (k) => [Math.floor(k / 2048 / 2048) - 1024, (Math.floor(k / 2048) % 2048) - 1024, (k % 2048) - 1024];

/**
 * The model as `count` cubes: centres (x, y, z), accent (0/1) and the cube size.
 * The grid is sized so the cube count lands just under `count`; the rest are
 * doubled up on random cubes (invisible, but they still have somewhere to fly).
 */
export function voxels(key, count) {
	const id = `${key}:${count}`;
	if (cache.has(id)) return cache.get(id);
	const model = MODELS[key];
	const { pos, meta } = model.make(SAMPLES, assets);

	// Keep the points that are meant to show, fitted into the model's box.
	const pts = [];
	const acc = [];
	let [x0, y0, z0, x1, y1, z1] = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
	for (let i = 0; i < pos.length / 3; i += 1) {
		if (meta[i * 4] < 0) continue;
		const x = pos[i * 3];
		const y = pos[i * 3 + 1];
		const z = pos[i * 3 + 2];
		pts.push(x, y, z);
		acc.push(meta[i * 4] >= 0.5 ? 1 : 0);
		x0 = Math.min(x0, x);
		y0 = Math.min(y0, y);
		z0 = Math.min(z0, z);
		x1 = Math.max(x1, x);
		y1 = Math.max(y1, y);
		z1 = Math.max(z1, z);
	}
	const k = Math.min(model.fit[0] / (x1 - x0), model.fit[1] / (y1 - y0));
	const [cx, cy, cz] = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
	const n = pts.length / 3;
	for (let i = 0; i < n; i += 1) {
		pts[i * 3] = (pts[i * 3] - cx) * k;
		pts[i * 3 + 1] = (pts[i * 3 + 1] - cy) * k;
		pts[i * 3 + 2] = (pts[i * 3 + 2] - cz) * k;
	}

	const cellsAt = (size) => {
		const cells = new Map();
		for (let i = 0; i < n; i += 1) {
			const key3 = pack(Math.round(pts[i * 3] / size), Math.round(pts[i * 3 + 1] / size), Math.round(pts[i * 3 + 2] / size));
			const c = cells.get(key3);
			if (c) {
				c[0] += acc[i];
				c[1] += 1;
			} else cells.set(key3, [acc[i], 1]);
		}
		return cells;
	};
	// The smallest cube that keeps the count at or under `count`.
	let lo = 0.01;
	let hi = 1;
	let best = cellsAt(hi);
	let size = hi;
	for (let it = 0; it < 14; it += 1) {
		const mid = (lo + hi) / 2;
		const cells = cellsAt(mid);
		if (cells.size > count) lo = mid;
		else {
			hi = mid;
			best = cells;
			size = mid;
		}
	}

	const keys = [...best.keys()];
	const r = S.rng(keys.length);
	for (let a = keys.length - 1; a > 0; a -= 1) {
		const b = Math.floor(r() * (a + 1));
		[keys[a], keys[b]] = [keys[b], keys[a]];
	}
	const out = new Float32Array(count * 3);
	const outAcc = new Float32Array(count);
	for (let i = 0; i < count; i += 1) {
		const key3 = keys[i < keys.length ? i : Math.floor(r() * keys.length)];
		const [ix, iy, iz] = unpack(key3);
		const [a, m] = best.get(key3);
		out[i * 3] = ix * size;
		out[i * 3 + 1] = iy * size;
		out[i * 3 + 2] = iz * size;
		outAcc[i] = a / m > 0.34 ? 1 : 0;
	}
	const result = { pos: out, acc: outAcc, size, bottom: (y0 - cy) * k };
	cache.set(id, result);
	return result;
}
