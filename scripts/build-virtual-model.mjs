// Build the /virtual web model and its streamed texture sets from the app's palace model.
// Run with: node scripts/build-virtual-model.mjs <v24_cdn_unpacked.glb> <cc0 texture dir>
//   model:    heritage_assets/tipu-summer-palace-bengaluru/output/v24_cdn_unpacked.glb (JPEG textures)
//   textures: heritage_assets/tipu-summer-palace-bengaluru/output/tex/cc0 (2K CC0 sets; see TEXTURES.md)
//
// Output:
//   public/virtual/palace-lite.glb  geometry + 512px colour / 256px data KTX2 textures, meshopt. The first, light load.
//   public/virtual/tex/1k/*.ktx2    1K texture set, streamed on phones once the walk starts.
//   public/virtual/tex/2k/*.ktx2    2K texture set, streamed on desktop once the walk starts.
//   public/virtual/tex/manifest.json  which textures exist at which size.
//
// What it removes, and why:
//   Crowd_* figures and the throne set: the page must not show or promise figures, and the throne
//     never stood in this building (the monument page says so).
//   Hanging lanterns and both projecting balconies: they read as floating geometry (the balconies
//     sit on brackets over the open arcade with nothing beneath). The balcony arches stay.
// Removal is by node name, children included; never by material, because the CROWD__IMAGINED
// texture atlas is shared with the trees and pettah houses, which stay.
// Material names keep their evidence tier (e.g. ARCH_CUSPED_GILT__CONFIRMED); the page reads them.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, flatten, instance, join, meshopt, prune, quantize, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import { ktx2 } from "ktx2-encoder/gltf-transform";
import { encodeToKTX2 } from "ktx2-encoder";

const [src, cc0Dir] = process.argv.slice(2);
if (!src || !cc0Dir) {
	console.error("Usage: node scripts/build-virtual-model.mjs <v24_cdn_unpacked.glb> <cc0 texture dir>");
	process.exit(1);
}

const OUT_GLB = "public/virtual/palace-lite.glb";
const OUT_TEX = "public/virtual/tex";
const DROP = new RegExp(
	[
		"^Crowd_",
		"^Throne",
		"^Tiger",
		"^Furnish_masnad",
		"^Furnish_bolster",
		"^Furnish_throw",
		"^Furnish_lantern_chain",
		"^Furnish_lantern_chandelier",
		"^Balcony_(ESE|WNW)_(floor|bracket|baluster|rail)",
	].join("|"),
	"i",
);
// Tree leaves get their own material so the page can move them in a breeze without moving the
// houses that share their atlas.
const FOLIAGE = /^Site_Tree_.*_leaf/i;

const imageDecoder = async (buffer) => {
	const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	return { data: new Uint8Array(data), width: info.width, height: info.height };
};

// Colour maps are sRGB; normal and ORM maps are linear data.
const KTX2_COLOUR = { isUASTC: false, qualityLevel: 160, compressionLevel: 2, isPerceptual: true, isSetKTX2SRGBTransferFunc: true, generateMipmap: true, imageDecoder };
const KTX2_NORMAL = { isUASTC: false, qualityLevel: 200, compressionLevel: 2, isNormalMap: true, isPerceptual: false, isSetKTX2SRGBTransferFunc: false, generateMipmap: true, imageDecoder };
const KTX2_DATA = { isUASTC: false, qualityLevel: 160, compressionLevel: 2, isPerceptual: false, isSetKTX2SRGBTransferFunc: false, generateMipmap: true, imageDecoder };

function kindOf(name) {
	if (/_n\.(jpe?g|png)$/i.test(name)) return "normal";
	if (/_orm\.(jpe?g|png)$/i.test(name)) return "data";
	return "colour";
}
const OPTIONS = { colour: KTX2_COLOUR, normal: KTX2_NORMAL, data: KTX2_DATA };
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO()
	.registerExtensions(ALL_EXTENSIONS)
	.registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const doc = await io.read(src);
const root = doc.getRoot();

// Keep the full-resolution source images for the streamed sets before the GLB is downsized.
const sources = new Map();
for (const tex of root.listTextures()) sources.set(tex.getName() || tex.getURI(), tex.getImage());

