// Packs a baked open-world cell into web assets.
//   node tools/play/pack_world.mjs <slug> <cell> [--version 1]
//
// Reads tools/play/out/world/<cell>/ and writes public/play/worlds/<slug>/v<version>/<cell>/:
//   <group>.glb                 positions, uvs and a material class per vertex (meshopt)
//   tex/<group>_<state>_<px>.ktx2   baked atlases, a phone size and a full size
//   manifest.json               every file with its size, so the loader can budget
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Accessor, Document, NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { meshopt, reorder } from "@gltf-transform/functions";
import { encodeToKTX2 } from "ktx2-encoder";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

const [slug, cell] = process.argv.slice(2);
if (!slug || !cell) {
	console.error("Usage: node tools/play/pack_world.mjs <slug> <cell> [--version 1]");
	process.exit(1);
}
const vAt = process.argv.indexOf("--version");
const version = vAt > 0 ? process.argv[vAt + 1] : "1";
const SRC = path.join("tools/play/out/world", cell);
const OUT = path.join("public/play/worlds", slug, `v${version}`, cell);
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
	await doc.transform(reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: "high" }));
	const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
	await io.write(path.join(OUT, `${name}.glb`), doc);
	return { tris: meta.tris, min: meta.min, max: meta.max };
}

await mkdir(path.join(OUT, "tex"), { recursive: true });
const manifest = { cell, groups: {}, textures: {}, bytes: {} };
const entries = await readdir(SRC);
for (const f of entries.filter((e) => e.endsWith(".bin"))) {
	const name = f.replace(".bin", "");
	manifest.groups[name] = await buildGlb(name);
	const size = (await stat(path.join(OUT, `${name}.glb`))).size;
	manifest.bytes[`${name}.glb`] = size;
	console.log(`${name}.glb ${(size / 1024).toFixed(0)} KB, ${manifest.groups[name].tris} tris`);
}
const texDir = path.join(SRC, "tex");
if (existsSync(texDir)) {
	for (const f of (await readdir(texDir)).filter((e) => e.endsWith(".png"))) {
		const name = f.replace(".png", "");
		const src = await readFile(path.join(texDir, f));
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
}
// Tree cards are shared by every cell.
const cardDir = "tools/play/out/world/cards";
if (existsSync(cardDir)) {
	const dest = path.join(path.dirname(OUT), "cards");
	await mkdir(dest, { recursive: true });
	for (const f of (await readdir(cardDir)).filter((e) => e.endsWith(".png"))) {
		const png = await sharp(path.join(cardDir, f)).resize(512, 512, { fit: "fill" }).png().toBuffer();
		const out = await encodeToKTX2(new Uint8Array(png), KTX);
		await writeFile(path.join(dest, f.replace(".png", ".ktx2")), out);
		console.log(`card ${f} ${(out.byteLength / 1024).toFixed(0)} KB`);
	}
}
await writeFile(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));
const total = Object.values(manifest.bytes).reduce((a, b) => a + b, 0);
console.log(`${cell}: ${(total / 1048576).toFixed(2)} MB across ${Object.keys(manifest.bytes).length} files`);
