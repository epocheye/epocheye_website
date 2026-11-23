// Packs the player, people and rides for the open world.
//   node tools/play/pack_actors.mjs <slug> [--only id,id] [--version 1] [--out <folder>]
//
// Reads the "actors" block of tools/play/worlds/<slug>.json. Read only on the source files.
// Each figure becomes one mesh, one small atlas and a few clips, so a crowd costs few draw calls.
// Anything that reads as a weapon is removed from the figure (brief 2.7).
// A figure's clips are never taken from its source GLB, which carries Meshy motion. They come only
// from the CC0 data in tools/play/assets/cc0/people/ (made by tools/play/blender/retarget_cc0.py),
// and a figure with no such data stops the run. --out packs to another folder for checking.
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Accessor, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRTextureBasisu } from "@gltf-transform/extensions";
import { meshopt, prune, resample, simplify, weld } from "@gltf-transform/functions";
import { encodeToKTX2 } from "ktx2-encoder";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const WEAPON = /spear|steel|sword|shield|gun|dagger|blade|musket|katar|talwar|pistol/i;
const TINY = /eyelash|eyebrow|teeth|tongue|shadow_blob/i;
// Small bones whose motion cannot be seen at game distance. Their tracks are dropped to save bytes.
// "ear" is anchored to a whole name segment, so it cannot match DEF-forearm.
const FINE_BONE = /finger|thumb|toe|metacarpal|eye|jaw|tongue|lip|cheek|brow|nose|(?:^|[-_.])ear(?:lobe)?(?:[-_.]|$)|oris|levator|temporalis|risorius|platysma|masseter|f_(index|middle|ring|pinky)/i;
// Clips that must never ship, even though the source library contains them.
const BANNED_CLIP = /pistol|punch|sword|spell|death|hit_|shoot|attack/i;
// The only clips a townsperson ships with, and the only place they may come from.
const FIGURE_CLIPS = ["walk", "idle", "talk"];
const MOTION_DIR = "tools/play/assets/cc0/people";
const MOTION_LICENSE = "CC0-1.0";

const [slug] = process.argv.slice(2);
if (!slug) {
	console.error("Usage: node tools/play/pack_actors.mjs <slug> [--only id,id] [--version 1] [--out <folder>]");
	process.exit(1);
}
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const only = arg("--only", "") ? new Set(arg("--only").split(",")) : null;
const cfg = JSON.parse(await readFile(`tools/play/worlds/${slug}.json`, "utf8"));
const OUT = arg("--out") || path.join("public/play/worlds", slug, `v${arg("--version", "1")}`, "actors");
await mkdir(OUT, { recursive: true });
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
MeshoptSimplifier.useExperimentalFeatures = true; // simplifyWithAttributes holds the seams between body zones

const imageDecoder = async (buffer) => {
	const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	return { data: new Uint8Array(data), width: info.width, height: info.height };
};
const KTX = { isUASTC: false, qualityLevel: 150, compressionLevel: 2, isPerceptual: true, isSetKTX2SRGBTransferFunc: true, generateMipmap: true, imageDecoder };
const io = () =>
	new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

async function ktxTexture(doc, png, name) {
	doc.createExtension(KHRTextureBasisu).setRequired(true);
	const out = await encodeToKTX2(new Uint8Array(png), KTX);
	return doc.createTexture(name).setMimeType("image/ktx2").setImage(new Uint8Array(out));
}

// Baked cloth is drawn on a black sheet. Scaled down as it is, that black bleeds into every thin strip,
// so the black is masked out, the image is scaled, and the cloth's colour is grown outward over it.
async function bleedBakedImage(image, cell) {
	const { data, info } = await sharp(Buffer.from(image)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
	const rgba = Buffer.alloc(info.width * info.height * 4);
	for (let i = 0; i < info.width * info.height; i++) {
		const [r, g, b] = [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
		rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = r + g + b > 12 ? 255 : 0;
	}
	const small = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).resize(cell, cell, { fit: "fill" }).raw().toBuffer();
	const filled = new Uint8Array(cell * cell);
	let open = 0;
	for (let i = 0; i < cell * cell; i++) {
		filled[i] = small[i * 4 + 3] >= 128 ? 1 : 0;
		if (!filled[i]) open++;
	}
	for (let pass = 0; open && pass < cell; pass++) {
		const grown = [];
		for (let y = 0; y < cell; y++) {
			for (let x = 0; x < cell; x++) {
				if (filled[y * cell + x]) continue;
				let n = 0, r = 0, g = 0, b = 0;
				for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
					const u = x + dx, v = y + dy;
					if (u < 0 || v < 0 || u >= cell || v >= cell || !filled[v * cell + u]) continue;
					const k = (v * cell + u) * 4;
					r += small[k]; g += small[k + 1]; b += small[k + 2]; n++;
				}
				if (n) grown.push([y * cell + x, r / n, g / n, b / n]);
			}
		}
		if (!grown.length) break;
		for (const [i, r, g, b] of grown) {
			small[i * 4] = r; small[i * 4 + 1] = g; small[i * 4 + 2] = b;
			filled[i] = 1;
			open--;
		}
	}
	const rgb = Buffer.alloc(cell * cell * 3);
	for (let i = 0; i < cell * cell; i++) {
		rgb[i * 3] = small[i * 4]; rgb[i * 3 + 1] = small[i * 4 + 1]; rgb[i * 3 + 2] = small[i * 4 + 2];
	}
	return sharp(rgb, { raw: { width: cell, height: cell, channels: 3 } });
}

// Lays every material's image into one square atlas and returns where each one went.
async function buildAtlas(mats, size) {
	const base = mats.map((m) => {
		const tex = m.getBaseColorTexture();
		const body = /body|skin/i.test(m.getName());
		return { m, tex, f: m.getBaseColorFactor(), want: tex ? (body ? size / 2 : size / 4) : 16 };
	});
	// Shelf-pack, shrinking the textured cells until everything fits.
	const fits = (k) => {
		let x = 0, y = 0, row = 0;
		for (const it of [...base].sort((a, b) => b.want - a.want)) {
			const c = it.tex ? Math.max(24, Math.floor(it.want * k)) : 16;
			if (x + c > size) { x = 0; y += row; row = 0; }
			if (y + c > size) return false;
			x += c; row = Math.max(row, c);
		}
		return true;
	};
	let k = 1;
	while (!fits(k)) {
		k *= 0.92;
		if (k < 0.1) throw new Error("Atlas cannot fit");
	}
	const items = base.map((it) => ({ ...it, cell: it.tex ? Math.max(24, Math.floor(it.want * k)) : 16 }));
	items.sort((a, b) => b.cell - a.cell);
	let x = 0, y = 0, row = 0;
	const layers = [];
	const where = new Map();
	for (const it of items) {
		if (x + it.cell > size) {
			x = 0; y += row; row = 0;
		}
		const pad = it.cell > 16 ? 2 : 1;
		const inner = it.cell - pad * 2;
		const tint = { r: Math.round(it.f[0] ** (1 / 2.2) * 255), g: Math.round(it.f[1] ** (1 / 2.2) * 255), b: Math.round(it.f[2] ** (1 / 2.2) * 255) };
		const baked = /_baked$/i.test(it.m.getName());
		const scaled = it.tex && (baked ? await bleedBakedImage(it.tex.getImage(), it.cell) : sharp(Buffer.from(it.tex.getImage())).removeAlpha().resize(it.cell, it.cell, { fit: "fill" }));
		const input = it.tex
			? await scaled.linear([tint.r / 255, tint.g / 255, tint.b / 255], [0, 0, 0]).png().toBuffer()
			: await sharp({ create: { width: it.cell, height: it.cell, channels: 3, background: tint } }).png().toBuffer();
		layers.push({ input, left: x, top: y });
		where.set(it.m, { u: (x + pad) / size, v: (y + pad) / size, w: inner / size, h: inner / size });
		x += it.cell;
		row = Math.max(row, it.cell);
	}
	const png = await sharp({ create: { width: size, height: size, channels: 3, background: { r: 90, g: 80, b: 70 } } }).composite(layers).png().toBuffer();
	return { png, where };
}

