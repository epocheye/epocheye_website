// Walks the whole fort with the real runtime and takes the proof screenshots.
//
//   PLAY_BASE=http://localhost:3140 node docs/play/lighthouse/scripts/world-route.mjs <outDir> [--preset low|medium|high]
//
// The route is driven with the keyboard, as a player would: outside the Delhi Gate, round the
// approach, over the causeway, through the gate, along to the palace court, back to the gate yard,
// up the ramp and along the rampart walk. Then the edges: the ditch, the map limit and the cart.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { BASE, SLUG, launch, sleep } from "./common.mjs";

const outDir = process.argv[2] || "docs/play/lighthouse/route";
const presetAt = process.argv.indexOf("--preset");
const preset = presetAt > 0 ? process.argv[presetAt + 1] : "high";
const shotsOnly = process.argv.includes("--shots-only");
const url = `${BASE}/play/${SLUG}/world?debug=1`;

const LEGS = [
	["outside the gate", [302, 40]],
	["approach", [286, 57]],
	["approach", [272, 62]],
	["round the outwork", [267, 71]],
	["causeway", [259, 78]],
	["causeway", [249, 77]],
	["gate front", [244.6, 69]],
	["gate front", [245.5, 58.7]],
	["in the gate", [237, 60.1]],
	["in the gate", [225, 62.2]],
	["gate yard", [220, 63]],
	["inner passage", [212, 64.3]],
	["inside", [202, 65.9]],
	["inside", [150, 68]],
	["inside", [100, 26]],
	["palace court", [40, -30]],
	["palace court", [0, -24]],
	["back to the gate", [100, 26]],
	["back to the gate", [150, 68]],
	["back to the gate", [202, 65.9]],
	["inner passage", [212, 64.3]],
	["gate yard", [220.5, 66]],
	["ramp foot", [226.0, 74]],
	["ramp", [226.9, 89.5]],
	["ramp", [226.3, 104.3]],
	["ramp", [224.3, 119]],
	["ramp top", [222.0, 129.5]],
	["onto the walk", [225.6, 131.0]],
	["rampart walk", [222.5, 142.5]],
	["rampart walk", [218.1, 154.8]],
	["rampart walk", [213.0, 166.7]],
	["rampart walk", [207.1, 178.3]],
	["rampart walk", [200.5, 189.6]],
	["rampart walk", [193.2, 200.5]],
	["rampart walk", [185.4, 210.9]],
	["rampart walk", [177.0, 220.9]],
	["rampart walk", [168.0, 230.5]],
	["rampart walk", [158.6, 239.7]],
	["rampart walk", [148.8, 248.4]],
];

const SHOTS = [
	{ name: "01_gate_front", era: "past", at: [262, 62], look: [240, 60], pitch: 0.02 },
	{ name: "02_outwork", era: "past", at: [292, 52], look: [262, 48], pitch: 0.0 },
	{ name: "03_causeway", era: "past", at: [268, 72], look: [250, 77], pitch: -0.02 },
	{ name: "04_avenue", era: "past", at: [-90, 78], look: [-200, 100], pitch: 0.0 },
	{ name: "05_court", era: "past", at: [6, -42], look: [-4, 10], pitch: 0.05 },
	{ name: "06_rampart_in", era: "past", at: [200.5, 189.6], look: [40, 60], pitch: -0.2, y: 9.14 },
	{ name: "07_rampart_out", era: "past", at: [203.0, 191.3], look: [420, 340], pitch: -0.08, y: 9.14 },
	{ name: "08_today_gate", era: "today", at: [266, 54], look: [240, 60], pitch: 0.05 },
	{ name: "09_in_the_gate", era: "past", at: [232, 61], look: [214, 64.2], pitch: 0.02 },
	{ name: "10_ramp", era: "past", at: [226.6, 78], look: [224, 125], pitch: 0.05 },
	{ name: "11_gate_close", era: "past", at: [251, 57.8], look: [238, 60], pitch: 0.12 },
	{ name: "12_inside_to_gate", era: "past", at: [196, 67], look: [240, 59.5], pitch: 0.06 },
	{ name: "14_wall_foot", era: "past", at: [176, 150], look: [196, 186], pitch: 0.0 },
	{ name: "15_south_ditch", era: "past", at: [-20, -165], look: [-20, -100], pitch: 0.02 },
	{ name: "16_sentry", era: "past", at: [210, 172], look: [199, 190], pitch: -0.05, y: 9.14 },
];

