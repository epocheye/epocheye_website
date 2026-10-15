// One-off: build the /virtual web model from the app's CDN palace model.
// Run with: node scripts/build-virtual-model.mjs <v24_cdn.glb>
//   source: heritage_assets/tipu-summer-palace-bengaluru/output/v24_cdn.glb (gltfpack: meshopt + KTX2)
//
// What it does, in order:
//  1. Removes every figure (Crowd_*__IMAGINED) and the tiger throne. The page must not show or
//     promise figures, and the throne never stood in this building (the monument page says so).
//  2. Merges meshes by material and instances repeats (balusters, pillars), cutting ~1,400 draw
//     calls to a few dozen so phones can render the walk.
//  3. Re-applies meshopt compression. KTX2 textures pass through untouched.
// Material names keep their evidence tier (e.g. ARCH_CUSPED_GILT__CONFIRMED); the page reads them.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, flatten, instance, join, meshopt, prune, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const [src] = process.argv.slice(2);
if (!src) {
	console.error("Usage: node scripts/build-virtual-model.mjs <v24_cdn.glb>");
	process.exit(1);
}
const OUT = "public/virtual/palace.glb";
// By node name, children included. Not by material: the CROWD__IMAGINED texture atlas is shared
// with the trees and the pettah houses, which stay.
const DROP = /^(Crowd_|Throne|Tiger|Furnish_masnad|Furnish_bolster|Furnish_throw)/i;

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
	.registerExtensions(ALL_EXTENSIONS)
	.registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const doc = await io.read(src);
const root = doc.getRoot();

function droppedByName(node) {
	for (let n = node; n; n = n.getParentNode()) {
		if (DROP.test(n.getName())) return true;
	}
	return false;
}

const doomed = root.listNodes().filter(droppedByName);
for (const node of doomed) node.dispose();
const dropped = doomed.length;
console.log(`Removed ${dropped} figure and throne nodes`);

const before = root.listMeshes().reduce((n, m) => n + m.listPrimitives().length, 0);
await doc.transform(
	prune(),
	dedup(),
	instance({ min: 5 }),
	flatten(),
	join({ keepNamed: false }),
	weld(),
	prune(),
	meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
const after = root.listMeshes().reduce((n, m) => n + m.listPrimitives().length, 0);
console.log(`Primitives: ${before} -> ${after}`);

await io.write(OUT, doc);
console.log(`Wrote ${OUT}`);
