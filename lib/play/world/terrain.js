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

// Is the point inside a closed line of [x, y] points?
export function insidePolygon(x, y, pts) {
	let inside = false;
	for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
		const [xi, yi] = pts[i], [xj, yj] = pts[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}
