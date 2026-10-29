#!/usr/bin/env node
/**
 * Bakes the Konark Jagamohana model into a point cloud for the /preorder hero.
 *
 * Reads public/models/jagamohana.glb (Draco-compressed), samples points on its
 * surface weighted by triangle area, and writes them as little-endian Int16
 * x,y,z triplets normalised to [-32767, 32767] (the model is unit-scaled):
 *   public/preorder/konark-points.bin
 * Re-run with: node scripts/build-preorder-points.mjs [count]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const COUNT = Number(process.argv[2]) || 90000;

const glb = readFileSync(path.join(root, "public/models/jagamohana.glb"));
const jsonLen = glb.readUInt32LE(12);
const json = JSON.parse(glb.subarray(20, 20 + jsonLen).toString());
const binStart = 20 + jsonLen + 8;
const bin = glb.subarray(binStart, binStart + glb.readUInt32LE(20 + jsonLen));

const prim = json.meshes[0].primitives[0];
const ext = prim.extensions.KHR_draco_mesh_compression;
const view = json.bufferViews[ext.bufferView];
const data = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);

const decoderModule = await require(path.join(root, "public/draco/draco_decoder.js"))();
const decoder = new decoderModule.Decoder();
const buffer = new decoderModule.DecoderBuffer();
buffer.Init(new Int8Array(data), data.length);
const mesh = new decoderModule.Mesh();
const status = decoder.DecodeBufferToMesh(buffer, mesh);
if (!status.ok()) throw new Error(`Draco decode failed: ${status.error_msg()}`);

const attr = decoder.GetAttributeByUniqueId(mesh, ext.attributes.POSITION);
const nVerts = mesh.num_points();
const posArr = new decoderModule.DracoFloat32Array();
decoder.GetAttributeFloatForAllPoints(mesh, attr, posArr);
const pos = new Float32Array(nVerts * 3);
for (let i = 0; i < pos.length; i += 1) pos[i] = posArr.GetValue(i);

const nFaces = mesh.num_faces();
const faceArr = new decoderModule.DracoInt32Array();
const idx = new Uint32Array(nFaces * 3);
for (let f = 0; f < nFaces; f += 1) {
	decoder.GetFaceFromMesh(mesh, f, faceArr);
	idx[f * 3] = faceArr.GetValue(0);
	idx[f * 3 + 1] = faceArr.GetValue(1);
	idx[f * 3 + 2] = faceArr.GetValue(2);
}

// Area-weighted triangle choice via a cumulative table.
const cum = new Float64Array(nFaces);
let total = 0;
for (let f = 0; f < nFaces; f += 1) {
	const a = idx[f * 3] * 3, b = idx[f * 3 + 1] * 3, c = idx[f * 3 + 2] * 3;
	const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
	const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
	const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
	total += Math.sqrt(cx * cx + cy * cy + cz * cz) / 2;
	cum[f] = total;
}

// Deterministic PRNG so the baked file is stable between runs.
let seed = 1337;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

const out = new Int16Array(COUNT * 3);
let maxAbs = 0;
const pts = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i += 1) {
	const r = rand() * total;
	let lo = 0, hi = nFaces - 1;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (cum[mid] < r) lo = mid + 1;
		else hi = mid;
	}
	const a = idx[lo * 3] * 3, b = idx[lo * 3 + 1] * 3, c = idx[lo * 3 + 2] * 3;
	let u = rand(), v = rand();
	if (u + v > 1) { u = 1 - u; v = 1 - v; }
	for (let k = 0; k < 3; k += 1) {
		const p = pos[a + k] + u * (pos[b + k] - pos[a + k]) + v * (pos[c + k] - pos[a + k]);
		pts[i * 3 + k] = p;
		maxAbs = Math.max(maxAbs, Math.abs(p));
	}
}
for (let i = 0; i < pts.length; i += 1) out[i] = Math.round((pts[i] / maxAbs) * 32767);

mkdirSync(path.join(root, "public/preorder"), { recursive: true });
writeFileSync(path.join(root, "public/preorder/konark-points.bin"), Buffer.from(out.buffer));
console.log(`konark-points.bin: ${COUNT} points from ${nFaces} faces, scale ${maxAbs.toFixed(4)}`);

decoderModule.destroy(posArr);
decoderModule.destroy(faceArr);
decoderModule.destroy(mesh);
decoderModule.destroy(buffer);
decoderModule.destroy(decoder);
