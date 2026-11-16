// Meshy GLB -> web GLB without re-unwrapping: weld, meshoptimizer simplify (attribute-aware, UV
// seams locked), prune, WebP textures, Draco. The Meshy UVs and textures survive, so the objects
// keep their photographic detail; lighting happens live in components/journeys/Scene.jsx.
//
//   node scripts/journeys/meshy-simplify.mjs [name ...]      (default: all four)
//
// Reads .journeys-build/meshy-img/<name>.glb (+ <name>-today.glb for the hero) and writes
// public/journeys/models/<name>.glb and public/journeys/models/palace-pillar-today.webp.
// Budgets from the brief: hero GLB 2.5 MB, card GLBs 1 MB each.
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, draco, prune, simplify, textureCompress, weld } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const SRC = path.resolve(".journeys-build/meshy-img");
const OUT = path.resolve("public/journeys/models");
mkdirSync(OUT, { recursive: true });

// ratio = share of source triangles to keep; the hero gets more because it carries the page.
const OBJECTS = {
	"palace-pillar": { ratio: 0.08, error: 0.0008, texture: 2048, today: true },
	"fort-gateway": { ratio: 0.3, error: 0.0008, texture: 1024 },
	"victoria-dome": { ratio: 0.04, error: 0.0008, texture: 1024 },
	"museum-colonnade": { ratio: 0.07, error: 0.0008, texture: 1024 },
};

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
	"draco3d.encoder": await draco3d.createEncoderModule(),
	"draco3d.decoder": await draco3d.createDecoderModule(),
});

const mb = (p) => (statSync(p).size / 1024 / 1024).toFixed(2);
const tris = (doc) => doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3, 0), 0);

async function baseColor(doc) {
	const mat = doc.getRoot().listMaterials().find((m) => m.getBaseColorTexture());
	return mat?.getBaseColorTexture()?.getImage() ?? null;
}

for (const name of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(OBJECTS)) {
	const o = OBJECTS[name];
	const doc = await io.read(path.join(SRC, `${name}.glb`));
	const before = tris(doc);
	await MeshoptSimplifier.ready;
	await doc.transform(
		dedup(),
		weld(),
		simplify({ simplifier: MeshoptSimplifier, ratio: o.ratio, error: o.error, lockBorder: true }),
		prune(),
		textureCompress({ encoder: sharp, targetFormat: "webp", resize: [o.texture, o.texture], quality: 82 }),
		draco({ method: "edgebreaker", quantizePosition: 14, quantizeTexcoord: 12 }),
	);
	const out = path.join(OUT, `${name}.glb`);
	await io.write(out, doc);
	console.log(`✔ ${name}.glb ${mb(out)} MB, ${Math.round(before)} -> ${Math.round(tris(doc))} tris`);

	if (o.today) {
		// The retextured GLB shares geometry and UVs; only its base colour map is needed.
		const todayDoc = await io.read(path.join(SRC, `${name}-today.glb`));
		const img = await baseColor(todayDoc);
		if (!img) throw new Error(`${name}-today.glb has no base colour texture`);
		const file = path.join(OUT, `${name}-today.webp`);
		await sharp(Buffer.from(img)).resize(o.texture, o.texture).webp({ quality: 82 }).toFile(file);
		console.log(`✔ ${name}-today.webp ${mb(file)} MB`);
	}
}