function readPrim(prim, rect, rigid = null) {
	const pos = prim.getAttribute("POSITION");
	const n = pos.getCount();
	const nor = prim.getAttribute("NORMAL");
	const uv = prim.getAttribute("TEXCOORD_0");
	const j = prim.getAttribute("JOINTS_0");
	const w = prim.getAttribute("WEIGHTS_0");
	const out = { n, pos: [], nor: [], uv: [], j: [], w: [] };
	const a = [0, 0, 0, 0];
	for (let i = 0; i < n; i++) {
		const pv = pos.getElement(i, a).slice(0, 3);
		const nv = nor ? nor.getElement(i, a).slice(0, 3) : [0, 1, 0];
		if (rigid) {
			const M = rigid.matrix;
			out.pos.push(M[0] * pv[0] + M[4] * pv[1] + M[8] * pv[2] + M[12], M[1] * pv[0] + M[5] * pv[1] + M[9] * pv[2] + M[13], M[2] * pv[0] + M[6] * pv[1] + M[10] * pv[2] + M[14]);
			const nx = M[0] * nv[0] + M[4] * nv[1] + M[8] * nv[2], ny = M[1] * nv[0] + M[5] * nv[1] + M[9] * nv[2], nz = M[2] * nv[0] + M[6] * nv[1] + M[10] * nv[2];
			const len = Math.hypot(nx, ny, nz) || 1;
			out.nor.push(nx / len, ny / len, nz / len);
		} else {
			out.pos.push(...pv);
			out.nor.push(...nv);
		}
		const t = uv ? uv.getElement(i, [0, 0]) : [0.5, 0.5];
		const cu = Math.min(1, Math.max(0, t[0])), cv = Math.min(1, Math.max(0, t[1]));
		out.uv.push(rect.u + cu * rect.w, rect.v + cv * rect.h);
		out.j.push(...(rigid ? [rigid.joint, 0, 0, 0] : j.getElement(i, [0, 0, 0, 0])));
		out.w.push(...(rigid ? [1, 0, 0, 0] : w.getElement(i, [0, 0, 0, 0])));
	}
	const idx = prim.getIndices();
	out.idx = idx ? Array.from(idx.getArray()) : Array.from({ length: n }, (_, k) => k);
	return out;
}

// A figure is built part by part so each one stays whole:
//   1. Cloth is modelled as a closed thin shell. Only its outer sheet is kept, because a simplifier
//      collapses two walls a few millimetres apart into shards.
//   2. Skin is removed only where cloth covers it at rest or in every sampled pose, and an under-layer
//      of cloth only where it is enclosed in every pose. Head, neck, hands, forearms and feet stay.
//   3. Each part, and each zone of the body, is simplified on its own budget.
//   4. Where the inside of a garment can be seen, a back-facing copy is added, because the game draws
//      front faces only.
const ZONES = [[/^(head|neck)/, "head"], [/^wrist/, "hand"], [/^lowerarm/, "forearm"], [/^(foot|toe)/, "foot"], [/^lowerleg/, "shin"], [/^upperleg02/, "thigh"], [/^(upperleg01|pelvis)/, "hip"], [/^(upperarm|shoulder|clavicle)/, "upperarm"]];
const NEVER_CULLED = new Set(["head", "hand", "forearm", "foot"]);
const BODY_BUDGET = { head: 1300, hand: 700, forearm: 260, foot: 260, shin: 240, thigh: 120, hip: 90, upperarm: 300, torso: 520 };
const LEG_ZONES = new Set(["thigh", "shin"]);
const POKE_LEG = 0.03; // A leg in stride presses further into a hanging skirt than a shoulder into a shirt.
const PART_BUDGET = { eye: 120, hair: 700, turban: 90, jewel: 28, cloth: 2100 };
// Where a player's camera can stand: all round, from a little below a figure's level to almost above it.
const VIEW_DIRS = [];
for (const [deg, count] of [[-25, 10], [0, 12], [25, 12], [50, 8], [80, 4]]) {
	const el = (deg * Math.PI) / 180;
	for (let k = 0; k < count; k++) {
		const az = ((k + (deg % 50 ? 0.5 : 0)) / count) * Math.PI * 2;
		VIEW_DIRS.push([Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)]);
	}
}
const SIGHT = 0.7; // Metres a sight line is followed. Beyond this it has left the figure.
// Skin this close in front of cloth is poking through it. Kept tight: a garment can also run deep
// inside the body, and skin over such a stretch must stay or the figure shows a hole.
const POKE = 0.01;
const COVER = 0.06; // Skin with cloth this close along its normal, at rest, is under that cloth.
const COVER_LEG = 0.22; // A skirt hangs well clear of the shin. It follows the leg, so what it covers stays covered.
const HEM_MARGIN = 0.05; // Skin this near a garment's edge stays, because the edge moves as they walk.
const RAISE = 0.05; // How far a garment may be lifted to clear a body that stands through it.
const TUCK = 0.03; // How far an under-layer may stick out through the cloth over it and be tucked back.

function buildBvh(P, tris) {
	const m = tris.length / 3;
	const order = Int32Array.from({ length: m }, (_, i) => i);
	const box = new Float32Array(m * 6), mid = new Float32Array(m * 3);
	for (let t = 0; t < m; t++) {
		for (let ax = 0; ax < 3; ax++) {
			const a = P[tris[t * 3] * 3 + ax], b = P[tris[t * 3 + 1] * 3 + ax], c = P[tris[t * 3 + 2] * 3 + ax];
			box[t * 6 + ax] = Math.min(a, b, c);
			box[t * 6 + 3 + ax] = Math.max(a, b, c);
			mid[t * 3 + ax] = (a + b + c) / 3;
		}
	}
	const cap = Math.max(2, m * 2);
	const bounds = new Float32Array(cap * 6), right = new Int32Array(cap), first = new Int32Array(cap), count = new Int32Array(cap);
	let nodes = 0;
	const build = (start, n) => {
		const id = nodes++;
		const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], cl = [Infinity, Infinity, Infinity], ch = [-Infinity, -Infinity, -Infinity];
		for (let i = start; i < start + n; i++) {
			const t = order[i];
			for (let ax = 0; ax < 3; ax++) {
				lo[ax] = Math.min(lo[ax], box[t * 6 + ax]); hi[ax] = Math.max(hi[ax], box[t * 6 + 3 + ax]);
				cl[ax] = Math.min(cl[ax], mid[t * 3 + ax]); ch[ax] = Math.max(ch[ax], mid[t * 3 + ax]);
			}
		}
		bounds.set([...lo, ...hi], id * 6);
		if (n <= 4) {
			first[id] = start; count[id] = n;
			return id;
		}
		const ax = ch[0] - cl[0] >= ch[1] - cl[1] && ch[0] - cl[0] >= ch[2] - cl[2] ? 0 : ch[1] - cl[1] >= ch[2] - cl[2] ? 1 : 2;
		const split = (cl[ax] + ch[ax]) / 2;
		let i = start, j = start + n - 1;
		while (i <= j) {
			if (mid[order[i] * 3 + ax] < split) i++;
			else { const x = order[i]; order[i] = order[j]; order[j] = x; j--; }
		}
		let left = i - start;
		if (left === 0 || left === n) left = n >> 1;
		build(start, left);
		right[id] = build(start + left, n - left);
		return id;
	};
	if (m) build(0, m);
	return { P, tris, order, bounds, right, first, count, empty: !m };
}

const bvhStack = new Int32Array(128);
const anyHit = (b, ox, oy, oz, dx, dy, dz, tMax) => traceRay(b, ox, oy, oz, dx, dy, dz, tMax, true) < tMax;
const nearestHit = (b, ox, oy, oz, dx, dy, dz, tMax) => traceRay(b, ox, oy, oz, dx, dy, dz, tMax, false);
// Only surfaces met from behind, that is, from inside the body they belong to.
const nearestExit = (b, ox, oy, oz, dx, dy, dz, tMax) => traceRay(b, ox, oy, oz, dx, dy, dz, tMax, false, true);
// Distance to a surface along the ray, or tMax if there is none in reach.
function traceRay(b, ox, oy, oz, dx, dy, dz, tMax, stopAtFirst, exitsOnly = false) {
	if (b.empty) return tMax;
	const { P, tris, order, bounds, right, first, count } = b;
	const ix = 1 / (Math.abs(dx) < 1e-9 ? 1e-9 : dx), iy = 1 / (Math.abs(dy) < 1e-9 ? 1e-9 : dy), iz = 1 / (Math.abs(dz) < 1e-9 ? 1e-9 : dz);
	let sp = 0;
	bvhStack[sp++] = 0;
	while (sp) {
		const id = bvhStack[--sp], k = id * 6;
		const x0 = (bounds[k] - ox) * ix, x1 = (bounds[k + 3] - ox) * ix, y0 = (bounds[k + 1] - oy) * iy, y1 = (bounds[k + 4] - oy) * iy, z0 = (bounds[k + 2] - oz) * iz, z1 = (bounds[k + 5] - oz) * iz;
		const near = Math.max(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), far = Math.min(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1));
		if (far < 0 || near > far || near > tMax) continue;
		if (count[id]) {
			for (let i = first[id]; i < first[id] + count[id]; i++) {
				const t = order[i] * 3, a = tris[t] * 3, c = tris[t + 1] * 3, e = tris[t + 2] * 3;
				const ux = P[c] - P[a], uy = P[c + 1] - P[a + 1], uz = P[c + 2] - P[a + 2];
				const vx = P[e] - P[a], vy = P[e + 1] - P[a + 1], vz = P[e + 2] - P[a + 2];
				const px = dy * vz - dz * vy, py = dz * vx - dx * vz, pz = dx * vy - dy * vx;
				const det = ux * px + uy * py + uz * pz;
				if (Math.abs(det) < 1e-12 || (exitsOnly && det > 0)) continue;
				const sx = ox - P[a], sy = oy - P[a + 1], sz = oz - P[a + 2];
				const u = (sx * px + sy * py + sz * pz) / det;
				if (u < 0 || u > 1) continue;
				const qx = sy * uz - sz * uy, qy = sz * ux - sx * uz, qz = sx * uy - sy * ux;
				const v = (dx * qx + dy * qy + dz * qz) / det;
				if (v < 0 || u + v > 1) continue;
				const hit = (vx * qx + vy * qy + vz * qz) / det;
				if (hit > 1e-4 && hit < tMax) {
					if (stopAtFirst) return hit;
					tMax = hit;
				}
			}
		} else {
			bvhStack[sp++] = id + 1;
			bvhStack[sp++] = right[id];
		}
	}
	return tMax;
}

