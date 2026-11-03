// Every scene below the hero is the same cloud of points pulled into a new
// shape. Each generator here returns N points (shuffled, so any two shapes
// pair up point for point at random and the morph between them reads as dust
// reassembling) plus a vec4 of per-point meta:
//   x  accent   0–1, drawn in the signal colour
//   y  wave     1 = rides the animated voice surface
//   z  pin      destination index on the globe (100 + city on the map), else -1
//   w  video    1 = coloured and lifted by the AR footage
// Coordinates are in world units, y up, facing +z, centred on the origin.

const TAU = Math.PI * 2;

export function rng(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Fills N points from weighted parts. Each part's `fn(o, r, j, n)` writes one
 * point into `o` (x, y, z, and optionally a, w, pin, v); j of n is its index
 * within the part, for evenly spread samples.
 */
function build(N, parts, seed) {
	const r = rng(seed);
	const pos = new Float32Array(N * 3);
	const meta = new Float32Array(N * 4);
	const total = parts.reduce((s, p) => s + p.share, 0);
	const o = {};
	let i = 0;
	parts.forEach((part, k) => {
		const n = k === parts.length - 1 ? N - i : Math.round((N * part.share) / total);
		for (let j = 0; j < n && i < N; j += 1, i += 1) {
			o.x = 0;
			o.y = 0;
			o.z = 0;
			o.a = 0;
			o.w = 0;
			o.pin = -1;
			o.v = 0;
			part.fn(o, r, j, n);
			pos[i * 3] = o.x;
			pos[i * 3 + 1] = o.y;
			pos[i * 3 + 2] = o.z;
			meta[i * 4] = o.a;
			meta[i * 4 + 1] = o.w;
			meta[i * 4 + 2] = o.pin;
			meta[i * 4 + 3] = o.v;
		}
	});
	// Shuffle point order so morphs pair points at random.
	for (let a = N - 1; a > 0; a -= 1) {
		const b = Math.floor(r() * (a + 1));
		for (let c = 0; c < 3; c += 1) [pos[a * 3 + c], pos[b * 3 + c]] = [pos[b * 3 + c], pos[a * 3 + c]];
		for (let c = 0; c < 4; c += 1) [meta[a * 4 + c], meta[b * 4 + c]] = [meta[b * 4 + c], meta[a * 4 + c]];
	}
	return { pos, meta };
}

const jitter = (r, s) => (r() - 0.5) * s;
const lerp = (a, b, t) => a + (b - a) * t;

/** Point on the surface of an axis-aligned box (faces weighted by area). */
function onBox(o, r, cx, cy, cz, w, h, d, { top = true, bottom = false } = {}) {
	const faces = [
		[w * h, "z+"],
		[w * h, "z-"],
		[d * h, "x+"],
		[d * h, "x-"],
	];
	if (top) faces.push([w * d, "y+"]);
	if (bottom) faces.push([w * d, "y-"]);
	const sum = faces.reduce((s, f) => s + f[0], 0);
	let pick = r() * sum;
	let face = faces[0][1];
	for (const [area, f] of faces) {
		pick -= area;
		if (pick <= 0) {
			face = f;
			break;
		}
	}
	const u = r() - 0.5;
	const v = r() - 0.5;
	if (face[0] === "z") {
		o.x = cx + u * w;
		o.y = cy + v * h;
		o.z = cz + (face[1] === "+" ? d / 2 : -d / 2);
	} else if (face[0] === "x") {
		o.x = cx + (face[1] === "+" ? w / 2 : -w / 2);
		o.y = cy + v * h;
		o.z = cz + u * d;
	} else {
		o.x = cx + u * w;
		o.y = cy + (face[1] === "+" ? h / 2 : -h / 2);
		o.z = cz + v * d;
	}
}

/** Point on the side of a vertical cylinder. */
function onCylinder(o, r, cx, cy, cz, radius, h) {
	const t = r() * TAU;
	o.x = cx + Math.cos(t) * radius;
	o.y = cy + r() * h;
	o.z = cz + Math.sin(t) * radius;
}

/** Point on a surface of revolution: profile(s) -> radius at height s ∈ [0, 1]. */
function onLathe(o, r, cx, cy, cz, h, profile) {
	const s = r();
	const t = r() * TAU;
	const rad = profile(s);
	o.x = cx + Math.cos(t) * rad;
	o.y = cy + s * h;
	o.z = cz + Math.sin(t) * rad;
}

/* ───────────────────────── Scattered dust (before the first scene) ───────────────────────── */

export function dust(N) {
	return build(
		N,
		[
			{
				share: 1,
				fn: (o, r) => {
					const th = r() * TAU;
					const ph = Math.acos(2 * r() - 1);
					const rad = 4 + r() * 6;
					o.x = rad * Math.sin(ph) * Math.cos(th) * 1.6;
					o.y = rad * Math.cos(ph);
					o.z = rad * Math.sin(ph) * Math.sin(th) - 2;
				},
			},
		],
		1
	);
}

/* ───────────────────────── Konark Sun Temple (the scan) ───────────────────────── */

/** `cloud`: the baked Int16 scan (x, y, z, unit-normalised). */
export function temple(N, cloud) {
	const count = cloud.length / 3;
	const s = 2.4;
	return build(
		N,
		[
			{
				share: 0.94,
				fn: (o, r, j, n) => {
					const k = Math.floor((j / n) * count) * 3;
					o.x = (cloud[k] / 32767) * s;
					o.y = (cloud[k + 1] / 32767) * s;
					o.z = (cloud[k + 2] / 32767) * s;
				},
			},
			// The plinth it stands on: a ring of measurement ticks.
			{
				share: 0.06,
				fn: (o, r) => {
					const t = r() * TAU;
					const rad = 3 + (r() < 0.3 ? r() * 0.25 : 0);
					o.x = Math.cos(t) * rad;
					o.y = -0.65 * s - 0.05;
					o.z = Math.sin(t) * rad;
					o.a = r() < 0.4 ? 1 : 0;
				},
			},
		],
		2
	);
}

/* ───────────────────────── India, with the live cities ───────────────────────── */

// India's outline, simplified: [lat, lon], clockwise from the Rann of Kutch.
const INDIA = [
	[23.7, 68.2], [22.4, 68.9], [21.2, 69.9], [20.8, 70.9], [21.6, 72.4], [22.3, 72.6], [21.1, 72.7], [20.3, 72.8],
	[19.0, 72.8], [17.4, 73.2], [15.8, 73.6], [14.6, 74.3], [12.9, 74.8], [11.3, 75.7], [10.0, 76.2], [8.6, 76.9],
	[8.1, 77.5], [8.9, 78.2], [9.3, 79.0], [10.3, 79.8], [11.6, 79.8], [13.1, 80.3], [14.6, 80.2], [15.7, 80.8],
	[16.4, 81.8], [17.7, 83.4], [19.2, 84.9], [20.2, 86.5], [21.4, 87.1], [21.7, 88.1], [21.9, 89.0], [23.0, 88.8],
	[24.2, 88.1], [25.1, 88.5], [25.4, 89.7], [25.2, 92.0], [24.2, 91.9], [23.4, 91.3], [22.6, 92.6], [23.8, 93.4],
	[25.3, 94.6], [26.6, 95.2], [27.4, 96.9], [28.2, 97.3], [29.4, 96.3], [28.4, 94.3], [27.9, 92.4], [26.9, 91.8],
	[26.8, 89.8], [26.4, 88.4], [26.7, 87.0], [27.0, 85.0], [27.4, 83.4], [28.1, 81.3], [29.7, 80.3], [30.3, 81.0],
	[31.4, 78.8], [32.6, 78.4], [32.9, 79.6], [34.3, 78.9], [35.6, 77.8], [35.3, 76.2], [34.6, 75.1], [34.4, 73.8],
	[33.2, 74.3], [32.4, 75.0], [31.1, 74.6], [30.1, 73.9], [29.0, 73.0], [27.8, 71.4], [27.0, 70.1], [25.8, 70.2],
	[24.6, 71.1], [24.3, 69.5],
];
const INDIA_K = 0.17; // world units per degree
const MAP_C = [22.5, 82.0]; // lat, lon at the origin
const toMap = (lat, lon) => [(lon - MAP_C[1]) * INDIA_K, (lat - MAP_C[0]) * INDIA_K];

function insidePolygon(x, y, poly) {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
		const [xi, yi] = poly[i];
		const [xj, yj] = poly[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

// The live monuments, by city.
export const CITIES = [
	{ id: "bengaluru", name: "Bengaluru", lat: 12.97, lon: 77.59 },
	{ id: "kolkata", name: "Kolkata", lat: 22.57, lon: 88.36 },
];
const BEAM = 1.9;

export function india(N) {
	const poly = INDIA.map(([lat, lon]) => toMap(lat, lon));
	const xs = poly.map((p) => p[0]);
	const ys = poly.map((p) => p[1]);
	const box = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
	// Perimeter, for evenly spaced coastline points.
	const seg = poly.map((p, i) => {
		const q = poly[(i + 1) % poly.length];
		return Math.hypot(q[0] - p[0], q[1] - p[1]);
	});
	const perim = seg.reduce((s, l) => s + l, 0);
	const cities = CITIES.map((c) => toMap(c.lat, c.lon));
	return build(
		N,
		[
			// The land, as a dot grid with a little relief.
			{
				share: 0.62,
				fn: (o, r) => {
					for (let tries = 0; tries < 60; tries += 1) {
						const x = lerp(box[0], box[1], r());
						const y = lerp(box[2], box[3], r());
						if (insidePolygon(x, y, poly)) {
							// Snap to a fine grid: reads as a map, not noise.
							o.x = Math.round(x / 0.06) * 0.06 + jitter(r, 0.012);
							o.y = Math.round(y / 0.06) * 0.06 + jitter(r, 0.012);
							o.z = jitter(r, 0.04) + Math.max(0, y - 2.2) * 0.12 * r();
							return;
						}
					}
				},
			},
			// The coastline and borders, bright.
			{
				share: 0.18,
				fn: (o, r) => {
					let d = r() * perim;
					let i = 0;
					while (d > seg[i]) {
						d -= seg[i];
						i += 1;
					}
					const p = poly[i];
					const q = poly[(i + 1) % poly.length];
					const t = d / seg[i];
					o.x = lerp(p[0], q[0], t) + jitter(r, 0.02);
					o.y = lerp(p[1], q[1], t) + jitter(r, 0.02);
					o.z = jitter(r, 0.02);
					o.a = 0.35;
				},
			},
			// A beam of light standing on each live city.
			{
				share: 0.12,
				fn: (o, r) => {
					const c = Math.floor(r() * cities.length);
					const [cx, cy] = cities[c];
					o.pin = 100 + c; // lights up when the city's monuments are hovered
					const h = Math.pow(r(), 0.7) * BEAM;
					const spread = 0.04 + (1 - h / BEAM) * 0.06;
					o.x = cx + jitter(r, spread);
					o.y = cy + jitter(r, spread);
					o.z = h;
					o.a = 1;
				},
			},
			// Pulse rings around each city.
			{
				share: 0.08,
				fn: (o, r) => {
					const c = Math.floor(r() * cities.length);
					const [cx, cy] = cities[c];
					o.pin = 100 + c;
					const t = r() * TAU;
					const rad = [0.22, 0.42, 0.66][Math.floor(r() * 3)];
					o.x = cx + Math.cos(t) * rad;
					o.y = cy + Math.sin(t) * rad;
					o.z = 0.02;
					o.a = 0.8;
				},
			},
		],
		3
	);
}

/** Label anchors (shape space) for the city beams. */
export const INDIA_ANCHORS = CITIES.map((c) => {
	const [x, y] = toMap(c.lat, c.lon);
	return { id: c.id, pos: [x, y, BEAM + 0.15] };
});

/* ───────────────────────── 01 · AR Time Travel: a phone, the past popping out ───────────────────────── */

export function phone(N, cloud) {
	const W = 2.3;
	const H = 4.6;
	const R = 0.32;
	const D = 0.22;
	// A point on the rounded-rectangle outline, uniform by length.
	const straightW = W - 2 * R;
	const straightH = H - 2 * R;
	const perim = 2 * (straightW + straightH) + TAU * R;
	const outline = (d) => {
		if (d < straightW) return [-W / 2 + R + d, H / 2];
		d -= straightW;
		if (d < straightW) return [-W / 2 + R + d, -H / 2];
		d -= straightW;
		if (d < straightH) return [W / 2, -H / 2 + R + d];
		d -= straightH;
		if (d < straightH) return [-W / 2, -H / 2 + R + d];
		d -= straightH;
		// The four corners: the arc angle's quadrant picks the corner.
		const a = d / R;
		const cx = Math.cos(a) >= 0 ? W / 2 - R : -W / 2 + R;
		const cy = Math.sin(a) >= 0 ? H / 2 - R : -H / 2 + R;
		return [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
	};
	const count = cloud ? cloud.length / 3 : 0;
	return build(
		N,
		[
			// The body's rims, front and back.
			{
				share: 0.24,
				fn: (o, r) => {
					const [x, y] = outline(r() * perim);
					o.x = x;
					o.y = y;
					o.z = (r() < 0.5 ? 1 : -1) * (D / 2) * (r() < 0.75 ? 1 : r());
				},
			},
			// The screen: scanlines.
			{
				share: 0.2,
				fn: (o, r) => {
					const row = Math.floor(r() * 64);
					o.x = jitter(r, W - 0.3);
					o.y = -H / 2 + 0.3 + (row / 63) * (H - 0.6);
					o.z = D / 2 + 0.01;
					o.a = 0.1;
				},
			},
			// The past, rising out of the screen: the temple in the signal colour.
			{
				share: 0.48,
				fn: (o, r, j, n) => {
					if (!count) {
						o.x = jitter(r, 1.6);
						o.y = jitter(r, 1);
						o.z = 1;
						return;
					}
					const k = Math.floor((j / n) * count) * 3;
					o.x = (cloud[k] / 32767) * 1.15;
					o.y = (cloud[k + 1] / 32767) * 1.15 + 0.35;
					o.z = (cloud[k + 2] / 32767) * 0.55 + 0.95;
					o.a = 0.85;
				},
			},
			// The camera bump and the frame of the AR view.
			{
				share: 0.08,
				fn: (o, r) => {
					if (r() < 0.5) {
						const t = r() * TAU;
						o.x = W / 2 - 0.55 + Math.cos(t) * 0.22;
						o.y = H / 2 - 0.55 + Math.sin(t) * 0.22;
						o.z = -D / 2 - 0.03;
					} else {
						// Corner brackets of the viewfinder.
						const c = Math.floor(r() * 4);
						const sx = c % 2 ? 1 : -1;
						const sy = c > 1 ? 1 : -1;
						const along = r() * 0.4;
						const horiz = r() < 0.5;
						o.x = sx * (W / 2 - 0.25) - (horiz ? sx * along : 0);
						o.y = sy * (H / 2 - 0.45) - (horiz ? 0 : sy * along);
						o.z = D / 2 + 0.02;
						o.a = 1;
					}
				},
			},
		],
		4
	);
}

/* ───────────────────────── 02 · AI Historian: a voice, as a moving surface ───────────────────────── */

export function wave(N) {
	return build(
		N,
		[
			{
				share: 0.82,
				fn: (o, r) => {
					const row = Math.floor(r() * 48);
					o.x = jitter(r, 6.4);
					o.z = -1.6 + (row / 47) * 3.2;
					o.y = 0;
					o.w = 1;
					// The middle line is the speaker's voice, in signal.
					o.a = row === 24 || row === 23 ? 1 : 0;
				},
			},
			// Level ticks under the surface.
			{
				share: 0.18,
				fn: (o, r) => {
					const col = Math.floor(r() * 41);
					o.x = -3.2 + (col / 40) * 6.4;
					o.y = -1.1 - r() * (col % 5 === 0 ? 0.35 : 0.15);
					o.z = 1.8;
					o.a = col % 5 === 0 ? 0.6 : 0;
				},
			},
		],
		5
	);
}

/* ───────────────────────── 03 · Sourced: record cards fanned out ───────────────────────── */

export function cards(N) {
	const W = 2.7;
	const H = 3.5;
	const fan = [
		{ x: -0.9, y: 0.15, z: -0.6, rot: 0.22 },
		{ x: -0.1, y: 0.0, z: -0.3, rot: 0.06 },
		{ x: 0.75, y: -0.15, z: 0, rot: -0.12 },
	];
	const place = (o, c, x, y) => {
		const s = Math.sin(c.rot);
		const k = Math.cos(c.rot);
		o.x = c.x + x * k - y * s;
		o.y = c.y + x * s + y * k;
		o.z = c.z;
	};
	return build(
		N,
		[
			// Card edges.
			{
				share: 0.3,
				fn: (o, r) => {
					const c = fan[Math.floor(r() * 3)];
					const side = Math.floor(r() * 4);
					const t = r() - 0.5;
					const [x, y] = side === 0 ? [t * W, H / 2] : side === 1 ? [t * W, -H / 2] : side === 2 ? [W / 2, t * H] : [-W / 2, t * H];
					place(o, c, x, y);
				},
			},
			// Lines of text.
			{
				share: 0.46,
				fn: (o, r) => {
					const c = fan[Math.floor(r() * 3)];
					const line = Math.floor(r() * 14);
					const len = line % 5 === 4 ? 0.55 : 0.85 + ((line * 37) % 10) / 100;
					const x = -W / 2 + 0.28 + r() * (W - 0.56) * len;
					const y = H / 2 - 0.95 - line * 0.17;
					place(o, c, x, y);
				},
			},
			// Headline block.
			{
				share: 0.1,
				fn: (o, r) => {
					const c = fan[Math.floor(r() * 3)];
					place(o, c, -W / 2 + 0.28 + r() * 1.5, H / 2 - 0.35 - r() * 0.28);
				},
			},
			// The source stamp on the front card.
			{
				share: 0.14,
				fn: (o, r) => {
					const c = fan[2];
					const t = r() * TAU;
					const rad = r() < 0.7 ? 0.42 + jitter(r, 0.03) : 0.3 * Math.sqrt(r());
					place(o, c, W / 2 - 0.7 + Math.cos(t) * rad, -H / 2 + 0.75 + Math.sin(t) * rad);
					o.z += 0.02;
					o.a = 1;
				},
			},
		],
		6
	);
}

/* ───────────────────────── The collection: Giza, the Colosseum, the Taj ───────────────────────── */

/** A pyramid's faces, laid in stone courses. */
function pyramidPoint(o, r, cx, cz, base, height, courses) {
	const row = Math.floor(r() * courses);
	const y = (row / courses) * height;
	const half = (base / 2) * (1 - y / height);
	const side = Math.floor(r() * 4);
	const t = (r() - 0.5) * 2 * half;
	const [x, z] = side === 0 ? [t, half] : side === 1 ? [t, -half] : side === 2 ? [half, t] : [-half, t];
	o.x = cx + x;
	o.y = y;
	o.z = cz + z;
}

export function pyramids(N) {
	return build(
		N,
		[
			{ share: 0.58, fn: (o, r) => pyramidPoint(o, r, 0.3, 0, 3.6, 2.4, 70) },
			{ share: 0.2, fn: (o, r) => pyramidPoint(o, r, -2.1, -1.6, 2.4, 1.6, 48) },
			{ share: 0.1, fn: (o, r) => pyramidPoint(o, r, 2.4, -2.2, 1.5, 1.0, 30) },
			// Desert, in long dune lines.
			{
				share: 0.08,
				fn: (o, r) => {
					const line = Math.floor(r() * 18);
					o.x = jitter(r, 6.6);
					o.z = -3 + line * 0.38;
					o.y = 0.06 * Math.sin(o.x * 1.3 + line) - 0.02;
					o.a = 0;
				},
			},
		].map((p) => ({ ...p, fn: ((f) => (o, r, j, n) => {
			f(o, r, j, n);
			o.y -= 1.2;
		})(p.fn) })),
		7
	);
}

/** The Colosseum: three tiers of arches and the attic; `ruin` drops the south side as it stands today. */
export function colosseum(N, ruin = 1) {
	const A = 2.7;
	const B = 2.15;
	const H = 1.9;
	const ARCHES = 40;
	const wallHeight = (t) => {
		if (!ruin) return H;
		// The outer ring survives on the north side only.
		const north = Math.max(0, Math.sin(t));
		return H * (0.42 + 0.58 * Math.pow(north, 0.6)) - 0.12 * Math.abs(Math.sin(t * 7));
	};
	const isArch = (t, y) => {
		const tier = Math.floor(y / (H / 4));
		if (tier > 2) return false; // the attic has windows, not arches
		const local = y - tier * (H / 4);
		const u = ((t / TAU) * ARCHES) % 1;
		const dx = Math.abs(u - 0.5) * 2; // 0 at the arch centre, 1 at the pier
		const archH = (H / 4) * 0.78;
		const spring = archH * 0.62;
		if (dx > 0.62) return false;
		if (local < spring) return true;
		const k = (local - spring) / (archH - spring);
		return k < Math.sqrt(Math.max(0, 1 - Math.pow(dx / 0.62, 2)));
	};
	return build(
		N,
		[
			// The outer wall, pierced by arches.
			{
				share: 0.5,
				fn: (o, r) => {
					for (let tries = 0; tries < 40; tries += 1) {
						const t = r() * TAU;
						const y = r() * H;
						if (y > wallHeight(t) || isArch(t, y)) continue;
						const k = 1 + (r() < 0.5 ? 0 : 0.035);
						o.x = Math.cos(t) * A * k;
						o.z = Math.sin(t) * B * k;
						o.y = y;
						// Cornice lines between tiers.
						if (Math.abs(((y / (H / 4)) % 1) - 0) < 0.04) o.a = 0.25;
						return;
					}
				},
			},
			// The seating, stepping down to the arena.
			{
				share: 0.32,
				fn: (o, r) => {
					const row = Math.floor(r() * 22);
					const k = 0.48 + (row / 21) * 0.47;
					const t = r() * TAU;
					const top = ruin ? wallHeight(t) * 0.72 : H * 0.72;
					o.x = Math.cos(t) * A * k;
					o.z = Math.sin(t) * B * k;
					o.y = Math.min(top, (row / 21) * H * 0.72);
				},
			},
			// The arena floor, open to the hypogeum below.
			{
				share: 0.18,
				fn: (o, r) => {
					const t = r() * TAU;
					const k = Math.sqrt(r()) * 0.46;
					o.x = Math.cos(t) * A * k;
					o.z = Math.sin(t) * B * k;
					// Ruined: the floor is gone and the corridors below show.
					const grid = Math.abs(Math.sin(o.x * 6)) < 0.25 || Math.abs(Math.sin(o.z * 9)) < 0.2;
					o.y = ruin && grid ? -0.25 : 0;
					o.a = ruin && grid ? 0.3 : 0;
				},
			},
		].map((p) => ({ ...p, fn: ((f) => (o, r, j, n) => {
			f(o, r, j, n);
			o.y -= H * 0.55;
		})(p.fn) })),
		ruin ? 8 : 9
	);
}

/** The Taj Mahal: plinth, mausoleum with its great arches, the onion dome, chhatris and four minarets. */
export function taj(N) {
	const P = 4.4; // plinth side
	const M = 1.9; // mausoleum side
	const base = -1.9;
	const onion = (s) => {
		// Bulb swelling past the drum, then the tapering finial.
		if (s < 0.08) return 0.62;
		const k = (s - 0.08) / 0.92;
		return 0.62 + 0.18 * Math.sin(Math.min(1, k / 0.55) * Math.PI * 0.85) - Math.max(0, k - 0.45) * 1.25;
	};
	return build(
		N,
		[
			// Plinth.
			{ share: 0.14, fn: (o, r) => onBox(o, r, 0, base + 0.15, 0, P, 0.3, P) },
			// Mausoleum walls with the iwan arches cut in.
			{
				share: 0.24,
				fn: (o, r) => {
					for (let tries = 0; tries < 30; tries += 1) {
						onBox(o, r, 0, base + 0.3 + 0.75, 0, M, 1.5, M);
						const across = Math.abs(o.z) > M / 2 - 1e-3 ? o.x : o.z;
						const up = o.y - (base + 0.3);
						const inArch = Math.abs(across) < 0.38 && up < 1.0 + Math.sqrt(Math.max(0, 0.38 * 0.38 - across * across)) * 0.6;
						if (!inArch || Math.abs(o.y - (base + 1.8)) < 0.01) return;
					}
				},
			},
			// Arch outlines, in signal.
			{
				share: 0.05,
				fn: (o, r) => {
					const face = Math.floor(r() * 4);
					const t = r();
					let a;
					let u;
					if (t < 0.5) {
						u = (r() < 0.5 ? -1 : 1) * 0.38;
						a = r() * 1.0;
					} else {
						const ang = r() * Math.PI;
						u = Math.cos(ang) * 0.38;
						a = 1.0 + Math.sin(ang) * 0.38 * 0.6;
					}
					const y = base + 0.3 + a;
					const s = M / 2 + 0.01;
					[o.x, o.z] = face === 0 ? [u, s] : face === 1 ? [u, -s] : face === 2 ? [s, u] : [-s, u];
					o.y = y;
					o.a = 0.8;
				},
			},
			// Drum and onion dome.
			{ share: 0.08, fn: (o, r) => onCylinder(o, r, 0, base + 1.8, 0, 0.62, 0.35) },
			{ share: 0.22, fn: (o, r) => onLathe(o, r, 0, base + 2.15, 0, 1.55, onion) },
			// Four chhatris on the roof.
			{
				share: 0.06,
				fn: (o, r) => {
					const c = Math.floor(r() * 4);
					const cx = (c % 2 ? 1 : -1) * 0.68;
					const cz = (c > 1 ? 1 : -1) * 0.68;
					onLathe(o, r, cx, base + 1.8, cz, 0.55, (s) => (s < 0.45 ? 0.17 : 0.2 * Math.cos(((s - 0.45) / 0.55) * Math.PI * 0.5)));
				},
			},
			// Four minarets with their balconies.
			{
				share: 0.21,
				fn: (o, r) => {
					const c = Math.floor(r() * 4);
					const cx = (c % 2 ? 1 : -1) * (P / 2 - 0.2);
					const cz = (c > 1 ? 1 : -1) * (P / 2 - 0.2);
					const s = r();
					if (s < 0.82) {
						onCylinder(o, r, cx, base + 0.3, cz, 0.13 - s * 0.03, 2.9);
						const band = (o.y - base - 0.3) / 2.9;
						if ([0.33, 0.66, 0.97].some((b) => Math.abs(band - b) < 0.02)) {
							o.x = cx + (o.x - cx) * 1.6;
							o.z = cz + (o.z - cz) * 1.6;
						}
					} else {
						onLathe(o, r, cx, base + 3.2, cz, 0.3, (k) => 0.16 * Math.cos(k * Math.PI * 0.5));
					}
				},
			},
		],
		10
	);
}

/* ───────────────────────── In the field: the footage, as points ───────────────────────── */

export const VIDEO_SIZE = [6.4, 3.6];

export function video(N) {
	const cols = Math.round(Math.sqrt((N * 16) / 9));
	const rows = Math.floor(N / cols);
	return build(
		N,
		[
			{
				share: 1,
				fn: (o, r, j) => {
					const k = j % (cols * rows);
					const cx = k % cols;
					const cy = Math.floor(k / cols);
					o.x = (cx / (cols - 1) - 0.5) * VIDEO_SIZE[0];
					o.y = (cy / (rows - 1) - 0.5) * VIDEO_SIZE[1];
					o.z = 0;
					o.v = 1;
				},
			},
		],
		11
	);
}

/* ───────────────────────── How it works: four eras ───────────────────────── */

/** Angkor Wat: stepped galleries rising to five lotus-bud towers. */
export function angkor(N) {
	const base = -1.8;
	const tower = (o, r, cx, cz, h, w) => {
		// Lotus bud: tiers that narrow to a point.
		onLathe(o, r, cx, base + 1.35, cz, h, (s) => w * (1 - s) * (0.75 + 0.25 * Math.abs(Math.sin(s * 22))));
	};
	return build(
		N,
		[
			{ share: 0.16, fn: (o, r) => onBox(o, r, 0, base + 0.2, 0, 4.8, 0.4, 4.8) },
			{ share: 0.13, fn: (o, r) => onBox(o, r, 0, base + 0.65, 0, 3.6, 0.5, 3.6) },
			{ share: 0.11, fn: (o, r) => onBox(o, r, 0, base + 1.1, 0, 2.5, 0.5, 2.5) },
			{ share: 0.26, fn: (o, r) => tower(o, r, 0, 0, 2.3, 0.6) },
			{
				share: 0.34,
				fn: (o, r) => {
					const c = Math.floor(r() * 4);
					tower(o, r, (c % 2 ? 1 : -1) * 1.0, (c > 1 ? 1 : -1) * 1.0, 1.5, 0.38);
				},
			},
		],
		12
	);
}

/** Machu Picchu: terraced saddle under the peak of Huayna Picchu. */
export function terraces(N) {
	const height = (x, z) => {
		const saddle = 0.55 - 0.05 * x * x + 0.04 * z;
		const peak = 2.6 * Math.exp(-((x - 1.6) ** 2 + (z + 1.2) ** 2) / 0.55);
		const ridge = 1.2 * Math.exp(-((x + 2.3) ** 2) / 0.6 - (z + 0.4) ** 2 / 2.2);
		return Math.max(saddle, peak, ridge, -0.6 - 0.1 * (x * x + z * z));
	};
	return build(
		N,
		[
			{
				share: 0.86,
				fn: (o, r) => {
					const t = r() * TAU;
					const rad = Math.sqrt(r()) * 3.1;
					const x = Math.cos(t) * rad;
					const z = Math.sin(t) * rad * 0.8;
					let y = height(x, z);
					// Terraces cut the saddle's flanks into steps.
					const terraced = y < 0.9 && Math.abs(x + 0.2) < 2.2;
					if (terraced) y = Math.floor(y / 0.12) * 0.12;
					o.x = x;
					o.z = z;
					o.y = y - 0.6;
					o.a = terraced && Math.abs((y / 0.12) % 1) < 0.02 ? 0.25 : 0;
				},
			},
			// The citadel's walls on the saddle.
			{
				share: 0.14,
				fn: (o, r) => {
					const b = Math.floor(r() * 9);
					const bx = -1.1 + (b % 3) * 0.55;
					const bz = -0.2 + Math.floor(b / 3) * 0.42;
					onBox(o, r, bx, height(bx, bz) - 0.6 + 0.11, bz, 0.36, 0.22, 0.26);
					o.a = 0.5;
				},
			},
		],
		13
	);
}

/* ───────────────────────── Where we're headed: the globe ───────────────────────── */

export const DESTINATIONS = [
	{ name: "Taj Mahal", place: "India", coord: "27.17°N 78.04°E", lat: 27.17, lon: 78.04 },
	{ name: "Colosseum", place: "Italy", coord: "41.89°N 12.49°E", lat: 41.89, lon: 12.49 },
	{ name: "Machu Picchu", place: "Peru", coord: "13.16°S 72.54°W", lat: -13.16, lon: -72.54 },
	{ name: "Great Wall", place: "China", coord: "40.43°N 116.57°E", lat: 40.43, lon: 116.57 },
	{ name: "Pyramids of Giza", place: "Egypt", coord: "29.98°N 31.13°E", lat: 29.98, lon: 31.13 },
	{ name: "Boudhanath Stupa", place: "Nepal", coord: "27.72°N 85.36°E", lat: 27.72, lon: 85.36 },
	{ name: "Tikal", place: "Guatemala", coord: "17.22°N 89.62°W", lat: 17.22, lon: -89.62 },
	{ name: "Carcassonne", place: "France", coord: "43.21°N 02.36°E", lat: 43.21, lon: 2.36 },
];
export const GLOBE_R = 2.2;
const HOME = { lat: 12.97, lon: 77.59 }; // Bengaluru
const D2R = Math.PI / 180;

/** Latitude/longitude to a point on the globe; longitude 0 faces the camera. */
export function onGlobe(lat, lon, rad = GLOBE_R) {
	return [rad * Math.cos(lat * D2R) * Math.sin(lon * D2R), rad * Math.sin(lat * D2R), rad * Math.cos(lat * D2R) * Math.cos(lon * D2R)];
}

function slerp(a, b, t) {
	const dot = Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (GLOBE_R * GLOBE_R)));
	const w = Math.acos(dot);
	const s = Math.sin(w) || 1;
	const ka = Math.sin((1 - t) * w) / s;
	const kb = Math.sin(t * w) / s;
	return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
}

export function globe(N) {
	const home = onGlobe(HOME.lat, HOME.lon);
	const pins = DESTINATIONS.map((d) => onGlobe(d.lat, d.lon));
	const golden = Math.PI * (3 - Math.sqrt(5));
	return build(
		N,
		[
			// The sphere, as an even field of dots.
			{
				share: 0.56,
				fn: (o, r, j, n) => {
					const y = 1 - (j / (n - 1)) * 2;
					const ring = Math.sqrt(1 - y * y);
					const th = golden * j;
					o.x = Math.cos(th) * ring * GLOBE_R;
					o.y = y * GLOBE_R;
					o.z = Math.sin(th) * ring * GLOBE_R;
				},
			},
			// Graticule: meridians and parallels every 30°.
			{
				share: 0.14,
				fn: (o, r) => {
					if (r() < 0.5) {
						const lon = Math.floor(r() * 12) * 30;
						[o.x, o.y, o.z] = onGlobe(r() * 180 - 90, lon, GLOBE_R * 1.004);
					} else {
						const lat = (Math.floor(r() * 5) - 2) * 30;
						[o.x, o.y, o.z] = onGlobe(lat, r() * 360, GLOBE_R * 1.004);
					}
					o.a = 0.12;
				},
			},
			// Routes from home to each site, lifted off the surface.
			{
				share: 0.22,
				fn: (o, r) => {
					const k = Math.floor(r() * pins.length);
					const t = r();
					const p = slerp(home, pins[k], t);
					const lift = 1 + 0.22 * Math.sin(t * Math.PI);
					o.x = p[0] * lift;
					o.y = p[1] * lift;
					o.z = p[2] * lift;
					o.a = 0.7;
					o.pin = k;
				},
			},
			// The pins.
			{
				share: 0.08,
				fn: (o, r) => {
					const k = Math.floor(r() * (pins.length + 1));
					const c = k === pins.length ? home : pins[k];
					const lift = 1 + r() * 0.12;
					o.x = c[0] * lift + jitter(r, 0.07);
					o.y = c[1] * lift + jitter(r, 0.07);
					o.z = c[2] * lift + jitter(r, 0.07);
					o.a = 1;
					o.pin = k === pins.length ? -1 : k;
				},
			},
		],
		14
	);
}

export const GLOBE_ANCHORS = DESTINATIONS.map((d, k) => {
	const [x, y, z] = onGlobe(d.lat, d.lon, GLOBE_R * 1.16);
	return { id: `dest-${k}`, pos: [x, y, z] };
});

/* ───────────────────────── The network: creators, connected ───────────────────────── */

export function network(N) {
	const r0 = rng(15);
	const nodes = Array.from({ length: 84 }, (_, i) => {
		if (i === 0) return [0, 0, 0];
		const th = r0() * TAU;
		const ph = Math.acos(2 * r0() - 1);
		const rad = 1.1 + Math.pow(r0(), 0.6) * 1.9;
		return [rad * Math.sin(ph) * Math.cos(th) * 1.35, rad * Math.cos(ph) * 0.85, rad * Math.sin(ph) * Math.sin(th)];
	});
	const edges = [];
	nodes.forEach((a, i) => {
		const near = nodes
			.map((b, k) => [k, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])])
			.filter(([k]) => k !== i)
			.sort((x, y) => x[1] - y[1])
			.slice(0, 3);
		near.forEach(([k]) => edges.push([i, k]));
		if (i > 0 && i % 7 === 0) edges.push([i, 0]); // spokes to the centre: Epocheye
	});
	return build(
		N,
		[
			{
				share: 0.5,
				fn: (o, r) => {
					const [i, k] = edges[Math.floor(r() * edges.length)];
					const t = r();
					const a = nodes[i];
					const b = nodes[k];
					o.x = lerp(a[0], b[0], t);
					o.y = lerp(a[1], b[1], t);
					o.z = lerp(a[2], b[2], t);
					o.a = k === 0 ? 0.6 : 0;
				},
			},
			{
				share: 0.5,
				fn: (o, r) => {
					const i = r() < 0.12 ? 0 : Math.floor(r() * nodes.length);
					const c = nodes[i];
					const size = i === 0 ? 0.42 : 0.1 + (i % 5) * 0.02;
					const th = r() * TAU;
					const ph = Math.acos(2 * r() - 1);
					const rad = size * Math.cbrt(r());
					o.x = c[0] + rad * Math.sin(ph) * Math.cos(th);
					o.y = c[1] + rad * Math.cos(ph);
					o.z = c[2] + rad * Math.sin(ph) * Math.sin(th);
					o.a = i === 0 || i % 6 === 0 ? 1 : 0;
				},
			},
		],
		16
	);
}

