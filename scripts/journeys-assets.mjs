#!/usr/bin/env node
/**
 * /journeys teaser assets: Blender build -> web files.
 *
 *   node scripts/journeys-assets.mjs            # build + process everything
 *   node scripts/journeys-assets.mjs --process  # skip Blender, process .journeys-build/
 *
 * Blender (headless, scripts/journeys/build-teasers.py) writes to .journeys-build/:
 *   <name>.glb, <name>.png (bake), <name>-today.png (hero only), <name>-poster.png, frames/<name>/
 * This script then writes the committed files:
 *   public/journeys/models/<name>.glb            Draco mesh + WebP texture (2048 hero, 1024 cards)
 *   public/journeys/models/palace-pillar-today.webp   second texture set for the uMix crossfade
 *   public/journeys/posters/<name>.webp          first-paint poster, 1600 square
 *   public/journeys/loops/<name>.{mp4,webm}      6 s turntable loop, 1080 square, 24 fps
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = path.join(root, ".journeys-build");
const OUT = path.join(root, "public", "journeys");
const BLENDER = process.env.BLENDER || "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const OBJECTS = [
	{ name: "palace-pillar", tex: 2048, hero: true },
	{ name: "fort-gateway", tex: 1024 },
	{ name: "victoria-dome", tex: 1024 },
	{ name: "museum-colonnade", tex: 1024 },
];

for (const d of ["models", "posters", "loops"]) mkdirSync(path.join(OUT, d), { recursive: true });

if (!process.argv.includes("--process")) {
	execFileSync(BLENDER, ["-b", "--python", path.join(root, "scripts/journeys/build-teasers.py"), "--", BUILD, "all"], {
		stdio: "inherit",
	});
}

const mb = (p) => (statSync(p).size / 1024 / 1024).toFixed(2);

for (const o of OBJECTS) {
	const glbIn = path.join(BUILD, `${o.name}.glb`);
	if (!existsSync(glbIn)) {
		console.warn(`! missing ${glbIn}`);
		continue;
	}
	const glbOut = path.join(OUT, "models", `${o.name}.glb`);
	execFileSync(
		npx,
		["--yes", "@gltf-transform/cli@latest", "optimize", glbIn, glbOut, "--compress", "draco", "--texture-compress", "webp", "--texture-size", String(o.tex), "--simplify", "false"],
		{ stdio: "inherit", cwd: root, shell: process.platform === "win32" },
	);
	console.log(`✔ ${o.name}.glb ${mb(glbOut)} MB`);

	if (o.hero) {
		const today = path.join(OUT, "models", `${o.name}-today.webp`);
		await sharp(path.join(BUILD, `${o.name}-today.png`)).resize(o.tex, o.tex).webp({ quality: 82 }).toFile(today);
		console.log(`✔ ${o.name}-today.webp ${mb(today)} MB`);
	}

	const poster = path.join(OUT, "posters", `${o.name}.webp`);
	await sharp(path.join(BUILD, `${o.name}-poster.png`)).resize(1600, 1600).webp({ quality: 80 }).toFile(poster);
	console.log(`✔ poster ${o.name}.webp ${mb(poster)} MB`);
	if (o.hero) {
		// Phone-sized poster for the first paint (srcset in components/journeys/Stage.jsx).
		const small = path.join(OUT, "posters", `${o.name}-800.webp`);
		await sharp(path.join(BUILD, `${o.name}-poster.png`)).resize(800, 800).webp({ quality: 78 }).toFile(small);
		console.log(`✔ poster ${o.name}-800.webp ${mb(small)} MB`);
	}

	const frames = path.join(BUILD, "frames", o.name);
	if (existsSync(frames) && readdirSync(frames).length) {
		const pattern = path.join(frames, "%04d.png");
		const mp4 = path.join(OUT, "loops", `${o.name}.mp4`);
		const webm = path.join(OUT, "loops", `${o.name}.webm`);
		execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", "24", "-i", pattern, "-vf", "scale=720:720", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "26", "-movflags", "+faststart", "-an", mp4], { stdio: "inherit" });
		execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", "24", "-i", pattern, "-vf", "scale=720:720", "-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p", "-b:v", "0", "-crf", "36", "-deadline", "good", "-cpu-used", "2", "-an", webm], { stdio: "inherit" });
		console.log(`✔ loops ${o.name}: mp4 ${mb(mp4)} MB, webm ${mb(webm)} MB`);
	}
}

console.log("\nDone. Assets written to public/journeys/.");
