// Procedural architecture for the homepage: every monument is modelled from
// simple solids (boxes, lathes, extrusions) merged into one or two meshes.
// Units: a monument stands on y = 0 and fits a ~4.4-wide footprint (the
// turntable is the Konark wheel, radius ~2.3). Each builder returns
// { base, accent, height }: geometry drawn in the palette's 30 colour, a small
// amount drawn in its 10 colour, and how tall it stands.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const TAU = Math.PI * 2;

/* ───────────── helpers (y is the bottom of each solid) ───────────── */

const at = (g, x = 0, y = 0, z = 0) => g.translate(x, y, z);
const box = (w, h, d, x = 0, y = 0, z = 0) => at(new THREE.BoxGeometry(w, h, d), x, y + h / 2, z);
const cyl = (rt, rb, h, seg, x = 0, y = 0, z = 0) => at(new THREE.CylinderGeometry(rt, rb, h, seg), x, y + h / 2, z);
const lathe = (pts, seg, x = 0, y = 0, z = 0, s = 1, rot = 0) => {
	const g = new THREE.LatheGeometry(
		pts.map(([r, h]) => new THREE.Vector2(r * s, h * s)),
		seg,
	);
	if (rot) g.rotateY(rot);
	return at(g, x, y, z);
};
/** A flat shape extruded upward by `h` from y. */
const slab = (shape, h, y = 0, opts = {}) => {
	const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 48, ...opts });
	g.rotateX(-Math.PI / 2);
	return at(g, 0, y, 0);
};
function merge(list) {
	const g = mergeGeometries(list.map((x) => (x.index ? x.toNonIndexed() : x)).map(stripUv));
	return g;
}
function stripUv(g) {
	for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
	return g;
}
const rotY = (g, a) => g.rotateY(a);

/** A wall face with a pointed arch cut through it (an iwan / pishtaq). Faces +z, centred on x = 0. */
function portal(w, h, depth, holeW, holeH) {
	const s = new THREE.Shape();
	s.moveTo(-w / 2, 0);
	s.lineTo(w / 2, 0);
	s.lineTo(w / 2, h);
	s.lineTo(-w / 2, h);
	s.closePath();
	const hw = holeW / 2;
	const spring = holeH - holeW * 0.7;
	const p = new THREE.Path();
	p.moveTo(-hw, h * 0.06);
	p.lineTo(hw, h * 0.06);
	p.lineTo(hw, spring);
	p.quadraticCurveTo(hw, holeH - holeW * 0.12, 0, holeH);
	p.quadraticCurveTo(-hw, holeH - holeW * 0.12, -hw, spring);
	p.closePath();
	s.holes.push(p);
	return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
}

/** An onion dome profile (radius r at its base, total height ~1.9r). */
const onion = (r) => [
	[r * 0.92, 0],
	[r, r * 0.22],
	[r * 1.1, r * 0.55],
	[r * 1.06, r * 0.9],
	[r * 0.86, r * 1.22],
	[r * 0.55, r * 1.5],
	[r * 0.26, r * 1.68],
	[r * 0.08, r * 1.82],
	[0, r * 1.9],
];
const hemisphere = (r) => Array.from({ length: 10 }, (_, i) => [Math.cos((i / 9) * (Math.PI / 2)) * r, Math.sin((i / 9) * (Math.PI / 2)) * r]);

/* ───────────── The Konark wheel (the turntable) ───────────── */