/* ───────────────────────── The team: the eye ───────────────────────── */

export function eye(N) {
	const W = 2.8; // half width
	const Hh = 1.25; // lid height
	const lid = (x) => Hh * Math.pow(1 - Math.pow(Math.abs(x) / W, 2), 0.9);
	return build(
		N,
		[
			// Upper and lower lids.
			{
				share: 0.26,
				fn: (o, r) => {
					const x = (r() * 2 - 1) * W;
					const upper = r() < 0.55;
					const thick = upper ? 0.08 : 0.04;
					o.x = x;
					o.y = (upper ? 1 : -0.85) * lid(x) + jitter(r, thick);
					o.z = jitter(r, 0.1) + (lid(x) / Hh) * 0.3;
				},
			},
			// Iris: radial fibres.
			{
				share: 0.42,
				fn: (o, r) => {
					const t = r() * TAU;
					const rad = 0.42 + Math.pow(r(), 0.8) * 0.78;
					o.x = Math.cos(t) * rad;
					o.y = Math.sin(t) * rad;
					o.z = 0.35 - rad * 0.12;
					o.a = rad < 0.75 ? 1 : 0.55;
				},
			},
			// Iris rim and the inner ring.
			{
				share: 0.14,
				fn: (o, r) => {
					const t = r() * TAU;
					const rad = r() < 0.6 ? 1.22 : 0.44;
					o.x = Math.cos(t) * rad;
					o.y = Math.sin(t) * rad;
					o.z = 0.3;
					o.a = 1;
				},
			},
			// The catchlight.
			{
				share: 0.03,
				fn: (o, r) => {
					const t = r() * TAU;
					const rad = Math.sqrt(r()) * 0.16;
					o.x = 0.32 + Math.cos(t) * rad;
					o.y = 0.3 + Math.sin(t) * rad;
					o.z = 0.6;
				},
			},
			// Lashes.
			{
				share: 0.15,
				fn: (o, r) => {
					const k = Math.floor(r() * 23);
					const x = (k / 22 - 0.5) * 2 * W * 0.86;
					const len = 0.25 + 0.2 * (1 - Math.abs(x) / W);
					const t = r();
					const ang = Math.PI / 2 + (x / W) * 0.7;
					o.x = x + Math.cos(ang) * len * t;
					o.y = lid(x) + Math.sin(ang) * len * t;
					o.z = 0.3;
				},
			},
		],
		17
	);
}
