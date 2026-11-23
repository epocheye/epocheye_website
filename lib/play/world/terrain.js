// The walkable ground of a world: one height grid per cell, in Blender metres (x, y).
// Heights are stored as deltas of centimetres, see encode_heights in tools/play/world_maps.py.

const HEIGHT_ZERO = 20;

export function decodeHeights(bytes, count) {
	const out = new Float32Array(count);
	let i = 0, k = 0, prev = 0;
	while (k < count) {
		const b = bytes[i];
		if (b === 0) {
			const run = bytes[i + 1] | (bytes[i + 2] << 8);
			out.fill(prev / 100 - HEIGHT_ZERO, k, k + run);
			k += run;
			i += 3;
			continue;
		}
		if (b === 255) {
			prev = bytes[i + 1] | (bytes[i + 2] << 8);
			i += 3;
		} else {
			prev += b - 128;
			i += 1;
		}
		out[k++] = prev / 100 - HEIGHT_ZERO;
	}
	return out;
}

export class TerrainMap {
	constructor() {
		this.cells = new Map();
	}

	add(id, meta, heights) {
		this.cells.set(id, { ...meta, heights });
	}

	remove(id) {
		this.cells.delete(id);
	}

	// Ground height at Blender (x, y), or null where no loaded cell covers it.
	sample(x, y) {
		for (const c of this.cells.values()) {
			const fx = (x - c.x0) / c.dx, fy = (y - c.y0) / c.dy;
			if (fx < 0 || fy < 0 || fx > c.nx - 1 || fy > c.ny - 1) continue;
			const i = Math.min(Math.floor(fx), c.nx - 2), j = Math.min(Math.floor(fy), c.ny - 2);
			const tx = fx - i, ty = fy - j, h = c.heights, n = c.nx;
			const a = h[j * n + i], b = h[j * n + i + 1], d = h[(j + 1) * n + i], e = h[(j + 1) * n + i + 1];
			return (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty;
		}
		return null;
	}
}

// The ground connected to the mission start: a one-metre grid made by world-reach.mjs from the real
// colliders. Walled compounds and strips by the ditch are level ground a player could never leave,
// so a player being placed is only ever put on this. Runs of off and on, row by row, as base64 varints.
export class ReachMask {
	constructor({ x0, y0, step, nx, ny, rle }) {
		Object.assign(this, { x0, y0, step, nx, ny });
		const bytes = Uint8Array.from(atob(rle), (c) => c.charCodeAt(0));
		this.bits = new Uint8Array(nx * ny);
		let at = 0, on = 0, run = 0, shift = 0;
		for (const b of bytes) {
			run |= (b & 127) << shift;
			shift += 7;
			if (b & 128) continue;
			if (on) this.bits.fill(1, at, at + run);
			at += run;
			on = 1 - on;
			run = shift = 0;
		}
	}

	_on(i, j) {
		return i >= 0 && j >= 0 && i < this.nx && j < this.ny && this.bits[j * this.nx + i] === 1;
	}

	// Is this point beside connected ground? A person near a wall can have their nearest node blocked.
	near(x, y) {
		const i = Math.floor((x - this.x0) / this.step), j = Math.floor((y - this.y0) / this.step);
		return this._on(i, j) || this._on(i + 1, j) || this._on(i, j + 1) || this._on(i + 1, j + 1);
	}

	// The grid node nearest this point, if it is on connected ground.
	snap(x, y) {
		const i = Math.round((x - this.x0) / this.step), j = Math.round((y - this.y0) / this.step);
		return this._on(i, j) ? [this.x0 + i * this.step, this.y0 + j * this.step] : null;
	}
}

// Is the point inside a closed line of [x, y] points?
export function insidePolygon(x, y, pts) {
	let inside = false;
	for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
		const [xi, yi] = pts[i], [xj, yj] = pts[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}