/** Faces +z, centred on the origin, radius R. */
export function wheel(R = 2) {
	const base = [];
	const accent = [];
	const ring = new THREE.Shape();
	ring.absarc(0, 0, R, 0, TAU, false);
	const hole = new THREE.Path();
	hole.absarc(0, 0, R * 0.83, 0, TAU, true);
	ring.holes.push(hole);
	base.push(at(new THREE.ExtrudeGeometry(ring, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 96 }), 0, 0, -0.15));
	// Carved bands on both faces, and the beads between them.
	for (const z of [0.2, -0.2]) {
		base.push(at(new THREE.TorusGeometry(R * 0.915, 0.035, 8, 120), 0, 0, z));
		base.push(at(new THREE.TorusGeometry(R * 0.845, 0.025, 8, 120), 0, 0, z));
		for (let i = 0; i < 64; i += 1) {
			const a = (i / 64) * TAU;
			base.push(at(new THREE.IcosahedronGeometry(0.035, 1), Math.cos(a) * R * 0.965, Math.sin(a) * R * 0.965, z * 0.92));
		}
	}
	// Eight wide spokes, each with a carved medallion; eight thin ones between.
	const spoke = (wIn, wOut, depth) => {
		const s = new THREE.Shape();
		s.moveTo(-wIn / 2, R * 0.22);
		s.lineTo(wIn / 2, R * 0.22);
		s.lineTo(wOut / 2, R * 0.84);
		s.lineTo(-wOut / 2, R * 0.84);
		s.closePath();
		return at(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 }), 0, 0, -depth / 2);
	};
	for (let i = 0; i < 8; i += 1) {
		const a = (i / 8) * TAU;
		const big = spoke(0.24, 0.17, 0.24);
		big.rotateZ(a);
		base.push(big);
		const med = new THREE.CylinderGeometry(0.17, 0.17, 0.3, 28);
		med.rotateX(Math.PI / 2);
		med.translate(0, R * 0.53, 0);
		med.rotateZ(a);
		base.push(med);
		const thin = spoke(0.07, 0.06, 0.16);
		thin.rotateZ(a + TAU / 16);
		base.push(thin);
	}
	// Hub and axle; the axle cap is the accent.
	const hub = new THREE.CylinderGeometry(R * 0.24, R * 0.26, 0.42, 48);
	hub.rotateX(Math.PI / 2);
	base.push(hub);
	for (const z of [0.22, -0.22]) base.push(at(new THREE.TorusGeometry(R * 0.24, 0.04, 8, 48), 0, 0, z));
	const axle = new THREE.CylinderGeometry(0.13, 0.13, 0.86, 24);
	axle.rotateX(Math.PI / 2);
	base.push(axle);
	const cap = new THREE.CylinderGeometry(0.17, 0.17, 0.06, 24);
	cap.rotateX(Math.PI / 2);
	accent.push(at(cap, 0, 0, 0.44));
	return { base: merge(base), accent: merge(accent), height: R * 2 };
}

/* ───────────── Konark Sun Temple ───────────── */

function chariotWheel(r) {
	const parts = [at(new THREE.TorusGeometry(r, r * 0.13, 6, 24))];
	for (let i = 0; i < 8; i += 1) {
		const s = new THREE.BoxGeometry(r * 0.08, r * 1.9, r * 0.1);
		s.rotateZ((i / 8) * Math.PI);
		parts.push(s);
	}
	return parts;
}

export function konark() {
	const base = [];
	const accent = [];
	// The chariot platform, with twelve wheels down each side.
	base.push(box(3.9, 0.42, 2.0, 0, 0, 0));
	base.push(box(3.6, 0.08, 1.8, 0, 0.42, 0));
	for (const z of [1.02, -1.02]) {
		for (let i = 0; i < 6; i += 1) {
			for (const g of chariotWheel(0.16)) base.push(at(g, -1.5 + i * 0.6, 0.2, z));
		}
	}
	base.push(box(0.6, 0.22, 0.7, 2.15, 0, 0)); // steps
	// The jagamohana (audience hall): a cube under a three-tier pyramid roof.
	const jx = 0.75;
	base.push(box(1.45, 0.95, 1.45, jx, 0.5, 0));
	let y = 1.45;
	for (let tier = 0; tier < 3; tier += 1) {
		for (let k = 0; k < 4; k += 1) {
			const w = 1.6 - tier * 0.36 - k * 0.07;
			base.push(box(w, 0.07, w, jx, y, 0));
			y += 0.1;
		}
		y += 0.06;
	}
	base.push(cyl(0.28, 0.28, 0.12, 24, jx, y, 0));
	base.push(lathe([[0.12, 0], [0.16, 0.08], [0.1, 0.18], [0.03, 0.26], [0, 0.3]], 16, jx, y + 0.12, 0));
	accent.push(cyl(0.015, 0.015, 0.18, 6, jx, y + 0.4, 0));
	// The deul (sanctum tower), rebuilt: a curved square tower with ribs.
	const dx = -1.0;
	base.push(box(1.25, 0.95, 1.25, dx, 0.5, 0));
	const tower = [[0.82, 0], [0.8, 0.55], [0.74, 1.05], [0.62, 1.5], [0.45, 1.85], [0.26, 2.05], [0, 2.12]];
	base.push(lathe(tower, 4, dx, 1.45, 0, 1, Math.PI / 4));
	base.push(lathe(tower.map(([r, h]) => [r * 0.92, h * 1.02]), 8, dx, 1.45, 0, 1, Math.PI / 8));
	base.push(cyl(0.34, 0.34, 0.12, 28, dx, 3.6, 0));
	base.push(lathe([[0.14, 0], [0.18, 0.1], [0.1, 0.22], [0, 0.3]], 16, dx, 3.72, 0));
	accent.push(cyl(0.015, 0.015, 0.22, 6, dx, 4.0, 0));
	return { base: merge(base), accent: merge(accent), height: 4.25 };
}