// 1. Remove figures, throne, lanterns, balconies.
const dropped = (node) => {
	for (let n = node; n; n = n.getParentNode()) if (DROP.test(n.getName())) return true;
	return false;
};
const doomed = root.listNodes().filter(dropped);
for (const node of doomed) node.dispose();
console.log(`Removed ${doomed.length} nodes (figures, throne, lanterns, balconies)`);

// 2. Give tree leaves their own material.
const foliageMats = new Map();
for (const node of root.listNodes()) {
	if (!FOLIAGE.test(node.getName()) && !FOLIAGE.test(node.getParentNode()?.getName() || "")) continue;
	for (const prim of node.getMesh()?.listPrimitives() || []) {
		const mat = prim.getMaterial();
		if (!mat) continue;
		if (!foliageMats.has(mat)) foliageMats.set(mat, mat.clone().setName("FOLIAGE__SCENE-SHELL"));
		prim.setMaterial(foliageMats.get(mat));
	}
}

// 3. Merge for draw calls, and simplify. The error bound is relative to each mesh's size; it takes
// the dense lathe-turned balusters and pierced walls down without changing any silhouette visibly.
await doc.transform(
	prune(),
	dedup(),
	instance({ min: 5 }),
	flatten(),
	join({ keepNamed: false }),
	weld(),
	simplify({ simplifier: MeshoptSimplifier, ratio: 0.25, error: 0.002, lockBorder: false }),
	prune(),
);

// 4. Light textures: colour at 512px, normal and ORM data at 256px, all KTX2.
await doc.transform(
	textureCompress({ encoder: sharp, resize: [512, 512], targetFormat: "jpeg", quality: 90 }),
	textureCompress({ encoder: sharp, resize: [256, 256], targetFormat: "jpeg", quality: 92, slots: /normal|occlusion|metallicRoughness/ }),
	ktx2({ ...KTX2_COLOUR, qualityLevel: 120, slots: /baseColor|emissive/ }),
	ktx2({ ...KTX2_NORMAL, slots: /normal/ }),
	ktx2({ ...KTX2_DATA, slots: /occlusion|metallicRoughness/ }),
	// Quantizing first lets weld merge vertices that only differed below quantization precision,
	// which frees the simplifier to collapse far more of the dense meshes.
	quantize(),
	weld(),
	simplify({ simplifier: MeshoptSimplifier, ratio: 0.25, error: 0.003, lockBorder: false }),
	meshopt({ encoder: MeshoptEncoder, level: "high" }),
);
await io.write(OUT_GLB, doc);

let texBytes = 0;
for (const t of root.listTextures()) texBytes += t.getImage()?.byteLength || 0;
const glbBytes = (await readFile(OUT_GLB)).byteLength;
console.log(`${OUT_GLB}: ${kb(glbBytes)} (textures ${kb(texBytes)}, geometry and the rest ${kb(glbBytes - texBytes)})`);

// 5. Streamed sets. 2K from the CC0 source folder where a 2K version exists, else the model's own image.
const manifest = { "1k": [], "2k": [] };
let sizes = { "1k": 0, "2k": 0 };
for (const [name, embedded] of sources) {
	if (!name || !root.listTextures().some((t) => t.getName() === name)) continue; // texture was removed with its nodes
	const cc0 = path.join(cc0Dir, name);
	const best = existsSync(cc0) ? await readFile(cc0) : embedded;
	const { width } = await sharp(best).metadata();
	for (const [set, size] of [["1k", 1024], ["2k", 2048]]) {
		if (width < size && set === "2k" && width <= 1024) continue; // nothing better than the 1K set
		const target = Math.min(size, width);
		const png = await sharp(best).resize(target, target, { fit: "fill" }).png().toBuffer();
		const out = await encodeToKTX2(new Uint8Array(png), OPTIONS[kindOf(name)]);
		const file = path.join(OUT_TEX, set, name.replace(/\.(jpe?g|png)$/i, ".ktx2"));
		await mkdir(path.dirname(file), { recursive: true });
		await writeFile(file, out);
		manifest[set].push(name);
		sizes[set] += out.byteLength;
	}
}
await writeFile(path.join(OUT_TEX, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`tex/1k: ${manifest["1k"].length} textures, ${kb(sizes["1k"])}`);
console.log(`tex/2k: ${manifest["2k"].length} textures, ${kb(sizes["2k"])}`);