const mat4Mul = (a, b, out, o) => {
	for (let c = 0; c < 4; c++) {
		const x = b[c * 4], y = b[c * 4 + 1], z = b[c * 4 + 2], w = b[c * 4 + 3];
		for (let r = 0; r < 4; r++) out[o + c * 4 + r] = a[r] * x + a[4 + r] * y + a[8 + r] * z + a[12 + r] * w;
	}
};
const mat4Trs = (t, q, s) => {
	const [x, y, z, w] = q;
	return [
		(1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0,
		2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0,
		2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0,
		t[0], t[1], t[2], 1,
	];
};

// Skinning matrices for a frame of a CC0 clip, so a figure can be tested in the poses it really takes.
function makePoser(skin, motion) {
	const joints = skin.listJoints();
	const index = new Map(joints.map((j, i) => [j, i]));
	const byName = new Map(joints.map((j, i) => [j.getName(), i]));
	const ibm = skin.getInverseBindMatrices().getArray();
	const parent = joints.map((j) => { const p = j.getParentNode(); return p && index.has(p) ? index.get(p) : -1; });
	const base = joints.map((j, i) => (parent[i] < 0 && j.getParentNode() ? j.getParentNode().getWorldMatrix() : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
	const order = [], seen = new Set();
	const visit = (i) => {
		if (seen.has(i)) return;
		if (parent[i] >= 0) visit(parent[i]);
		seen.add(i); order.push(i);
	};
	joints.forEach((_, i) => visit(i));
	return (clipName, frame) => {
		const clip = motion.clips[clipName];
		const local = joints.map((j) => ({ t: j.getTranslation(), r: j.getRotation(), s: j.getScale() }));
		for (const tr of clip.tracks) {
			const i = byName.get(tr.joint);
			const k = tr.path === "rotation" ? 4 : 3;
			const v = tr.values.slice(frame * k, frame * k + k);
			if (tr.path === "rotation") local[i].r = v; else local[i].t = v;
		}
		const world = new Float64Array(joints.length * 16), out = new Float32Array(joints.length * 16), tmp = new Float64Array(16);
		for (const i of order) {
			const m = mat4Trs(local[i].t, local[i].r, local[i].s);
			mat4Mul(parent[i] >= 0 ? world.subarray(parent[i] * 16, parent[i] * 16 + 16) : base[i], m, world, i * 16);
			mat4Mul(world.subarray(i * 16, i * 16 + 16), ibm.subarray(i * 16, i * 16 + 16), tmp, 0);
			out.set(tmp, i * 16);
		}
		return out;
	};
}

// One part in one pose. With no matrices the part is in its bind pose.
function posePart(q, M) {
	if (!M) return { P: q.pos, N: q.nor };
	const P = new Float32Array(q.n * 3), N = new Float32Array(q.n * 3);
	for (let v = 0; v < q.n; v++) {
		const x = q.pos[v * 3], y = q.pos[v * 3 + 1], z = q.pos[v * 3 + 2], a = q.nor[v * 3], b = q.nor[v * 3 + 1], c = q.nor[v * 3 + 2];
		let sum = 0, nx = 0, ny = 0, nz = 0, px = 0, py = 0, pz = 0;
		for (let k = 0; k < 4; k++) {
			const w = q.w[v * 4 + k];
			if (!w) continue;
			const m = q.j[v * 4 + k] * 16;
			sum += w;
			px += w * (M[m] * x + M[m + 4] * y + M[m + 8] * z + M[m + 12]);
			py += w * (M[m + 1] * x + M[m + 5] * y + M[m + 9] * z + M[m + 13]);
			pz += w * (M[m + 2] * x + M[m + 6] * y + M[m + 10] * z + M[m + 14]);
			nx += w * (M[m] * a + M[m + 4] * b + M[m + 8] * c);
			ny += w * (M[m + 1] * a + M[m + 5] * b + M[m + 9] * c);
			nz += w * (M[m + 2] * a + M[m + 6] * b + M[m + 10] * c);
		}
		const s = sum || 1, l = Math.hypot(nx, ny, nz) || 1;
		P[v * 3] = px / s; P[v * 3 + 1] = py / s; P[v * 3 + 2] = pz / s;
		N[v * 3] = nx / l; N[v * 3 + 1] = ny / l; N[v * 3 + 2] = nz / l;
	}
	return { P, N };
}

// Vertices at one spot share an id, so UV seams do not count as open edges.
function weldIds(q) {
	const seen = new Map(), id = new Int32Array(q.n);
	for (let v = 0; v < q.n; v++) {
		const key = `${Math.round(q.pos[v * 3] * 1e5)},${Math.round(q.pos[v * 3 + 1] * 1e5)},${Math.round(q.pos[v * 3 + 2] * 1e5)}`;
		if (!seen.has(key)) seen.set(key, v);
		id[v] = seen.get(key);
	}
	return id;
}

// The costume builder solidifies each garment 3 mm thick, so its first half of vertices is one wall,
// its second half the other, and a triangle using both is the rim. The wall with the body behind it
// is the outside. Returns false, leaving the part whole, if a part is not built that way.
function keepOuterSheet(q, skinBvh) {
	if (q.n % 2) return false;
	const half = q.n / 2, walls = [[], []];
	let rim = 0;
	for (let t = 0; t < q.idx.length; t += 3) {
		const low = (q.idx[t] < half) + (q.idx[t + 1] < half) + (q.idx[t + 2] < half);
		if (low === 3) walls[0].push(q.idx[t], q.idx[t + 1], q.idx[t + 2]);
		else if (low === 0) walls[1].push(q.idx[t], q.idx[t + 1], q.idx[t + 2]);
		else rim++;
	}
	if (rim > q.idx.length / 3 / 4 || Math.min(walls[0].length, walls[1].length) < q.idx.length / 4) return false;
	const facesOut = (wall) => {
		let score = 0;
		for (let t = 0; t < wall.length; t += 3) {
			const [a, b, c] = [wall[t] * 3, wall[t + 1] * 3, wall[t + 2] * 3];
			const ux = q.pos[b] - q.pos[a], uy = q.pos[b + 1] - q.pos[a + 1], uz = q.pos[b + 2] - q.pos[a + 2];
			const vx = q.pos[c] - q.pos[a], vy = q.pos[c + 1] - q.pos[a + 1], vz = q.pos[c + 2] - q.pos[a + 2];
			let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
			const l = Math.hypot(nx, ny, nz) || 1;
			nx /= l; ny /= l; nz /= l;
			const cx = (q.pos[a] + q.pos[b] + q.pos[c]) / 3, cy = (q.pos[a + 1] + q.pos[b + 1] + q.pos[c + 1]) / 3, cz = (q.pos[a + 2] + q.pos[b + 2] + q.pos[c + 2]) / 3;
			if (anyHit(skinBvh, cx - nx * 0.001, cy - ny * 0.001, cz - nz * 0.001, -nx, -ny, -nz, 0.4)) score++;
			if (anyHit(skinBvh, cx + nx * 0.001, cy + ny * 0.001, cz + nz * 0.001, nx, ny, nz, 0.4)) score--;
		}
		return score;
	};
	q.idx = facesOut(walls[0]) >= facesOut(walls[1]) ? walls[0] : walls[1];
	q.sheet = true;
	return true;
}

// Which garment lies over which, from how often each one's outward normal runs into the other.
function layerGarments(parts) {
	const cloth = parts.filter((q) => q.role === "cloth");
	const bvh = new Map(cloth.map((q) => [q, buildBvh(q.pos, q.idx)]));
	const under = (a, b) => {
		let hit = 0, tested = 0;
		const used = [...new Set(a.idx)];
		for (let i = 0; i < used.length; i += 3) {
			const v = used[i];
			const nx = a.nor[v * 3], ny = a.nor[v * 3 + 1], nz = a.nor[v * 3 + 2];
			tested++;
			if (anyHit(bvh.get(b), a.pos[v * 3] + nx * 0.001, a.pos[v * 3 + 1] + ny * 0.001, a.pos[v * 3 + 2] + nz * 0.001, nx, ny, nz, 0.05)) hit++;
		}
		return hit / (tested || 1);
	};
	for (const a of cloth) a.over = [];
	for (let i = 0; i < cloth.length; i++) {
		for (let k = i + 1; k < cloth.length; k++) {
			const ab = under(cloth[i], cloth[k]), ba = under(cloth[k], cloth[i]);
			if (Math.max(ab, ba) < 0.03 || Math.abs(ab - ba) < 0.02) continue;
			(ab > ba ? cloth[i] : cloth[k]).over.push(ab > ba ? cloth[k] : cloth[i]);
		}
	}
}

// True when no camera can see this point past the occluders, or it is poking just through one.
function enclosed(occluders, x, y, z, nx, ny, nz, poke) {
	const ox = x + nx * 0.003, oy = y + ny * 0.003, oz = z + nz * 0.003;
	if (poke) for (const b of occluders) if (anyHit(b, ox, oy, oz, -nx, -ny, -nz, poke)) return true;
	for (const d of VIEW_DIRS) {
		if (d[0] * nx + d[1] * ny + d[2] * nz < 0.05) continue;
		let blocked = false;
		for (const b of occluders) {
			if (anyHit(b, ox, oy, oz, d[0], d[1], d[2], SIGHT)) { blocked = true; break; }
		}
		if (!blocked) return false;
	}
	return true;
}

function samplePoses(poser, motion) {
	const walk = motion.clips.walk.frames - 1, talk = motion.clips.talk.frames - 1;
	const list = [null];
	for (let k = 0; k < 6; k++) list.push(poser("walk", Math.round((walk * k) / 6)));
	list.push(poser("idle", 0), poser("talk", Math.round(talk / 3)), poser("talk", Math.round((talk * 2) / 3)));
	return list;
}

// Removes what is enclosed in every pose. Protected zones stay, and are eased in under their cover
// so a sleeve simplified a little flatter cannot show the arm through it.
function cullEnclosed(parts, poses, zones) {
	const cloth = parts.filter((q) => q.role === "cloth");
	const list = parts.filter((q) => q.role === "skin" || (q.role === "cloth" && q.over?.length));
	for (const q of list) {
		q.hidden = new Uint8Array(q.n).fill(1);
		const used = new Uint8Array(q.n);
		for (const v of q.idx) used[v] = 1;
		for (let v = 0; v < q.n; v++) if (!used[v]) q.hidden[v] = 0;
	}
	const body = parts.find((q) => q.role === "skin");
	const bodyZone = vertexZones(body, zones);
	for (const M of poses) {
		const posed = new Map(parts.map((q) => [q, posePart(q, M)]));
		const bvhOf = new Map(cloth.map((q) => [q, buildBvh(posed.get(q).P, q.idx)]));
		for (const q of list) {
			const occluders = (q.role === "skin" ? cloth : q.over).map((o) => bvhOf.get(o));
			const { P, N } = posed.get(q);
			for (let v = 0; v < q.n; v++) {
				if (!q.hidden[v]) continue;
				if (!enclosed(occluders, P[v * 3], P[v * 3 + 1], P[v * 3 + 2], N[v * 3], N[v * 3 + 1], N[v * 3 + 2], q.role !== "skin" ? 0 : LEG_ZONES.has(bodyZone[v]) ? POKE_LEG : POKE)) q.hidden[v] = 0;
			}
			if (q.role === "cloth") {
				q.tuck ??= new Float32Array(q.n);
				for (let v = 0; v < q.n; v++) {
					if (q.hidden[v]) continue;
					const nx = N[v * 3], ny = N[v * 3 + 1], nz = N[v * 3 + 2];
					for (const b of occluders) {
						const d = nearestHit(b, P[v * 3] + nx * 0.002, P[v * 3 + 1] + ny * 0.002, P[v * 3 + 2] + nz * 0.002, -nx, -ny, -nz, TUCK);
						if (d < TUCK) q.tuck[v] = Math.max(q.tuck[v], d + 0.004);
					}
				}
			}
		}
	}
	markCoveredAtRest(body, bodyZone, cloth);
	for (const q of list) {
		const isSkin = q.role === "skin";
		const zone = isSkin ? bodyZone : null;
		const keepsVertex = (v) => !q.hidden[v] || (isSkin && (NEVER_CULLED.has(zone[v]) || body.nearHem[v]));
		const kept = [];
		for (let t = 0; t < q.idx.length; t += 3) {
			const [a, b, c] = [q.idx[t], q.idx[t + 1], q.idx[t + 2]];
			if (keepsVertex(a) || keepsVertex(b) || keepsVertex(c)) kept.push(a, b, c);
		}
		q.idx = kept;
		dropCrumbs(q, isSkin ? 60 : 24, isSkin ? (v) => NEVER_CULLED.has(zone[v]) : () => false);
		if (isSkin) easeUnderCover(q, zone);
		else if (q.tuck) tuckUnder(q);
	}
}

// A skirt or dhoti is one tube around both legs, but it was weighted to whichever leg is nearest, so in
// a stride it tears along the middle. It is rebound from its shape instead: held by the pelvis at the
// hip, by the thighs at the knee and the shins below it. Each side follows its own leg, so the legs stay
// inside, and the weight crosses smoothly between them, so the cloth stretches there and cannot tear.
function hangFromBothThighs(q, joints) {
	const names = joints.map((j) => j.getName());
	const at = (n) => names.indexOf(n);
	const [hipL, hipR, kneeL, kneeR, root] = [at("upperleg01.L"), at("upperleg01.R"), at("lowerleg01.L"), at("lowerleg01.R"), at("root")];
	if ([hipL, hipR, kneeL, kneeR, root].includes(-1)) return false;
	const sideOf = names.map((n) => (/^(upperleg|lowerleg|foot|toe)/.test(n) ? (n.endsWith(".L") ? 0 : n.endsWith(".R") ? 1 : -1) : -1));
	const reach = [0, 0];
	for (let v = 0; v < q.n; v++) {
		const sum = [0, 0];
		for (let k = 0; k < 4; k++) {
			const side = sideOf[q.j[v * 4 + k]];
			if (side >= 0) sum[side] += q.w[v * 4 + k];
		}
		for (const side of [0, 1]) if (sum[side] > 0.3) reach[side]++;
	}
	if (Math.min(reach[0], reach[1]) < q.n * 0.2) return false;
	const L = joints[hipL].getWorldTranslation(), R = joints[hipR].getWorldTranslation(), K = joints[kneeL].getWorldTranslation();
	const midX = (L[0] + R[0]) / 2, halfWidth = Math.abs(L[0] - R[0]) / 2 || 0.1, drop = L[1] - K[1] || 0.4, toLeft = Math.sign(L[0] - R[0]) || 1;
	const smooth = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
	for (let v = 0; v < q.n; v++) {
		const y = q.pos[v * 3 + 1];
		const legs = smooth((L[1] - y) / drop), shin = smooth((K[1] - y) / (drop * 0.5));
		const left = smooth((toLeft * (q.pos[v * 3] - midX) / halfWidth + 0.7) / 1.4);
		if (shin > 0) {
			q.j.set([hipL, kneeL, hipR, kneeR], v * 4);
			q.w.set([left * (1 - shin), left * shin, (1 - left) * (1 - shin), (1 - left) * shin], v * 4);
		} else {
			q.j.set([hipL, hipR, root, 0], v * 4);
			q.w.set([legs * left, legs * (1 - left), 1 - legs, 0], v * 4);
		}
	}
	return true;
}

// In the rest pose a hip or shoulder can stand proud of a garment. The cloth is lifted over it, so the
// figure keeps its skin or its cloth at that spot and never a hole. Arms and hands pass in front of
// clothes legitimately, so only the trunk and legs count, and only where the ray leaves the body: cloth
// inside a hip meets the skin from behind, while cloth beside an arm meets the arm's front.
function raiseOverBody(parts, body, zones) {
	const zone = vertexZones(body, zones);
	const trunk = new Set(["torso", "hip", "thigh", "shin", "upperarm"]);
	const tris = [];
	for (let t = 0; t < body.idx.length; t += 3) {
		if ([body.idx[t], body.idx[t + 1], body.idx[t + 2]].every((v) => trunk.has(zone[v]))) tris.push(body.idx[t], body.idx[t + 1], body.idx[t + 2]);
	}
	const bvh = buildBvh(body.pos, tris);
	for (const q of parts) {
		if (q.role !== "cloth") continue;
		const lift = new Float32Array(q.n);
		const used = new Set(q.idx);
		for (const v of used) {
			const nx = q.nor[v * 3], ny = q.nor[v * 3 + 1], nz = q.nor[v * 3 + 2];
			const d = nearestExit(bvh, q.pos[v * 3] + nx * 0.001, q.pos[v * 3 + 1] + ny * 0.001, q.pos[v * 3 + 2] + nz * 0.001, nx, ny, nz, RAISE);
			if (d < RAISE) lift[v] = d + 0.005;
		}
		shiftAlongNormal(q, lift, 1);
	}
}

// Moves an under-layer back behind the cloth it pokes through.
const tuckUnder = (q) => shiftAlongNormal(q, q.tuck, -1);

// Neighbours follow a moved vertex at a falling rate, so no step shows.
function shiftAlongNormal(q, wanted, sign) {
	const id = weldIds(q);
	let amount = Float32Array.from(wanted);
	for (let v = 0; v < q.n; v++) amount[id[v]] = Math.max(amount[id[v]], amount[v]);
	for (let pass = 0; pass < 3; pass++) {
		const next = amount.slice();
		for (let t = 0; t < q.idx.length; t += 3) {
			const tri = [id[q.idx[t]], id[q.idx[t + 1]], id[q.idx[t + 2]]];
			const top = Math.max(amount[tri[0]], amount[tri[1]], amount[tri[2]]) * 0.6;
			for (const v of tri) next[v] = Math.max(next[v], top);
		}
		amount = next;
	}
	for (let v = 0; v < q.n; v++) {
		const m = amount[id[v]];
		if (!m) continue;
		q.pos[v * 3] += sign * q.nor[v * 3] * m; q.pos[v * 3 + 1] += sign * q.nor[v * 3 + 1] * m; q.pos[v * 3 + 2] += sign * q.nor[v * 3 + 2] * m;
	}
}

// A limb swinging through a skirt looks exposed in the poses where it pokes out, so the all-poses test
// alone keeps it. At rest the question is simple: is there cloth just over this skin, or just under it?
// Skin close to a garment's open edge is left in place, so a moving hem never uncovers a gap.
function markCoveredAtRest(body, zone, cloth) {
	const CELL = HEM_MARGIN;
	const cellOf = (x, y, z) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
	const garments = cloth.map((q) => {
		const id = weldIds(q), seen = new Map(), edges = new Map();
		for (let t = 0; t < q.idx.length; t += 3) {
			for (let e = 0; e < 3; e++) {
				const a = id[q.idx[t + e]], b = id[q.idx[t + ((e + 1) % 3)]];
				const k = a < b ? a * q.n + b : b * q.n + a;
				seen.set(k, (seen.get(k) || 0) + 1);
			}
		}
		for (const [k, count] of seen) {
			if (count !== 1) continue;
			for (const v of [Math.floor(k / q.n), k % q.n]) {
				const c = cellOf(q.pos[v * 3], q.pos[v * 3 + 1], q.pos[v * 3 + 2]);
				if (!edges.has(c)) edges.set(c, []);
				edges.get(c).push(q.pos[v * 3], q.pos[v * 3 + 1], q.pos[v * 3 + 2]);
			}
		}
		return { bvh: buildBvh(q.pos, q.idx), edges };
	});
	const nearEdge = (g, x, y, z) => {
		for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
			const list = g.edges.get(cellOf(x + a * CELL, y + b * CELL, z + c * CELL));
			if (!list) continue;
			for (let i = 0; i < list.length; i += 3) if ((list[i] - x) ** 2 + (list[i + 1] - y) ** 2 + (list[i + 2] - z) ** 2 < HEM_MARGIN ** 2) return true;
		}
		return false;
	};
	body.nearHem = new Uint8Array(body.n);
	body.underCloth = new Uint8Array(body.n);
	for (const v of new Set(body.idx)) {
		const x = body.pos[v * 3], y = body.pos[v * 3 + 1], z = body.pos[v * 3 + 2], nx = body.nor[v * 3], ny = body.nor[v * 3 + 1], nz = body.nor[v * 3 + 2];
		const ox = x + nx * 0.003, oy = y + ny * 0.003, oz = z + nz * 0.003;
		const reach = LEG_ZONES.has(zone[v]) ? COVER_LEG : COVER;
		// Cloth must lie over the skin in a small fan of directions. A single ray can clip the tip of a
		// shawl hanging near skin that is in plain view.
		const ax = Math.abs(ny) < 0.9 ? [0, 1, 0] : [1, 0, 0];
		let ux = ny * ax[2] - nz * ax[1], uy = nz * ax[0] - nx * ax[2], uz = nx * ax[1] - ny * ax[0];
		const ul = Math.hypot(ux, uy, uz) || 1;
		ux /= ul; uy /= ul; uz /= ul;
		const wx = ny * uz - nz * uy, wy = nz * ux - nx * uz, wz = nx * uy - ny * ux;
		const fan = [[nx, ny, nz]];
		for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
			const dx = nx + 0.5 * (a * ux + b * wx), dy = ny + 0.5 * (a * uy + b * wy), dz = nz + 0.5 * (a * uz + b * wz), l = Math.hypot(dx, dy, dz);
			fan.push([dx / l, dy / l, dz / l]);
		}
		const under = fan.every((d) => garments.some((g) => anyHit(g.bvh, ox, oy, oz, d[0], d[1], d[2], reach)));
		const poked = garments.filter((g) => anyHit(g.bvh, ox, oy, oz, -nx, -ny, -nz, POKE));
		if (under) body.underCloth[v] = 1;
		if (under || poked.length) body.hidden[v] = 1;
		if (!body.hidden[v]) continue;
		// Skin stays near a hem unless another garment covers it well away from that garment's own edge.
		const over = [...poked, ...garments.filter((g) => anyHit(g.bvh, ox, oy, oz, nx, ny, nz, reach))];
		if (!over.length || over.every((g) => nearEdge(g, x, y, z))) body.nearHem[v] = 1;
	}
}

// Stray islands left under a garment. An island touching a protected zone is never a stray.
function dropCrumbs(q, minTris, keepIf) {
	const id = weldIds(q);
	const root = Int32Array.from({ length: q.n }, (_, i) => i);
	const find = (x) => { while (root[x] !== x) { root[x] = root[root[x]]; x = root[x]; } return x; };
	for (let t = 0; t < q.idx.length; t += 3) {
		const a = find(id[q.idx[t]]);
		root[find(id[q.idx[t + 1]])] = a;
		root[find(id[q.idx[t + 2]])] = find(a);
	}
	const size = new Map(), safe = new Set();
	for (let t = 0; t < q.idx.length; t += 3) {
		const r = find(id[q.idx[t]]);
		size.set(r, (size.get(r) || 0) + 1);
		if (keepIf(q.idx[t]) || keepIf(q.idx[t + 1]) || keepIf(q.idx[t + 2])) safe.add(r);
	}
	const kept = [];
	for (let t = 0; t < q.idx.length; t += 3) {
		const r = find(id[q.idx[t]]);
		if (safe.has(r) || size.get(r) >= minTris) kept.push(q.idx[t], q.idx[t + 1], q.idx[t + 2]);
	}
	q.idx = kept;
}

function easeUnderCover(q, zone) {
	const id = weldIds(q);
	const deep = new Uint8Array(q.n);
	// Only skin with cloth in front of it moves. Skin over a garment buried in the body is in plain view.
	for (let v = 0; v < q.n; v++) deep[v] = q.underCloth[v] && q.hidden[v] && (NEVER_CULLED.has(zone[v]) || q.nearHem[v]) ? 2 : 0;
	for (let t = 0; t < q.idx.length; t += 3) {
		const tri = [q.idx[t], q.idx[t + 1], q.idx[t + 2]];
		if (tri.some((v) => !q.hidden[v])) for (const v of tri) if (deep[v]) deep[v] = 1;
	}
	// A seam's copies of one spot move together, so easing cannot open the skin along a UV seam.
	const inset = new Map();
	for (let v = 0; v < q.n; v++) {
		if (!deep[v]) continue;
		const amount = deep[v] === 2 ? 0.012 : 0.005;
		inset.set(id[v], Math.min(inset.get(id[v]) ?? amount, amount));
	}
	for (let v = 0; v < q.n; v++) {
		const amount = inset.get(id[v]);
		if (!amount) continue;
		q.pos[v * 3] -= q.nor[v * 3] * amount; q.pos[v * 3 + 1] -= q.nor[v * 3 + 1] * amount; q.pos[v * 3 + 2] -= q.nor[v * 3 + 2] * amount;
	}
}

function vertexZones(q, zones) {
	const out = new Array(q.n);
	for (let v = 0; v < q.n; v++) {
		const sum = {};
		for (let k = 0; k < 4; k++) {
			const w = q.w[v * 4 + k];
			if (w) sum[zones[q.j[v * 4 + k]]] = (sum[zones[q.j[v * 4 + k]]] || 0) + w;
		}
		let best = "torso", top = 0;
		for (const z in sum) if (sum[z] > top) { top = sum[z]; best = z; }
		out[v] = best;
	}
	return out;
}

// Skin carries painted detail that long triangles smear, so its atlas coordinates count in the error,
// scaled to weigh about as much as a normal. Cloth and turbans are near flat colour and fold sharply,
// and the same weight tears them, so theirs do not.
const SKIN_UV_WEIGHT = 6;

// Works on a compact copy: the simplifier treats unused vertices at the same spot as a seam and locks it.
function simplifyTris(q, tris, target, lock = null, shapeOnly = false) {
	if (tris.length / 3 <= target) return tris;
	const at = new Map(), back = [], local = new Uint32Array(tris.length);
	tris.forEach((v, i) => {
		if (!at.has(v)) { at.set(v, back.length); back.push(v); }
		local[i] = at.get(v);
	});
	const pos = new Float32Array(back.length * 3), attr = new Float32Array(back.length * 5), held = lock ? new Uint8Array(back.length) : null;
	back.forEach((v, i) => {
		pos.set(q.pos.subarray(v * 3, v * 3 + 3), i * 3);
		attr.set(q.nor.subarray(v * 3, v * 3 + 3), i * 5);
		const uvWeight = q.role === "skin" ? SKIN_UV_WEIGHT : 0;
		attr[i * 5 + 3] = q.uv[v * 2] * uvWeight; attr[i * 5 + 4] = q.uv[v * 2 + 1] * uvWeight;
		if (held) held[i] = lock[v];
	});
	const [out] = shapeOnly
		? MeshoptSimplifier.simplify(local, pos, 3, Math.max(4, target) * 3, 0.6, [])
		: MeshoptSimplifier.simplifyWithAttributes(local, pos, 3, attr, 5, [0.5, 0.5, 0.5, 1, 1], held, Math.max(4, target) * 3, 0.25, []);
	return Array.from(out, (i) => back[i]);
}

// The body is simplified a zone at a time, with the seams between zones held still so nothing opens.
function simplifySkin(q, zones) {
	const id = weldIds(q);
	const zone = vertexZones(q, zones);
	const groups = new Map(), zonesAt = new Map();
	for (let t = 0; t < q.idx.length; t += 3) {
		const tri = [q.idx[t], q.idx[t + 1], q.idx[t + 2]];
		const z = zone[tri[0]] === zone[tri[1]] ? zone[tri[0]] : zone[tri[1]] === zone[tri[2]] ? zone[tri[1]] : zone[tri[0]];
		if (!groups.has(z)) groups.set(z, []);
		groups.get(z).push(...tri);
		for (const v of tri) {
			if (!zonesAt.has(id[v])) zonesAt.set(id[v], new Set());
			zonesAt.get(id[v]).add(z);
		}
	}
	const lock = new Uint8Array(q.n);
	for (let v = 0; v < q.n; v++) if (zonesAt.get(id[v])?.size > 1) lock[v] = 1;
	const out = [];
	for (const [z, tris] of groups) out.push(...simplifyTris(q, tris, BODY_BUDGET[z] || 200, lock));
	q.idx = out;
}

function triArea(q) {
	let area = 0;
	for (let t = 0; t < q.idx.length; t += 3) {
		const [a, b, c] = [q.idx[t] * 3, q.idx[t + 1] * 3, q.idx[t + 2] * 3];
		const ux = q.pos[b] - q.pos[a], uy = q.pos[b + 1] - q.pos[a + 1], uz = q.pos[b + 2] - q.pos[a + 2];
		const vx = q.pos[c] - q.pos[a], vy = q.pos[c + 1] - q.pos[a + 1], vz = q.pos[c + 2] - q.pos[a + 2];
		area += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
	}
	return area;
}

function simplifyParts(parts, zones) {
	const cloth = parts.filter((q) => q.role === "cloth");
	const clothArea = cloth.reduce((s, q) => s + triArea(q), 0) || 1;
	for (const q of parts) {
		if (q.role === "skin") simplifySkin(q, zones);
		else if (q.role === "cloth") q.idx = simplifyTris(q, q.idx, Math.max(60, Math.round((PART_BUDGET.cloth * triArea(q)) / clothArea)));
		else if (q.role === "jewel") q.idx = simplifyTris(q, q.idx, PART_BUDGET.jewel, null, true);
		else q.idx = simplifyTris(q, q.idx, PART_BUDGET[q.role] || 60);
	}
}

// Adds a reversed copy of each cloth or hair triangle whose back can be seen in some pose.
function addBackFaces(parts, poses) {
	const all = parts.filter((q) => q.idx.length);
	const sided = all.filter((q) => q.role === "hair" || q.sheet);
	let added = 0;
	const seen = new Map(sided.map((q) => [q, new Uint8Array(q.idx.length / 3)]));
	for (const M of poses) {
		const posed = new Map(all.map((q) => [q, posePart(q, M)]));
		const total = all.reduce((s, q) => s + q.n, 0);
		const P = new Float32Array(total * 3), N = new Float32Array(total * 3), tris = [], offset = new Map();
		let off = 0;
		for (const q of all) {
			const p = posed.get(q);
			P.set(p.P, off * 3); N.set(p.N, off * 3);
			offset.set(q, off);
			for (const v of q.idx) tris.push(v + off);
			off += q.n;
		}
		const bvh = buildBvh(P, tris);
		for (const q of sided) {
			const flags = seen.get(q), o = offset.get(q);
			for (let t = 0; t < flags.length; t++) {
				if (flags[t]) continue;
				const [a, b, c] = [(q.idx[t * 3] + o) * 3, (q.idx[t * 3 + 1] + o) * 3, (q.idx[t * 3 + 2] + o) * 3];
				let nx = N[a] + N[b] + N[c], ny = N[a + 1] + N[b + 1] + N[c + 1], nz = N[a + 2] + N[b + 2] + N[c + 2];
				const l = Math.hypot(nx, ny, nz) || 1;
				nx = -nx / l; ny = -ny / l; nz = -nz / l;
				const ox = (P[a] + P[b] + P[c]) / 3 + nx * 0.004, oy = (P[a + 1] + P[b + 1] + P[c + 1]) / 3 + ny * 0.004, oz = (P[a + 2] + P[b + 2] + P[c + 2]) / 3 + nz * 0.004;
				for (const d of VIEW_DIRS) {
					if (d[1] < -0.01 || d[0] * nx + d[1] * ny + d[2] * nz < 0.05) continue;
					if (!anyHit(bvh, ox, oy, oz, d[0], d[1], d[2], SIGHT)) { flags[t] = 1; break; }
				}
			}
		}
	}
	for (const q of sided) {
		const flags = seen.get(q), back = [];
		for (let t = 0; t < flags.length; t++) if (flags[t]) back.push(q.idx[t * 3], q.idx[t * 3 + 2], q.idx[t * 3 + 1]);
		if (!back.length) continue;
		const used = [...new Set(back)], at = new Map(used.map((v, i) => [v, q.n + i]));
		const grow = (arr, size, Type, flip) => {
			const out = new Type((q.n + used.length) * size);
			out.set(arr);
			used.forEach((v, i) => {
				for (let k = 0; k < size; k++) out[(q.n + i) * size + k] = flip ? -arr[v * size + k] : arr[v * size + k];
			});
			return out;
		};
		const pos = grow(q.pos, 3, Float32Array, false), nor = grow(q.nor, 3, Float32Array, true), uv = grow(q.uv, 2, Float32Array, false), j = grow(q.j, 4, Uint16Array, false), w = grow(q.w, 4, Float32Array, false);
		q.idx = [...q.idx, ...back.map((v) => at.get(v))];
		Object.assign(q, { pos, nor, uv, j, w, n: q.n + used.length });
		added += back.length / 3;
	}
	return added;
}

// Some turban bands were modelled inside out and only looked right double-sided. The game draws front
// faces, so a closed part with a negative volume is turned the right way out.
function faceOutward(q) {
	let cx = 0, cy = 0, cz = 0, volume = 0;
	for (let v = 0; v < q.n; v++) { cx += q.pos[v * 3] / q.n; cy += q.pos[v * 3 + 1] / q.n; cz += q.pos[v * 3 + 2] / q.n; }
	for (let t = 0; t < q.idx.length; t += 3) {
		const [a, b, c] = [q.idx[t] * 3, q.idx[t + 1] * 3, q.idx[t + 2] * 3];
		const ax = q.pos[a] - cx, ay = q.pos[a + 1] - cy, az = q.pos[a + 2] - cz, bx = q.pos[b] - cx, by = q.pos[b + 1] - cy, bz = q.pos[b + 2] - cz, ex = q.pos[c] - cx, ey = q.pos[c + 1] - cy, ez = q.pos[c + 2] - cz;
		volume += ax * (by * ez - bz * ey) - ay * (bx * ez - bz * ex) + az * (bx * ey - by * ex);
	}
	if (volume >= 0) return;
	for (let t = 0; t < q.idx.length; t += 3) { const x = q.idx[t + 1]; q.idx[t + 1] = q.idx[t + 2]; q.idx[t + 2] = x; }
	for (let i = 0; i < q.n * 3; i++) q.nor[i] = -q.nor[i];
}

// Hard-edged jewellery has split vertices, which a simplifier cannot collapse. Weld them by position.
function weldPart(q) {
	const id = weldIds(q);
	const sum = new Float32Array(q.n * 3);
	for (let v = 0; v < q.n; v++) for (let k = 0; k < 3; k++) sum[id[v] * 3 + k] += q.nor[v * 3 + k];
	for (let v = 0; v < q.n; v++) {
		if (id[v] !== v) continue;
		const l = Math.hypot(sum[v * 3], sum[v * 3 + 1], sum[v * 3 + 2]) || 1;
		for (let k = 0; k < 3; k++) q.nor[v * 3 + k] = sum[v * 3 + k] / l;
	}
	q.idx = q.idx.map((v) => id[v]);
}

// Drops the vertices no triangle uses any more.
function compactPart(q) {
	const map = new Int32Array(q.n).fill(-1);
	let n = 0;
	for (const v of q.idx) if (map[v] < 0) map[v] = n++;
	const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), j = new Uint16Array(n * 4), w = new Float32Array(n * 4);
	for (let v = 0; v < q.n; v++) {
		const m = map[v];
		if (m < 0) continue;
		pos.set(q.pos.subarray(v * 3, v * 3 + 3), m * 3); nor.set(q.nor.subarray(v * 3, v * 3 + 3), m * 3); uv.set(q.uv.subarray(v * 2, v * 2 + 2), m * 2);
		j.set(q.j.subarray(v * 4, v * 4 + 4), m * 4); w.set(q.w.subarray(v * 4, v * 4 + 4), m * 4);
	}
	q.idx = q.idx.map((v) => map[v]);
	Object.assign(q, { pos, nor, uv, j, w, n });
}