/* ───────────── Taj Mahal ───────────── */

export function taj() {
	const base = [];
	const accent = [];
	base.push(box(4.3, 0.28, 4.3, 0, 0, 0));
	// The main block: a square with chamfered corners.
	const half = 1.12;
	const c = 0.36;
	const s = new THREE.Shape();
	[
		[-half + c, -half],
		[half - c, -half],
		[half, -half + c],
		[half, half - c],
		[half - c, half],
		[-half + c, half],
		[-half, half - c],
		[-half, -half + c],
	].forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z)));
	s.closePath();
	base.push(slab(s, 1.4, 0.28));
	// A great arched portal on each face, two small ones on each chamfer.
	for (let k = 0; k < 4; k += 1) {
		const big = portal(1.0, 1.32, 0.09, 0.6, 1.1);
		big.translate(0, 0.28, half);
		base.push(rotY(big, (k * Math.PI) / 2));
		for (const yy of [0.34, 0.98]) {
			const small = portal(0.44, 0.58, 0.06, 0.26, 0.48);
			small.translate(0, yy, (half - c / 2) * Math.SQRT2);
			base.push(rotY(small, (k * Math.PI) / 2 + Math.PI / 4));
		}
	}
	// Drum, onion dome, finial.
	base.push(cyl(0.6, 0.62, 0.38, 48, 0, 1.68, 0));
	base.push(lathe(onion(0.62), 48, 0, 2.06, 0));
	accent.push(cyl(0.02, 0.03, 0.26, 8, 0, 3.22, 0));
	accent.push(at(new THREE.SphereGeometry(0.05, 12, 8), 0, 3.3, 0));
	// Four chhatris on the roof.
	for (const [x, z] of [
		[0.72, 0.72],
		[-0.72, 0.72],
		[0.72, -0.72],
		[-0.72, -0.72],
	]) {
		base.push(cyl(0.17, 0.17, 0.3, 8, x, 1.68, z));
		base.push(cyl(0.21, 0.21, 0.04, 8, x, 1.98, z));
		base.push(lathe(onion(0.15), 20, x, 2.02, z));
	}
	// Four minarets with three balconies each.
	for (const [x, z] of [
		[1.92, 1.92],
		[-1.92, 1.92],
		[1.92, -1.92],
		[-1.92, -1.92],
	]) {
		base.push(cyl(0.1, 0.13, 2.3, 16, x, 0.28, z));
		for (const yy of [0.95, 1.65, 2.45]) base.push(cyl(0.17, 0.15, 0.05, 16, x, yy, z));
		base.push(cyl(0.11, 0.11, 0.18, 8, x, 2.58, z));
		base.push(lathe(onion(0.12), 16, x, 2.76, z));
	}
	return { base: merge(base), accent: merge(accent), height: 3.4 };
}

/* ───────────── Colosseum ───────────── */

const ellipseRing = (a, b, t) => {
	const s = new THREE.Shape();
	s.absellipse(0, 0, a, b, 0, TAU, false);
	const h = new THREE.Path();
	h.absellipse(0, 0, a - t, b - t, 0, TAU, true);
	s.holes.push(h);
	return s;
};