const browser = await launch(["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"]);
const report = { preset, legs: [], shots: [], edges: {} };
const errors = [];
let exit = 1;
try {
	await mkdir(outDir, { recursive: true });
	const page = await browser.newPage();
	await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
	page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 240)));
	page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 240)));
	page.on("response", (r) => {
		if (r.status() >= 400 && r.url().includes("/play/worlds/")) errors.push(`${r.status()} ${r.url()}`);
	});
	await page.evaluateOnNewDocument((id) => {
		try {
			localStorage.clear();
			localStorage.setItem("epocheye-play:world:quality", id);
			localStorage.setItem("play:anon", `test-world-${Math.random().toString(16).slice(2)}`);
		} catch {
			// storage blocked
		}
	}, preset);
	await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180000 });
	await page.waitForSelector(".w-title .w-btn", { timeout: 180000 });
	await page.evaluate(() => [...document.querySelectorAll(".w-title .w-btn")].find((b) => b.innerText === "Play muted").click());
	await page.waitForFunction(() => window.__playWorld?.ready && window.__playWorld.kcc, { timeout: 180000, polling: 200 });
	for (let i = 0; i < 12 && (await page.$(".w-mission")); i++) {
		await page.evaluate(() => document.querySelector(".w-mission")?.click());
		await sleep(1000);
	}
	await page.waitForFunction(() => window.__playWorld.streamer.open, { timeout: 120000, polling: 250 });

	await page.evaluate(() => {
		const rt = window.__playWorld;
		// Whatever the mission wants, this run only walks: story objectives are not in the way.
		rt.setObjective(null, null);
		const keys = new Set();
		const key = (code, on) => {
			if (on === keys.has(code)) return;
			if (on) keys.add(code);
			else keys.delete(code);
			window.dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { code }));
		};
		const frames = [];
		let last = performance.now();
		const loop = (t) => {
			frames.push(t - last);
			last = t;
			requestAnimationFrame(loop);
		};
		requestAnimationFrame(loop);
		window.__route = {
			frames,
			key,
			stop: () => ["KeyW", "ShiftLeft", "KeyA", "KeyD"].forEach((k) => key(k, false)),
			// Walks to a point. Resolves with how it went.
			walk(to, { run = true, timeout = 90000, near = 1.3 } = {}) {
				return new Promise((done) => {
					const t0 = performance.now();
					let checkAt = t0, lx = rt.pos.x, lz = rt.pos.z, still = 0;
					const timer = setInterval(() => {
						const dx = to[0] - rt.pos.x, dy = to[1] + rt.pos.z;
						const d = Math.hypot(dx, dy);
						const finish = (ok, why) => {
							clearInterval(timer);
							window.__route.stop();
							done({ ok, why, at: [+rt.pos.x.toFixed(1), +(-rt.pos.z).toFixed(1), +rt.pos.y.toFixed(2)], seconds: +((performance.now() - t0) / 1000).toFixed(1) });
						};
						if (d < near) return finish(true, "arrived");
						if (performance.now() - t0 > timeout) return finish(false, "timeout");
						rt.yaw = Math.atan2(-dx, dy);
						rt.pitch = -0.1;
						key("KeyW", true);
						key("ShiftLeft", run);
						if (performance.now() - checkAt > 1000) {
							still = Math.hypot(rt.pos.x - lx, rt.pos.z - lz) < 0.15 ? still + 1 : 0;
							lx = rt.pos.x;
							lz = rt.pos.z;
							checkAt = performance.now();
							if (still >= 6) finish(false, "stuck");
						}
					}, 40);
				});
			},
		};
	});

	const stateOf = () =>
		page.evaluate(() => {
			const rt = window.__playWorld;
			return {
				cells: [...rt.streamer.cells.values()].filter((c) => c.status === "ready").map((c) => c.spec.id),
				x: +rt.pos.x.toFixed(1),
				y: +(-rt.pos.z).toFixed(1),
				h: +rt.pos.y.toFixed(2),
				stats: rt.streamer.stats,
				calls: rt.renderer?.info?.render?.calls,
			};
		});

	const goTo = async (at, era) => {
		await page.evaluate(
			(p, past) => {
				const rt = window.__playWorld;
				const id = past ? rt.pastEra : Object.keys({ today: 1 })[0];
				if (rt.isPast(rt.era) !== past) rt.setEra(id);
				rt.teleport(p);
			},
			at,
			era === "past",
		);
		await page.waitForFunction((p) => window.__playWorld.era !== undefined && (!window.__playWorld.isPast(window.__playWorld.era) || window.__playWorld.streamer.isReady(p[0], p[1])), { timeout: 90000, polling: 200 }, at);
		await page.evaluate((p) => window.__playWorld.teleport(p), at);
	};

	// ---- the whole route, on foot
	await goTo(LEGS[0][1], "past");
	await sleep(600);
	await page.evaluate(() => (window.__route.frames.length = 0));
	let ok = true;
	for (const [label, to] of shotsOnly ? [] : LEGS.slice(1)) {
		const r = await page.evaluate((p) => window.__route.walk(p), to);
		report.legs.push({ label, to, ...r });
		if (!r.ok) {
			ok = false;
			break;
		}
	}
	report.route_arrived = ok;
	report.top_of_rampart_y = report.legs.at(-1)?.at?.[2];
	if (!shotsOnly) report.route = await page.evaluate(() => {
		const f = window.__route.frames.filter((x) => x < 2000).sort((a, b) => a - b);
		const avg = f.reduce((s, x) => s + x, 0) / (f.length || 1);
		return { frames: f.length, fps_avg: +(1000 / avg).toFixed(1), p99_ms: +f[Math.floor(f.length * 0.99)].toFixed(1), worst_ms: +f[f.length - 1].toFixed(1), over_100ms: f.filter((x) => x > 100).length };
	});
	report.after_route = await stateOf();

	// ---- the edges
	const pushOut = (from, dir, seconds) =>
		page.evaluate(
			async (p, d, s) => {
				const rt = window.__playWorld;
				rt.teleport(p);
				await new Promise((r) => setTimeout(r, 400));
				rt.yaw = Math.atan2(-d[0], d[1]);
				window.__route.key("KeyW", true);
				window.__route.key("ShiftLeft", true);
				const t0 = performance.now();
				let low = Infinity;
				while (performance.now() - t0 < s * 1000) {
					rt.yaw = Math.atan2(-d[0], d[1]);
					low = Math.min(low, rt.pos.y);
					await new Promise((r) => setTimeout(r, 50));
				}
				window.__route.stop();
				return { end: [+rt.pos.x.toFixed(1), +(-rt.pos.z).toFixed(1), +rt.pos.y.toFixed(2)], lowest_y: +low.toFixed(2) };
			},
			from,
			dir,
			seconds,
		);
	if (!shotsOnly) {
		await goTo([285, 150], "past");
		report.edges.into_the_ditch = await pushOut([290, 150], [-1, 0], 9); // the ditch lies west of here
		await goTo([300, 40], "past");
		report.edges.map_limit = await pushOut([300, 40], [1, 0.05], 12);

		// The cart, driven straight at what it must not enter, and through the gate it may use.
		const drive = (from, to, seconds) =>
			page.evaluate(
				async (a, b, s) => {
					const rt = window.__playWorld;
					const [id, r] = [...rt.rides][0];
					if (rt.riding) rt.dismount();
					r.group.position.set(a[0], rt.groundAt(a[0], -a[1]), -a[1]);
					r.heading = Math.atan2(-(b[0] - a[0]), b[1] - a[1]);
					r.group.rotation.y = r.heading;
					r.v = 0;
					rt.mountRide(id);
					await new Promise((w) => setTimeout(w, 200));
					window.__route.key("KeyW", true);
					const t0 = performance.now();
					let low = Infinity, high = -Infinity;
					while (performance.now() - t0 < s * 1000) {
						low = Math.min(low, r.group.position.y);
						high = Math.max(high, r.group.position.y);
						await new Promise((w) => setTimeout(w, 60));
					}
					window.__route.stop();
					const end = [+r.group.position.x.toFixed(1), +(-r.group.position.z).toFixed(1)];
					rt.dismount();
					return { end, from_start_m: +Math.hypot(end[0] - a[0], end[1] - a[1]).toFixed(1), left_to_go_m: +Math.hypot(end[0] - b[0], end[1] - b[1]).toFixed(1), y_range: [+low.toFixed(2), +high.toFixed(2)] };
				},
				from,
				to,
				seconds,
			);
		await goTo([222, 66], "past");
		report.edges.cart_at_ramp = await drive([224.5, 67], [226.6, 104], 12);
		await goTo([292, 150], "past");
		report.edges.cart_at_ditch = await drive([292, 150], [235, 150], 22);
		await goTo([-3, -32], "past");
		report.edges.cart_at_palace = await drive([-3, -32], [-3, 12], 16);
		await goTo([251, 57.9], "past");
		report.edges.cart_through_gate = await drive([251, 57.9], [204, 65.8], 24);
	}

	// ---- the proof screenshots
	for (const s of SHOTS) {
		await goTo(s.at, s.era);
		await page.evaluate(
			(p, look, pitch, y) => {
				const rt = window.__playWorld;
				if (y != null) {
					rt.body.setTranslation({ x: p[0], y: y + 0.95, z: -p[1] }, true);
					rt.body.setNextKinematicTranslation({ x: p[0], y: y + 0.95, z: -p[1] });
					rt.pos.y = y;
					rt.player.position.y = y;
				}
				rt.yaw = Math.atan2(-(look[0] - p[0]), look[1] - p[1]);
				rt.facing = rt.yaw;
				rt.pitch = pitch;
			},
			s.at,
			s.look,
			s.pitch,
			s.y ?? null,
		);
		await sleep(1600);
		await page.evaluate((look, p, pitch) => {
			const rt = window.__playWorld;
			rt.yaw = Math.atan2(-(look[0] - p[0]), look[1] - p[1]);
			rt.pitch = pitch;
		}, s.look, s.at, s.pitch);
		await sleep(250);
		const file = path.join(outDir, `${s.name}.jpg`);
		await page.screenshot({ path: file, type: "jpeg", quality: 82 });
		report.shots.push({ name: s.name, file, state: await stateOf() });
	}
	report.errors = [...new Set(errors)].slice(0, 12);
	exit = report.route_arrived ? 0 : 1;
} finally {
	await browser.close();
}
await writeFile(path.join(outDir, "route.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ preset: report.preset, arrived: report.route_arrived, route: report.route, top_y: report.top_of_rampart_y, edges: report.edges, failed: report.legs.filter((l) => !l.ok), after: report.after_route, errors: report.errors }, null, 1));
process.exit(exit);