// How fast, in metres per second, the planted foot moves back through the walk clip played at speed 1.
// A walker covering ground at this speed does not slide. The result ships in the GLB as data.
function measureStride(body, poser, motion, joints) {
	const clip = motion.clips.walk, frames = clip.frames - 1, dt = 1 / motion.fps;
	const names = joints.map((j) => j.getName());
	const speeds = [];
	const posed = Array.from({ length: frames }, (_, f) => posePart(body, poser("walk", f)).P);
	for (const side of ["L", "R"]) {
		const feet = new Set(names.flatMap((n, i) => (n === `foot.${side}` || (n.startsWith("toe") && n.endsWith(`.${side}`)) ? [i] : [])));
		const verts = [];
		for (let v = 0; v < body.n; v++) {
			let sum = 0;
			for (let k = 0; k < 4; k++) if (feet.has(body.j[v * 4 + k])) sum += body.w[v * 4 + k];
			if (sum > 0.6) verts.push(v);
		}
		const low = posed.map((P) => [...verts].sort((a, b) => P[a * 3 + 1] - P[b * 3 + 1]).slice(0, 3));
		const height = low.map((l, f) => l.reduce((s, v) => s + posed[f][v * 3 + 1], 0) / 3);
		const floor = Math.min(...height);
		const back = [];
		for (let f = 0; f < frames; f++) {
			if (height[f] > floor + 0.02) continue;
			const next = posed[(f + 1) % frames], prev = posed[(f - 1 + frames) % frames];
			back.push(-low[f].reduce((s, v) => s + (next[v * 3 + 2] - prev[v * 3 + 2]) / (2 * dt), 0) / 3);
		}
		back.sort((a, b) => a - b);
		speeds.push(back[back.length >> 1]);
	}
	return +((speeds[0] + speeds[1]) / 2).toFixed(3);
}