export function colosseum() {
	const base = [];
	const accent = [];
	const A = 2.1;
	const B = 1.72;
	const tier = 0.52;
	// Three arcades of piers, an entablature over each, then the solid attic.
	for (let t = 0; t < 3; t += 1) {
		const y = t * tier;
		const n = 56;
		for (let i = 0; i < n; i += 1) {
			const th = (i / n) * TAU;
			const pier = new THREE.BoxGeometry(0.11, tier - 0.08, 0.2);
			pier.rotateY(-Math.atan2(B * Math.cos(th), -A * Math.sin(th)));
			pier.translate(Math.cos(th) * A * 0.97, y + (tier - 0.08) / 2, Math.sin(th) * B * 0.97);
			base.push(pier);
		}
		base.push(slab(ellipseRing(A + 0.03, B + 0.03, 0.26), 0.08, y + tier - 0.08));
	}
	base.push(slab(ellipseRing(A + 0.02, B + 0.02, 0.18), 0.42, 3 * tier));
	base.push(slab(ellipseRing(A - 0.18, B - 0.18, 0.06), 3 * tier, 0)); // inner wall behind the arcades
	// The seating, stepping down to the arena.
	for (let k = 0; k < 5; k += 1) {
		const shrink = 0.26 + k * 0.24;
		base.push(slab(ellipseRing(A - shrink, B - shrink, 0.26), 3 * tier * (1 - k * 0.17), 0));
	}
	const arena = new THREE.Shape();
	arena.absellipse(0, 0, A - 1.4, B - 1.4, 0, TAU, false);
	accent.push(slab(arena, 0.04, 0));
	return { base: merge(base), accent: merge(accent), height: 3 * tier + 0.42 };
}

/* ───────────── Pyramids of Giza ───────────── */

function pyramid(baseW, h, x, z) {
	const g = new THREE.ConeGeometry(baseW / Math.SQRT2, h, 4, 1);
	g.rotateY(Math.PI / 4);
	return at(g, x, h / 2, z);
}

export function pyramids() {
	const base = [pyramid(2.3, 1.5, 0.35, -0.45), pyramid(1.75, 1.15, -1.15, 0.75), pyramid(0.95, 0.62, 1.35, 1.2)];
	for (let i = 0; i < 3; i += 1) base.push(pyramid(0.32, 0.2, 1.75 - i * 0.45, -1.75));
	const accent = [pyramid(0.16, 0.105, 0.35, -0.45)];
	accent[0].translate(0, 1.5 - 0.105, 0);
	return { base: merge(base), accent: merge(accent), height: 1.55, flat: true };
}

/* ───────────── Angkor Wat ───────────── */

// The lotus-bud tower: a full, rounded cob that closes to a point.
const lotus = [
	[0.3, 0],
	[0.31, 0.12],
	[0.35, 0.16],
	[0.36, 0.32],
	[0.37, 0.48],
	[0.35, 0.64],
	[0.31, 0.8],
	[0.25, 0.96],
	[0.18, 1.1],
	[0.11, 1.22],
	[0.05, 1.31],
	[0, 1.36],
];
/** Horizontal tiers carved around a lotus tower. */
function lotusRings(x, y, z, s) {
	return [0.28, 0.48, 0.68, 0.88, 1.06].map((h) => {
		const i = lotus.findIndex(([, hh]) => hh >= h);
		const r = lotus[Math.max(0, i)][0] * s + 0.012;
		const g = new THREE.TorusGeometry(r, 0.022 * s, 6, 24);
		g.rotateX(Math.PI / 2);
		return at(g, x, y + h * s, z);
	});
}

export function angkor() {
	const base = [];
	const accent = [];
	const terraces = [
		[3.7, 0.24, 3.0],
		[2.9, 0.3, 2.3],
		[2.1, 0.36, 1.65],
	];
	let y = 0;
	for (const [w, h, d] of terraces) {
		base.push(box(w, h, d, 0, y, 0));
		// Galleries: a low wall around each terrace's edge.
		base.push(box(w, 0.12, 0.06, 0, y + h, d / 2 - 0.03), box(w, 0.12, 0.06, 0, y + h, -d / 2 + 0.03));
		base.push(box(0.06, 0.12, d, w / 2 - 0.03, y + h, 0), box(0.06, 0.12, d, -w / 2 + 0.03, y + h, 0));
		y += h;
	}
	base.push(box(0.36, 0.14, 1.0, 0, 0, 1.95)); // causeway
	base.push(lathe(lotus, 24, 0, y, 0, 1.55), ...lotusRings(0, y, 0, 1.55));
	for (const [x, z] of [
		[0.78, 0.58],
		[-0.78, 0.58],
		[0.78, -0.58],
		[-0.78, -0.58],
	])
		base.push(lathe(lotus, 20, x, y, z, 1.05), ...lotusRings(x, y, z, 1.05));
	accent.push(cyl(0.015, 0.015, 0.16, 6, 0, y + 1.36 * 1.55, 0));
	return { base: merge(base), accent: merge(accent), height: y + 1.36 * 1.55 + 0.16 };
}

