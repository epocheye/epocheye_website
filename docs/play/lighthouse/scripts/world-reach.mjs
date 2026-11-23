// Maps the ground a player can walk to from the first past-era mission's start, with the real
// runtime rules and colliders, and writes it for the exporter to put in world.json.
//
//   PLAY_BASE=http://localhost:3140 node docs/play/lighthouse/scripts/world-reach.mjs
//
// Run it after any change to a world's walls or ground, then publish again.

import { writeFile } from "node:fs/promises";
import { BASE, SLUG, launch, sleep } from "./common.mjs";

const out = `tools/play/worlds/${SLUG}.reach.json`;
const browser = await launch(["--use-angle=d3d11", "--ignore-gpu-blocklist"]);
let result;
try {
	const page = await browser.newPage();
	page.setDefaultTimeout(600000);
	await page.setViewport({ width: 480, height: 270, deviceScaleFactor: 1 });
	await page.evaluateOnNewDocument(() => {
		try {
			localStorage.clear();
			localStorage.setItem("epocheye-play:world:quality", "low");
			localStorage.setItem("play:anon", `test-world-${Math.random().toString(16).slice(2)}`);
		} catch {
			// storage blocked
		}
	});
	await page.goto(`${BASE}/play/${SLUG}/world?debug=1`, { waitUntil: "domcontentloaded", timeout: 240000 });
	await page.waitForSelector(".w-title .w-btn");
	await page.evaluate(() => [...document.querySelectorAll(".w-title .w-btn")].find((b) => b.innerText === "Play muted").click());
	await page.waitForFunction(() => window.__playWorld?.ready && window.__playWorld.kcc, { polling: 200 });
	for (let i = 0; i < 12 && (await page.$(".w-mission")); i++) {
		await page.evaluate(() => document.querySelector(".w-mission")?.click());
		await sleep(1000);
	}
	await page.waitForFunction(() => window.__playWorld.streamer.open, { polling: 250 });
	result = await page.evaluate(async () => {
		const rt = window.__playWorld;
		rt.setObjective(null, null);
		rt.setEra(rt.pastEra);
		rt.streamer.radius = 4000;
		const all = () => [...rt.streamer.cells.values()].every((c) => c.status === "ready");
		while (!all()) await new Promise((r) => setTimeout(r, 100));
		await new Promise((r) => setTimeout(r, 800));
		const shape = new rt.R.Capsule(0.39, 0.3);
		const still = { x: 0, y: 0, z: 0, w: 1 };
		const fits = (x, y) => rt._canStand(x, -y) && !rt.phys.intersectionWithShape({ x, y: rt.groundAt(x, -y) + 1.14, z: -y }, still, shape, undefined, undefined, rt.collider, rt.body);
		const [x0, y0, x1, y1] = rt.world.play_bounds;
		const nx = Math.ceil(x1 - x0) + 1, ny = Math.ceil(y1 - y0) + 1;
		const bits = new Uint8Array(nx * ny);
		const start = rt.missions.missions.find((m) => rt.isPast(m.era)).start;
		const i0 = Math.round(start[0] - x0), j0 = Math.round(start[1] - y0);
		if (!fits(x0 + i0, y0 + j0)) throw new Error(`mission start is not walkable: ${start}`);
		const stack = [[i0, j0]];
		bits[j0 * nx + i0] = 1;
		let count = 0;
		while (stack.length) {
			const [i, j] = stack.pop();
			count++;
			for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
				const a = i + di, c = j + dj;
				if (a < 0 || c < 0 || a >= nx || c >= ny || bits[c * nx + a]) continue;
				if (!fits(x0 + a, y0 + c) || !fits(x0 + i + di / 2, y0 + j + dj / 2)) continue;
				bits[c * nx + a] = 1;
				stack.push([a, c]);
			}
		}
		const bytes = [];
		const put = (v) => {
			while (v > 127) {
				bytes.push((v & 127) | 128);
				v = Math.floor(v / 128);
			}
			bytes.push(v);
		};
		let on = 0, run = 0;
		for (const b of bits) {
			if (b === on) run++;
			else {
				put(run);
				on = b;
				run = 1;
			}
		}
		put(run);
		let text = "";
		for (let k = 0; k < bytes.length; k += 8192) text += String.fromCharCode(...bytes.slice(k, k + 8192));
		return { mask: { x0, y0, step: 1, nx, ny, rle: btoa(text) }, walkable_m2: count, start };
	});
} finally {
	await browser.close();
}
await writeFile(out, JSON.stringify(result.mask));
console.log(JSON.stringify({ out, walkable_m2: result.walkable_m2, from: result.start, nx: result.mask.nx, ny: result.mask.ny, bytes: result.mask.rle.length }));
process.exit(0);