async function finish(doc, file, tris, error = 0.03) {
	await doc.transform(prune({ keepAttributes: true, keepLeaves: true }), weld());
	const before = doc.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((q, p) => q + p.getIndices().getCount() / 3, 0), 0);
	for (const anim of doc.getRoot().listAnimations()) {
		for (const c of anim.listChannels()) {
			if (FINE_BONE.test(c.getTargetNode()?.getName() || "")) {
				c.getSampler()?.dispose();
				c.dispose();
			}
		}
	}
	// A figure arrives already simplified part by part (tris is null).
	await doc.transform(
		...(tris ? [simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, tris / before), error, lockBorder: false })] : []),
		resample({ tolerance: 0.002 }),
		prune({ keepAttributes: true, keepLeaves: true }),
		meshopt({ encoder: MeshoptEncoder, level: "high" }),
	);
	await io().write(file, doc);
	const after = doc.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((q, p) => q + p.getIndices().getCount() / 3, 0), 0);
	return { before: Math.round(before), after: Math.round(after), bytes: (await stat(file)).size };
}

function keepClips(doc, keep) {
	for (const a of doc.getRoot().listAnimations()) {
		const to = keep[a.getName()];
		if (!to || BANNED_CLIP.test(a.getName())) {
			a.listChannels().forEach((c) => c.dispose());
			a.listSamplers().forEach((s) => s.dispose());
			a.dispose();
		} else {
			a.setName(to);
		}
	}
}