/* ───────────── Machu Picchu ───────────── */

function mountain() {
	// Huayna Picchu: a steep, ragged peak, faceted like rock.
	const g = new THREE.ConeGeometry(1.05, 2.7, 14, 12).toNonIndexed();
	const p = g.attributes.position;
	for (let i = 0; i < p.count; i += 1) {
		const x = p.getX(i);
		const yy = p.getY(i);
		const z = p.getZ(i);
		const h = (yy + 1.35) / 2.7;
		const a = Math.atan2(z, x);
		const n = 0.22 * Math.sin(a * 3 + h * 7) + 0.14 * Math.sin(a * 7 - h * 11) + 0.08 * Math.sin(a * 13 + h * 23);
		const k = 1 + n * (1 - h) * 0.9;
		p.setXYZ(i, x * k + Math.sin(h * 5) * 0.08, yy, z * k);
	}
	g.computeVertexNormals();
	return g;
}

export function machuPicchu() {
	const base = [];
	const accent = [];
	base.push(at(mountain(), -0.15, 1.35, -1.35));
	const second = mountain();
	second.scale(0.6, 0.5, 0.6);
	base.push(at(second, 1.0, 0.68, -1.5));
	// Curved terraces stepping up toward the peak.
	for (let k = 0; k < 7; k += 1) {
		const r = 2.55 - k * 0.27;
		const s = new THREE.Shape();
		s.absarc(0, 0, r, -0.95, 0.95, false);
		s.absarc(0, 0, r - 0.3, 0.95, -0.95, true);
		s.closePath();
		const g = slab(s, 0.12 * (k + 1), 0);
		g.rotateY(-Math.PI / 2); // open toward the viewer, centred on the peak
		g.translate(-0.15, 0, -1.35);
		base.push(g);
	}
	// A few stone houses with gabled roofs on the lower terraces.
	for (const [x, z, yy] of [
		[-0.9, 0.55, 0.24],
		[-0.35, 0.72, 0.24],
		[0.35, 0.72, 0.24],
		[0.9, 0.55, 0.24],
		[-0.6, 0.15, 0.48],
		[0.6, 0.15, 0.48],
	]) {
		base.push(box(0.26, 0.16, 0.2, x, yy, z));
		const roof = new THREE.CylinderGeometry(0.15, 0.15, 0.28, 3);
		roof.rotateZ(Math.PI / 2);
		roof.translate(x, yy + 0.22, z);
		base.push(roof);
	}
	// The Intihuatana, the "hitching post of the sun", on the top terrace.
	accent.push(box(0.1, 0.22, 0.1, -0.15, 0.84, -0.6));
	return { base: merge(base), accent: merge(accent), height: 2.75 };
}

/* ───────────── Victoria Memorial, Kolkata ───────────── */

