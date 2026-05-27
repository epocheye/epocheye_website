#!/usr/bin/env node
/**
 * Optimize the heritage GLB models for the web.
 *
 * Source models live in `models-src/` (git-ignored, multi-hundred-MB originals).
 * Optimized outputs are written to `public/models/` and committed.
 *
 * Pipeline (per model, via @gltf-transform/cli `optimize`):
 *   dedup → weld → simplify (meshoptimizer) → prune → textureCompress (WebP) → Draco.
 *
 * Per-model simplify ratios are tuned so each output lands under ~8 MB while staying
 * recognizable. Re-run with: `npm run models:optimize`
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(root, "models-src");
const OUT_DIR = path.join(root, "public", "models");

// name → optimize flags. Heavy, geometry-dense models get an explicit simplify ratio.
const MODELS = [
  { name: "vimana", flags: ["--texture-size", "2048"] },
  { name: "jagamohana", flags: ["--texture-size", "2048", "--simplify-ratio", "0.3", "--simplify-error", "0.01"] },
  { name: "colossuem", flags: ["--texture-size", "2048", "--simplify-ratio", "0.25", "--simplify-error", "0.01"] },
];

const BASE_FLAGS = ["--compress", "draco", "--texture-compress", "webp"];

mkdirSync(OUT_DIR, { recursive: true });

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

for (const { name, flags } of MODELS) {
  const input = path.join(SRC_DIR, `${name}.glb`);
  const output = path.join(OUT_DIR, `${name}.glb`);

  if (!existsSync(input)) {
    console.warn(`! skipping ${name}: source not found at ${input}`);
    continue;
  }

  console.log(`\n▶ optimizing ${name} ...`);
  execFileSync(
    npx,
    ["--yes", "@gltf-transform/cli@latest", "optimize", input, output, ...BASE_FLAGS, ...flags],
    { stdio: "inherit", cwd: root },
  );

  const mb = (statSync(output).size / 1024 / 1024).toFixed(2);
  console.log(`✔ ${name}.glb → ${mb} MB`);
}

console.log("\nDone. Optimized models written to public/models/.");