async function loadMotion(id) {
	const file = path.join(MOTION_DIR, `${id}.json`);
	if (!existsSync(file)) throw new Error(`${id}: no CC0 motion at ${file}. Run tools/play/blender/retarget_cc0.py first.`);
	const motion = JSON.parse(await readFile(file, "utf8"));
	if (motion.license !== MOTION_LICENSE) throw new Error(`${id}: motion licence is ${motion.license}, expected ${MOTION_LICENSE}`);
	for (const name of FIGURE_CLIPS) if (!motion.clips?.[name]) throw new Error(`${id}: motion has no ${name} clip`);
	return motion;
}

// Every clip the source GLB carries is deleted first, then the CC0 clips are built from the data.
function replaceWithCc0Clips(doc, motion) {
	const root = doc.getRoot();
	for (const a of root.listAnimations()) {
		a.listChannels().forEach((c) => c.dispose());
		a.listSamplers().forEach((s) => s.dispose());
		a.dispose();
	}
	const buffer = root.listBuffers()[0];
	const joints = new Map(root.listSkins()[0].listJoints().map((j) => [j.getName(), j]));
	for (const name of FIGURE_CLIPS) {
		const clip = motion.clips[name];
		const times = Float32Array.from({ length: clip.frames }, (_, i) => i / motion.fps);
		const anim = doc.createAnimation(name).setExtras({ motion: motion.source, license: motion.license });
		for (const t of clip.tracks) {
			const node = joints.get(t.joint);
			if (!node) throw new Error(`${motion.figure}/${name}: rig has no joint ${t.joint}`);
			const size = t.path === "rotation" ? 4 : 3;
			if (t.values.length !== clip.frames * size) throw new Error(`${motion.figure}/${name}/${t.joint}: wrong key count`);
			const input = doc.createAccessor().setType(Accessor.Type.SCALAR).setArray(times.slice()).setBuffer(buffer);
			const output = doc.createAccessor().setType(size === 4 ? Accessor.Type.VEC4 : Accessor.Type.VEC3).setArray(Float32Array.from(t.values)).setBuffer(buffer);
			const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation("LINEAR");
			const channel = doc.createAnimationChannel().setTargetNode(node).setTargetPath(t.path).setSampler(sampler);
			anim.addSampler(sampler).addChannel(channel);
		}
	}
}