export function victoria() {
	const base = [];
	const accent = [];
	base.push(box(4.2, 0.16, 2.3, 0, 0, 0), box(3.9, 0.1, 2.1, 0, 0.16, 0));
	base.push(box(1.45, 0.95, 1.45, 0, 0.26, 0));
	for (const x of [1.3, -1.3]) {
		base.push(box(1.15, 0.72, 1.0, x, 0.26, 0));
		base.push(box(1.22, 0.06, 1.08, x, 0.98, 0));
		for (let i = 0; i < 5; i += 1) base.push(cyl(0.035, 0.04, 0.6, 10, x - 0.44 + i * 0.22, 0.32, 0.58));
		base.push(cyl(0.14, 0.14, 0.2, 12, x, 1.04, 0));
		base.push(lathe(hemisphere(0.15), 16, x, 1.24, 0));
	}
	const pediment = new THREE.CylinderGeometry(0.3, 0.3, 0.7, 3);
	pediment.rotateZ(Math.PI / 2);
	pediment.scale(1, 0.55, 1);
	pediment.translate(0, 1.21 + 0.12, 0.62);
	base.push(pediment);
	base.push(cyl(0.52, 0.55, 0.38, 48, 0, 1.21, 0));
	base.push(lathe(hemisphere(0.54).map(([r, h]) => [r, h * 1.15]), 48, 0, 1.59, 0));
	base.push(cyl(0.1, 0.12, 0.22, 16, 0, 2.2, 0));
	base.push(lathe(hemisphere(0.12), 16, 0, 2.42, 0));
	// The Angel of Victory on the dome.
	accent.push(cyl(0.02, 0.06, 0.2, 8, 0, 2.54, 0));
	accent.push(at(new THREE.SphereGeometry(0.04, 10, 8), 0, 2.78, 0));
	return { base: merge(base), accent: merge(accent), height: 2.85 };
}

/* ───────────── Today: the phone ───────────── */

export function phone() {
	const body = new RoundedBoxGeometry(1.45, 2.9, 0.16, 4, 0.18);
	body.rotateX(-0.12);
	body.translate(0, 1.55, 0);
	const base = [body, box(0.9, 0.06, 0.5, 0, 0, 0.05)];
	// The screen shows the wheel, traced in the accent.
	const accent = [];
	const screenRing = new THREE.TorusGeometry(0.42, 0.018, 6, 64);
	screenRing.translate(0, 0, 0);
	const inner = [screenRing, new THREE.TorusGeometry(0.1, 0.015, 6, 32)];
	for (let i = 0; i < 8; i += 1) {
		const s = new THREE.BoxGeometry(0.018, 0.64, 0.018);
		s.translate(0, 0.26, 0);
		s.rotateZ((i / 8) * TAU);
		inner.push(s);
	}
	for (const g of inner) {
		g.translate(0, 0.15, 0.1);
		g.rotateX(-0.12);
		g.translate(0, 1.55, 0);
		accent.push(g);
	}
	return { base: merge(base), accent: merge(accent), height: 3.05 };
}

/* ───────────── The globe ───────────── */

export const GLOBE_R = 1.6;
const D2R = Math.PI / 180;
const onSphere = (lat, lon, r) => new THREE.Vector3(r * Math.cos(lat * D2R) * Math.sin(lon * D2R), r * Math.sin(lat * D2R), r * Math.cos(lat * D2R) * Math.cos(lon * D2R));

/** Pins at each destination and arcs to them from Bengaluru; the sphere itself is drawn by the scene with the land texture. */
export function globeMarks(destinations, home = { lat: 12.97, lon: 77.59 }) {
	const accent = [];
	const from = onSphere(home.lat, home.lon, GLOBE_R);
	for (const d of destinations) {
		const to = onSphere(d.lat, d.lon, GLOBE_R);
		const pin = new THREE.CylinderGeometry(0.025, 0.025, 0.22, 8);
		pin.translate(0, 0.11, 0);
		pin.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().normalize()));
		pin.translate(to.x, to.y, to.z);
		accent.push(pin);
		const mid = from.clone().add(to).multiplyScalar(0.5);
		mid.setLength(GLOBE_R + from.distanceTo(to) * 0.35);
		accent.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(from, mid, to), 40, 0.012, 5, false));
	}
	accent.push(at(new THREE.SphereGeometry(0.06, 12, 8), from.x, from.y, from.z));
	return merge(accent);
}

/** The land as a grey map (white land, black sea) from the baked 720×360 mask. */
export function landTexture(mask) {
	const c = document.createElement("canvas");
	c.width = 720;
	c.height = 360;
	const ctx = c.getContext("2d");
	const img = ctx.createImageData(720, 360);
	for (let i = 0; i < 720 * 360; i += 1) {
		const v = (mask[i >> 3] >> (i & 7)) & 1 ? 255 : 0;
		img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
		img.data[i * 4 + 3] = 255;
	}
	ctx.putImageData(img, 0, 0);
	const t = new THREE.CanvasTexture(c);
	t.anisotropy = 4;
	return t;
}

export const MONUMENTS = { konark, taj, colosseum, pyramids, angkor, machuPicchu, victoria, phone };
