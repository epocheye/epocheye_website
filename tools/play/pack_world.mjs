// Packs a baked open-world cell into web assets. Run by `export_world.py publish`, which swaps the
// finished folder into public/ only after checking it.
//   node tools/play/pack_world.mjs <cell> --out <version-dir> --groups a,b --textures a_now,b_then
//
// Reads tools/play/out/world/<cell>/ and writes <version-dir>/<cell>/. Only the named groups and
// textures are packed, and a missing one is an error:
//   <group>.glb                 positions, uvs and a material class per vertex (meshopt)
//   tex/<group>_<state>_<px>.ktx2   baked atlases, a phone size and a full size
//   manifest.json               every file with its size, so the loader can budget
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Accessor, Document, NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { meshopt, reorder, simplify, weld } from "@gltf-transform/functions";
import { encodeToKTX2 } from "ktx2-encoder";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const cell = process.argv[2];
const flag = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : "");
const versionDir = flag("--out");
const groups = flag("--groups").split(",").filter(Boolean);
const textures = flag("--textures").split(",").filter(Boolean);
if (!cell || cell.startsWith("--") || !versionDir || !groups.length || !textures.length) {
	console.error("Usage: node tools/play/pack_world.mjs <cell> --out <version-dir> --groups a,b --textures a_now,b_then");
	process.exit(1);
}
const SRC = path.join("tools/play/out/world", cell);
const OUT = path.join(versionDir, cell);
const imageDecoder = async (buffer) => {
	const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	return { data: new Uint8Array(data), width: info.width, height: info.height };
};
const KTX = { isUASTC: false, qualityLevel: 170, compressionLevel: 2, isPerceptual: true, isSetKTX2SRGBTransferFunc: true, generateMipmap: true, imageDecoder };

async function buildGlb(name) {
	const meta = JSON.parse(await readFile(path.join(SRC, `${name}.json`), "utf8"));
	const raw = await readFile(path.join(SRC, `${name}.bin`));
	const bytes = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
	const n = meta.vertices;
	let at = 0;
	const blenderPos = new Float32Array(bytes, at, n * 3);
	at += n * 12;
	const blenderUv = new Float32Array(bytes, at, n * 2);
	at += n * 8;
	const cls = new Uint8Array(bytes.slice(at, at + n));
	at += n;
	const idx = new Uint32Array(bytes.slice(at, at + meta.indices * 4));

	// Blender is Z up, the web is Y up. glTF texture space starts at the top left.
	const pos = new Float32Array(n * 3);
	const uv = new Float32Array(n * 2);
	for (let i = 0; i < n; i++) {
		pos[i * 3] = blenderPos[i * 3];
		pos[i * 3 + 1] = blenderPos[i * 3 + 2];
		pos[i * 3 + 2] = -blenderPos[i * 3 + 1];
		uv[i * 2] = blenderUv[i * 2];
		uv[i * 2 + 1] = 1 - blenderUv[i * 2 + 1];
	}
	const doc = new Document();
	const buffer = doc.createBuffer();
	const prim = doc
		.createPrimitive()
		.setIndices(doc.createAccessor().setType(Accessor.Type.SCALAR).setArray(n < 65536 ? Uint16Array.from(idx) : idx).setBuffer(buffer))
		.setAttribute("POSITION", doc.createAccessor().setType(Accessor.Type.VEC3).setArray(pos).setBuffer(buffer))
		.setAttribute("TEXCOORD_0", doc.createAccessor().setType(Accessor.Type.VEC2).setArray(uv).setBuffer(buffer))
		.setAttribute("_CLASS", doc.createAccessor().setType(Accessor.Type.SCALAR).setArray(cls).setBuffer(buffer))
		.setMaterial(doc.createMaterial(name));
	const mesh = doc.createMesh(name).addPrimitive(prim);
	doc.createScene(name).addChild(doc.createNode(name).setMesh(mesh));
	doc.createExtension(KHRMeshQuantization);
	await MeshoptEncoder.ready;
	// The ground is a regular grid and mostly flat. Its border stays locked so neighbouring cells meet.
	if (name === "ground") {
		await MeshoptSimplifier.ready;
		await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0, error: 0.00025, lockBorder: true }));
		meta.tris = prim.getIndices().getCount() / 3;
	}
	await doc.transform(reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: "high" }));
	const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
	await io.write(path.join(OUT, `${name}.glb`), doc);
	return { tris: meta.tris, min: meta.min, max: meta.max };
}

await mkdir(path.join(OUT, "tex"), { recursive: true });
const manifest = { cell, groups: {}, textures: {}, bytes: {} };
for (const name of groups) {
	if (!existsSync(path.join(SRC, `${name}.bin`))) throw new Error(`No baked geometry for group ${name} in ${SRC}`);
}
const texDir = path.join(SRC, "tex");
for (const name of textures) {
	if (!existsSync(path.join(texDir, `${name}.png`))) throw new Error(`No baked texture ${name} in ${texDir}`);
}
for (const name of groups) {
	manifest.groups[name] = await buildGlb(name);
	const size = (await stat(path.join(OUT, `${name}.glb`))).size;
	manifest.bytes[`${name}.glb`] = size;
	console.log(`${name}.glb ${(size / 1024).toFixed(0)} KB, ${manifest.groups[name].tris} tris`);
}
for (const name of textures) {
	const src = await readFile(path.join(texDir, `${name}.png`));
	const { width } = await sharp(src).metadata();
	const sizes = [...new Set([Math.max(256, width >> 1), width])];
	manifest.textures[name] = sizes;
	for (const px of sizes) {
		const png = await sharp(src).resize(px, px, { fit: "fill" }).png().toBuffer();
		const out = await encodeToKTX2(new Uint8Array(png), KTX);
		const file = `${name}_${px}.ktx2`;
		await writeFile(path.join(OUT, "tex", file), out);
		manifest.bytes[`tex/${file}`] = out.byteLength;
		console.log(`${file} ${(out.byteLength / 1024).toFixed(0)} KB`);
	}
}
// Tree cards are shared by every cell. Only the cards world.json will name are packed.
const cardDir = "tools/play/out/world/cards";
const cardsJson = path.join(cardDir, "cards.json");
if (existsSync(cardsJson) && !process.argv.includes("--no-cards")) {
	const dest = path.join(versionDir, "cards");
	await mkdir(dest, { recursive: true });
	for (const key of Object.keys(JSON.parse(await readFile(cardsJson, "utf8")))) {
		for (const view of ["front", "side"]) {
			const f = `${key}_${view}.png`;
			const png = await sharp(path.join(cardDir, f)).resize(512, 512, { fit: "fill" }).png().toBuffer();
			const out = await encodeToKTX2(new Uint8Array(png), KTX);
			await writeFile(path.join(dest, f.replace(".png", ".ktx2")), out);
			console.log(`card ${f} ${(out.byteLength / 1024).toFixed(0)} KB`);
		}
	}
}
await writeFile(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));
const total = Object.values(manifest.bytes).reduce((a, b) => a + b, 0);
console.log(`${cell}: ${(total / 1048576).toFixed(2)} MB across ${Object.keys(manifest.bytes).length} files`);