// Reads the written file back: exactly the CC0 clips, with the expected tracks and lengths.
async function assertOnlyCc0Clips(file, motion) {
	const anims = (await io().read(file)).getRoot().listAnimations();
	const names = anims.map((a) => a.getName()).sort();
	if (names.join() !== [...FIGURE_CLIPS].sort().join()) throw new Error(`${file}: clips are ${names.join()}`);
	for (const a of anims) {
		const clip = motion.clips[a.getName()];
		const x = a.getExtras();
		if (x.license !== MOTION_LICENSE || x.motion !== motion.source) throw new Error(`${file}/${a.getName()}: not marked as the CC0 motion`);
		if (a.listChannels().length !== clip.tracks.length) throw new Error(`${file}/${a.getName()}: ${a.listChannels().length} tracks, expected ${clip.tracks.length}`);
		const end = Math.max(...a.listSamplers().map((s) => s.getInput().getMax([0])[0]));
		if (Math.abs(end - (clip.frames - 1) / motion.fps) > 0.02) throw new Error(`${file}/${a.getName()}: lasts ${end}s`);
	}
}

const roleOf = (node, mat) => {
	if (/human\.body/i.test(mat)) return "skin";
	if (/high-poly/i.test(mat)) return "eye";
	if (/braid|hair/i.test(mat)) return "hair";
	if (/turban/i.test(node)) return "turban";
	if (/hoop|bangle|necklace/i.test(node)) return "jewel";
	return "cloth";
};

function jointZones(joints) {
	return joints.map((j) => {
		for (let n = j; n; n = n.getParentNode()) {
			const hit = ZONES.find(([re]) => re.test(n.getName()));
			if (hit) return hit[1];
		}
		return "torso";
	});
}

