// Packs the player, people and rides for the open world.
//   node tools/play/pack_actors.mjs <slug> [--only id,id] [--version 1]
//
// Reads the "actors" block of tools/play/worlds/<slug>.json. Read only on the source files.
// Each figure becomes one mesh, one small atlas and a few clips, so a crowd costs few draw calls.
// Anything that reads as a weapon is removed from the figure (brief 2.7).
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
const FINE_BONE = /finger|thumb|toe|metacarpal|eye|jaw|tongue|lip|cheek|brow|nose|ear|oris|levator|temporalis|risorius|platysma|masseter|f_(index|middle|ring|pinky)/i;
// Clips that must never ship, even though the source library contains them.
const BANNED_CLIP = /pistol|punch|sword|spell|death|hit_|shoot|attack/i;

const [slug] = process.argv.slice(2);
if (!slug) {
	console.error("Usage: node tools/play/pack_actors.mjs <slug> [--only id,id] [--version 1]");
	process.exit(1);
}
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const only = arg("--only", "") ? new Set(arg("--only").split(",")) : null;
const cfg = JSON.parse(await readFile(`tools/play/worlds/${slug}.json`, "utf8"));
const OUT = path.join("public/play/worlds", slug, `v${arg("--version", "1")}`, "actors");
await mkdir(OUT, { recursive: true });
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);

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
		const input = it.tex
			? await sharp(Buffer.from(it.tex.getImage())).removeAlpha().resize(it.cell, it.cell, { fit: "fill" }).tint(tint).png().toBuffer()
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
	await doc.transform(
		simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, tris / before), error, lockBorder: false }),
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

async function packFigure(spec) {
	const doc = await io().read(spec.src);
	const root = doc.getRoot();
	const prims = [];
	let host = null;
	const removed = [], unskinned = [];
	const rigidOf = new Map();
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
		}
		if (node.getSkin() && !dropped && !host) host = node;
		if (node.getSkin() && !host) host = node;
	}
	const mats = [...new Set(prims.map((p) => p.getMaterial()))];
	const { png, where } = await buildAtlas(mats, spec.atlas || 512);
	const parts = prims.map((p) => readPrim(p, where.get(p.getMaterial()), rigidOf.get(p) || null));
	const total = parts.reduce((s, q) => s + q.n, 0);
	const P = new Float32Array(total * 3), N = new Float32Array(total * 3), U = new Float32Array(total * 2);
	const J = new Uint16Array(total * 4), W = new Float32Array(total * 4), I = [];
	let off = 0;
	for (const q of parts) {
		P.set(q.pos, off * 3); N.set(q.nor, off * 3); U.set(q.uv, off * 2); J.set(q.j, off * 4); W.set(q.w, off * 4);
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
		.setAttribute("WEIGHTS_0", acc(Accessor.Type.VEC4, W)).setMaterial(mat);
	const mesh = doc.createMesh(spec.id).addPrimitive(prim);
	const skin = host.getSkin();
	for (const node of root.listNodes()) if (node.getMesh() && node !== host) node.setMesh(null).setSkin(null);
	host.setMesh(mesh).setSkin(skin);
	keepClips(doc, spec.clips || { walk: "walk", idle: "idle", talk: "talk" });
	const r = await finish(doc, path.join(OUT, `${spec.id}.glb`), spec.tris || 4500, spec.error || 0.03);
	return { ...r, weapons_removed: [...new Set(removed)], unskinned_dropped: [...new Set(unskinned)] };
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
	const C = { skin: [0.46, 0.27, 0.17], boot: [0.11, 0.07, 0.05], trouser: [0.09, 0.13, 0.21], jacket: [0.55, 0.42, 0.22] };
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

const report = {};
for (const a of cfg.actors) {
	if (only && !only.has(a.id)) continue;
	report[a.id] = a.kind === "player" ? await packPlayer(a) : a.kind === "prop" ? await packProp(a) : await packFigure(a);
	console.log(a.id, JSON.stringify(report[a.id]));
}
await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