async function packFigure(spec) {
	const motion = await loadMotion(spec.id);
	const doc = await io().read(spec.src);
	const root = doc.getRoot();
	const prims = [];
	let host = null;
	const removed = [], unskinned = [];
	const rigidOf = new Map(), nodeOf = new Map();
	const jointIndex = new Map(root.listSkins()[0].listJoints().map((j, i) => [j, i]));
	for (const node of root.listNodes()) {
		const mesh = node.getMesh();
		if (!mesh) continue;
		let dropped = false;
		for (const p of mesh.listPrimitives()) {
			const name = p.getMaterial()?.getName() || "";
			if (WEAPON.test(name)) {
				removed.push(name); dropped = true; continue;
			}
			if (TINY.test(name)) continue;
			if (!p.getAttribute("JOINTS_0") || !p.getAttribute("WEIGHTS_0")) {
				// Turbans and jewellery ride on one bone: bind them rigidly to it.
				let up = node.getParentNode();
				while (up && !jointIndex.has(up)) up = up.getParentNode();
				if (!up && /turban/i.test(name)) up = root.listSkins()[0].listJoints().find((j) => j.getName() === "head");
				if (!up) {
					unskinned.push(name);
					continue;
				}
				rigidOf.set(p, { matrix: node.getWorldMatrix(), joint: jointIndex.get(up) });
			}
			prims.push(p);
			nodeOf.set(p, node.getName());
		}
		if (node.getSkin() && !dropped && !host) host = node;
		if (node.getSkin() && !host) host = node;
	}
	const mats = [...new Set(prims.map((p) => p.getMaterial()))];
	const { png, where } = await buildAtlas(mats, spec.atlas || 512);
	const skin = root.listSkins()[0];
	const joints = skin.listJoints();
	const parts = prims.map((p) => {
		const q = readPrim(p, where.get(p.getMaterial()), rigidOf.get(p) || null);
		q.name = nodeOf.get(p);
		q.role = roleOf(q.name, p.getMaterial()?.getName() || "");
		q.pos = Float32Array.from(q.pos); q.nor = Float32Array.from(q.nor); q.uv = Float32Array.from(q.uv);
		q.j = Uint16Array.from(q.j); q.w = Float32Array.from(q.w);
		return q;
	});
	const body = parts.find((q) => q.role === "skin");
	const poser = makePoser(skin, motion);
	const stride = measureStride(body, poser, motion, joints);
	const zones = jointZones(joints);
	const skinBvh = buildBvh(body.pos, body.idx);
	const notSheets = parts.filter((q) => q.role === "cloth" && !keepOuterSheet(q, skinBvh)).map((q) => q.name);
	if (notSheets.length) console.warn(`${spec.id}: not two-walled, kept whole: ${notSheets.join(", ")}`);
	parts.filter((q) => q.role === "jewel").forEach(weldPart);
	parts.filter((q) => q.role === "jewel" || q.role === "turban").forEach(faceOutward);
	parts.filter((q) => q.role === "cloth").forEach((q) => hangFromBothThighs(q, joints));
	raiseOverBody(parts, body, zones);
	layerGarments(parts);
	const poses = samplePoses(poser, motion);
	cullEnclosed(parts, poses, zones);
	simplifyParts(parts, zones);
	const backFaces = addBackFaces(parts, [null, poses[1], poses[3], poses[5]]);
	const solid = parts.filter((q) => q.idx.length);
	solid.forEach(compactPart);
	const total = solid.reduce((s, q) => s + q.n, 0);
	const P = new Float32Array(total * 3), N = new Float32Array(total * 3), U = new Float32Array(total * 2);
	const J = new Uint16Array(total * 4), W = new Float32Array(total * 4), I = [];
	// Depth layer per vertex, read by the game's figure shader. Skin that can sit under clothes is drawn
	// a few centimetres further back, so a leg in stride cannot show through a skirt. Hands and forearms
	// come slightly forward, so a swinging hand is not lost in the cloth beside it.
	const B = new Float32Array(total);
	let off = 0;
	for (const q of solid) {
		P.set(q.pos, off * 3); N.set(q.nor, off * 3); U.set(q.uv, off * 2); J.set(q.j, off * 4); W.set(q.w, off * 4);
		if (q.role === "skin") {
			const z = vertexZones(q, zones);
			for (let v = 0; v < q.n; v++) B[off + v] = z[v] === "hand" || z[v] === "forearm" ? -0.375 : z[v] === "head" || z[v] === "foot" ? 0 : 1;
		}
		for (const k of q.idx) I.push(k + off);
		off += q.n;
	}
	const buffer = root.listBuffers()[0];
	const tex = await ktxTexture(doc, png, `${spec.id}_atlas`);
	const mat = doc.createMaterial(spec.id).setBaseColorTexture(tex).setRoughnessFactor(0.9).setMetallicFactor(0);
	const acc = (type, arr) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buffer);
	const prim = doc.createPrimitive()
		.setIndices(acc(Accessor.Type.SCALAR, total < 65536 ? Uint16Array.from(I) : Uint32Array.from(I)))
		.setAttribute("POSITION", acc(Accessor.Type.VEC3, P)).setAttribute("NORMAL", acc(Accessor.Type.VEC3, N))
		.setAttribute("TEXCOORD_0", acc(Accessor.Type.VEC2, U)).setAttribute("JOINTS_0", acc(Accessor.Type.VEC4, J))
		.setAttribute("WEIGHTS_0", acc(Accessor.Type.VEC4, W))
		.setAttribute("_BEHIND", acc(Accessor.Type.SCALAR, B)).setMaterial(mat);
	const mesh = doc.createMesh(spec.id).addPrimitive(prim);
	for (const node of root.listNodes()) if (node.getMesh() && node !== host) node.setMesh(null).setSkin(null);
	host.setMesh(mesh).setSkin(skin);
	replaceWithCc0Clips(doc, motion);
	// The engine reads this to match the walk to the ground speed. No figure is named in the engine.
	(root.getDefaultScene() || root.listScenes()[0]).setExtras({ walk_speed: stride });
	const file = path.join(OUT, `${spec.id}.glb`);
	const r = await finish(doc, file, null);
	await assertOnlyCc0Clips(file, motion);
	const shipped = Object.fromEntries(solid.map((q) => [q.name, q.idx.length / 3]));
	return { ...r, walk_speed: stride, back_faces: backFaces, parts: shipped, motion: motion.source, weapons_removed: [...new Set(removed)], unskinned_dropped: [...new Set(unskinned)] };
}

// The CC0 mannequin, dressed as a restorer from today by colouring it per bone.
async function packPlayer(spec) {
	const doc = await io().read(spec.src);
	const root = doc.getRoot();
	keepClips(doc, spec.clips);
	const skin = root.listSkins()[0];
	const names = skin.listJoints().map((j) => j.getName());
	const zone = (n) => {
		if (/head|neck/.test(n)) return "skin";
		if (/hand|f_|thumb/.test(n)) return "skin";
		if (/foot|toe/.test(n)) return "boot";
		if (/thigh|shin|hips/.test(n)) return "trouser";
		return "jacket";
	};
	const C = { skin: [0.44, 0.25, 0.16], boot: [0.07, 0.05, 0.04], trouser: [0.30, 0.24, 0.16], jacket: [0.035, 0.20, 0.23] };
	for (const mesh of root.listMeshes()) {
		for (const p of mesh.listPrimitives()) {
			const j = p.getAttribute("JOINTS_0"), w = p.getAttribute("WEIGHTS_0");
			const n = j.getCount();
			const col = new Float32Array(n * 3);
			const jj = [0, 0, 0, 0], ww = [0, 0, 0, 0];
			for (let i = 0; i < n; i++) {
				j.getElement(i, jj); w.getElement(i, ww);
				const top = ww.indexOf(Math.max(...ww));
				col.set(C[zone(names[jj[top]] || "")], i * 3);
			}
			p.setAttribute("COLOR_0", doc.createAccessor().setType(Accessor.Type.VEC3).setArray(col).setBuffer(root.listBuffers()[0]));
			p.setMaterial(doc.createMaterial("restorer").setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.85).setMetallicFactor(0));
		}
	}
	// Measured planted-foot speeds at clip rate 1. The engine reads these so the feet do not skate.
	if (spec.strides) (root.getDefaultScene() || root.listScenes()[0]).setExtras({ strides: spec.strides });
	return finish(doc, path.join(OUT, `${spec.id}.glb`), spec.tris || 9000);
}

// A static model such as a cart: one mesh, one small texture.
async function packProp(spec) {
	const doc = await io().read(spec.src);
	const root = doc.getRoot();
	for (const t of root.listTextures()) {
		const slotMat = root.listMaterials().find((m) => m.getBaseColorTexture() === t);
		if (!slotMat) continue;
		const png = await sharp(Buffer.from(t.getImage())).removeAlpha().resize(spec.atlas || 512, spec.atlas || 512).png().toBuffer();
		const k = await ktxTexture(doc, png, t.getName());
		slotMat.setBaseColorTexture(k);
	}
	for (const m of root.listMaterials()) {
		m.setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setMetallicFactor(0).setRoughnessFactor(0.9);
	}
	return finish(doc, path.join(OUT, `${spec.id}.glb`), spec.tris || 7000, spec.error || 0.08);
}

// A ride animal rigged by tools/play/blender/rig_ride.py: one skinned mesh, one small texture, its
// clips as they are. Its measured ground speeds go in the scene extras, as for the player.
async function packRigged(spec) {
	const doc = await io().read(spec.src);
	const root = doc.getRoot();
	const info = JSON.parse(await readFile(spec.src.replace(/\.glb$/, ".json"), "utf8"));
	for (const m of root.listMaterials()) {
		const t = m.getBaseColorTexture();
		if (t) {
			const png = await sharp(Buffer.from(t.getImage())).removeAlpha().resize(spec.atlas || 1024, spec.atlas || 1024).png().toBuffer();
			m.setBaseColorTexture(await ktxTexture(doc, png, `${spec.id}_base`));
		}
		m.setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setMetallicFactor(0).setRoughnessFactor(0.9);
	}
	(root.getDefaultScene() || root.listScenes()[0]).setExtras({ strides: info.strides });
	const out = await finish(doc, path.join(OUT, `${spec.id}.glb`), null);
	return { ...out, strides: info.strides, clips: root.listAnimations().map((a) => a.getName()) };
}

// The report is a build record, so it stays out of public/. A partial run keeps the other actors' rows.
const reportFile = "tools/play/out/world/actors_report.json";
const report = existsSync(reportFile) ? JSON.parse(await readFile(reportFile, "utf8")) : {};
for (const a of cfg.actors) {
	if (only && !only.has(a.id)) continue;
	report[a.id] = a.kind === "player" ? await packPlayer(a) : a.kind === "prop" ? await packProp(a) : a.kind === "rigged" ? await packRigged(a) : await packFigure(a);
	console.log(a.id, JSON.stringify(report[a.id]));
}
// A check pack to another folder is not the build, so it leaves the build record alone.
if (!arg("--out")) {
	await mkdir(path.dirname(reportFile), { recursive: true });
	await writeFile(reportFile, JSON.stringify(report, null, 1));
}
