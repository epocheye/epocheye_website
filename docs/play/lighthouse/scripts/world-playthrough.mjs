// Plays the open-world slice from the title screen to the end of Mission 1, as a player would:
// it walks with the keys, reads the prompts, rides the cart and presses the same buttons.
//
//   PLAY_BASE=http://localhost:3100 node docs/play/lighthouse/scripts/world-playthrough.mjs <phone|pc> [--record out.mp4]
//
// phone: Lighthouse's phone size, slow 4G and a 4x CPU slowdown, Low preset.
// pc:    1280x720, no throttling, High preset.
// Measured: bytes and seconds to the first playable frame, frame rate while walking and riding.
// This machine's GPU is a GTX 1650, so the phone frame rate here is an emulation, not a real Android.

import { spawn } from "node:child_process";
import { BASE, CPU_SLOWDOWN, MOTO, NETWORK_4G, SLUG, launch, sleep } from "./common.mjs";

const profile = process.argv[2] === "pc" ? "pc" : "phone";
const recAt = process.argv.indexOf("--record");
const recordTo = recAt > 0 ? process.argv[recAt + 1] : null;
const isPhone = profile === "phone";
const viewport = isPhone ? MOTO : { width: 1280, height: 720, deviceScaleFactor: 1 };
const preset = isPhone ? "low" : "high";
const url = `${BASE}/play/${SLUG}/world?debug=1`;

// Runs inside the page. Drives the keyboard and the on-screen buttons from the live objective.
function installBot() {
	const down = new Set();
	const key = (code, on) => {
		if (on === down.has(code)) return;
		if (on) down.add(code);
		else down.delete(code);
		window.dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { code }));
	};
	const tapE = () => {
		window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
		window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyE" }));
	};
	const stopAll = () => ["KeyW", "ShiftLeft", "KeyA", "KeyD"].forEach((k) => key(k, false));
	const bot = { log: [], done: false, frames: [], sample: false, stuck: 0 };
	window.__bot = bot;
	let last = performance.now();
	const onFrame = (now) => {
		if (bot.sample) bot.frames.push(now - last);
		last = now;
		requestAnimationFrame(onFrame);
	};
	requestAnimationFrame(onFrame);

	// Walk round the palace rather than into it.
	const crosses = (a, b, r) => {
		for (let t = 0.02; t < 0.99; t += 0.015) {
			const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
			if (x > r[0] && x < r[2] && y > r[1] && y < r[3]) return true;
		}
		return false;
	};
	const via = (from, to, r) => {
		if (!crosses(from, to, r)) return to;
		const m = 3;
		const corners = [[r[0] - m, r[1] - m], [r[2] + m, r[1] - m], [r[2] + m, r[3] + m], [r[0] - m, r[3] + m]];
		const score = (c) => Math.hypot(c[0] - from[0], c[1] - from[1]) + Math.hypot(c[0] - to[0], c[1] - to[1]);
		const open = corners.filter((c) => Math.hypot(c[0] - from[0], c[1] - from[1]) > 1.5 && !crosses(from, c, r));
		const clear = open.filter((c) => !crosses(c, to, r));
		return (clear.length ? clear : open.length ? open : corners).sort((p, q) => score(p) - score(q))[0];
	};

	let nextTap = 0, lastObj = null, lastPos = null, lastMoveCheck = 0;
	const step = () => {
		const rt = window.__playWorld;
		if (!rt?.ready) return;
		const now = performance.now();
		const label = document.querySelector(".w-objective")?.innerText?.replace("\n", " ") || null;
		if (label && label !== lastObj) {
			bot.log.push({ t: Math.round(now), label });
			lastObj = label;
		}
		const mission = document.querySelector(".w-mission");
		if (mission && now > nextTap) {
			nextTap = now + 1900;
			mission.click();
			return;
		}
		if (document.querySelector(".w-splash")) {
			stopAll();
			bot.done = true;
			return;
		}
		const sub = document.querySelector(".w-subtitle-tap");
		if (sub) {
			stopAll();
			if (now > nextTap) {
				nextTap = now + 1250;
				sub.click();
			}
			return;
		}
		const choice = [...document.querySelectorAll(".w-choice button")];
		if (choice.length) {
			stopAll();
			if (now > nextTap) {
				nextTap = now + 1500;
				choice.find((b) => b.innerText === "Both.")?.click();
			}
			return;
		}
		const action = document.querySelector(".w-action");
		if (action) {
			stopAll();
			if (now > nextTap) {
				nextTap = now + 3000;
				action.click();
			}
			return;
		}
		const o = rt.objective;
		if (rt.riding && o?.kind !== "ride") {
			stopAll();
			if (now > nextTap) {
				nextTap = now + 700;
				tapE();
			}
			return;
		}
		const h = rt.hud();
		const wp = h.waypoint;
		if (!wp || rt.blocked) {
			stopAll();
			return;
		}
		bot.sample = true;
		if (rt.riding) {
			const want = Math.atan2(-(wp[0] - h.x), -(-(wp[1] - h.y)));
			const r = rt.rides.get(rt.riding);
			const err = Math.atan2(Math.sin(want - r.heading), Math.cos(want - r.heading));
			key("KeyW", true);
			key("KeyA", err > 0.08);
			key("KeyD", err < -0.08);
			return;
		}
		key("KeyA", false);
		key("KeyD", false);
		const prompt = rt.prompt;
		const wanted = (o.kind === "talk" && prompt?.kind === "npc" && prompt.id === o.npc)
			|| (o.kind === "record" && prompt?.kind === "record" && prompt.id === o.record)
			|| (o.kind === "ride" && prompt?.kind === "ride" && prompt.id === o.ride);
		if (wanted) {
			stopAll();
			if (now > nextTap) {
				nextTap = now + 900;
				tapE();
			}
			return;
		}
		const target = via([h.x, h.y], wp, [-23, -2.1, 13.5, 25]); // the palace footprint
		rt.yaw = Math.atan2(-(target[0] - h.x), target[1] - h.y);
		rt.pitch = -0.1;
		key("KeyW", true);
		key("ShiftLeft", true);
		if (now - lastMoveCheck > 1500) {
			if (lastPos && Math.hypot(h.x - lastPos[0], h.y - lastPos[1]) < 0.4) bot.stuck++;
			lastPos = [h.x, h.y];
			lastMoveCheck = now;
		}
	};
	setInterval(step, 60);
}

const browser = await launch(["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--autoplay-policy=no-user-gesture-required"]);
const out = { profile, preset, viewport: `${viewport.width}x${viewport.height}` };
let ffmpeg = null, ticker = null;
try {
	const page = await browser.newPage();
	await page.setViewport(viewport);
	const errors = [];
	page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
	page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
	await page.evaluateOnNewDocument((id) => {
		try {
			localStorage.setItem("epocheye-play:world:quality", id);
			localStorage.setItem("play:anon", `test-world-${Math.random().toString(16).slice(2)}`);
		} catch {
			// storage blocked
		}
	}, preset);
	const cdp = await page.createCDPSession();
	await cdp.send("Network.enable");
	await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
	let bytes = 0;
	const byType = {};
	const reqType = new Map();
	cdp.on("Network.responseReceived", (e) => reqType.set(e.requestId, e.response.url));
	cdp.on("Network.loadingFinished", (e) => {
		bytes += e.encodedDataLength;
		const u = reqType.get(e.requestId) || "";
		const k = /\.ktx2/.test(u) ? "textures" : /\.glb/.test(u) ? "models" : /\.wasm/.test(u) ? "wasm" : /\.js/.test(u) ? "js" : /\.m4a/.test(u) ? "audio" : "other";
		byType[k] = (byType[k] || 0) + e.encodedDataLength;
	});
	if (isPhone) {
		// WORLD_NET=good4g: 9 Mbps down, 60 ms. The default is Lighthouse slow 4G: 1.6 Mbps, 150 ms.
		await cdp.send("Network.emulateNetworkConditions", process.env.WORLD_NET === "good4g" ? { offline: false, latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 } : NETWORK_4G);
		await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });
	}
	if (recordTo) {
		ffmpeg = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", "24", "-c:v", "mjpeg", "-i", "-", "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-preset", "veryfast", recordTo], { stdio: ["pipe", "inherit", "inherit"] });
		let latest = null;
		cdp.on("Page.screencastFrame", (f) => {
			latest = Buffer.from(f.data, "base64");
			cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
		});
		await cdp.send("Page.startScreencast", { format: "jpeg", quality: 72, everyNthFrame: 1 });
		ticker = setInterval(() => latest && ffmpeg.stdin.write(latest), 1000 / 24);
	}
	await page.evaluateOnNewDocument(installBot);
	const t0 = Date.now();
	await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
	await page.waitForSelector(".w-title .w-btn", { timeout: 120000 });
	out.title_s = (Date.now() - t0) / 1000;
	await page.evaluate(() => [...document.querySelectorAll(".w-title .w-btn")].find((b) => b.innerText === "Play muted").click());
	await page.waitForFunction(() => document.querySelector(".w-objective") && window.__playWorld?.ready, { timeout: 180000, polling: 200 });
	out.first_playable_s = (Date.now() - t0) / 1000;
	out.first_playable_mb = +(bytes / 1048576).toFixed(2);
	out.by_type_kb = Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v / 1024)]));
	if (isPhone) await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

	const deadline = Date.now() + Number(process.env.WORLD_MAX_MS || (isPhone ? 420000 : 300000));
	let done = false;
	while (Date.now() < deadline) {
		done = await page.evaluate(() => window.__bot?.done);
		if (done) break;
		await sleep(500);
	}
	await sleep(recordTo ? 3200 : 300);
	const res = await page.evaluate(() => {
		const b = window.__bot;
		const f = b.frames.filter((x) => x < 1000).sort((p, q) => p - q);
		const avg = f.reduce((s, x) => s + x, 0) / (f.length || 1);
		const p95 = f[Math.floor(f.length * 0.95)] || 0;
		const rt = window.__playWorld;
		const info = document.querySelector("canvas")?.getContext("webgl2");
		const dbg = info?.getExtension("WEBGL_debug_renderer_info");
		return {
			log: b.log.map((l) => l.label),
			stuck: b.stuck,
			frames: f.length,
			fps_avg: +(1000 / (avg || 1)).toFixed(1),
			fps_p95_low: +(1000 / (p95 || 1)).toFixed(1),
			splash: document.querySelector(".w-splash-h")?.innerText || null,
			era: rt.era,
			pos: [Math.round(rt.pos.x * 10) / 10, Math.round(-rt.pos.z * 10) / 10, Math.round(rt.pos.y * 100) / 100],
			objective: rt.objective?.id,
			waypoint: rt.waypoint,
			prompt: rt.prompt,
			blocked: rt.blocked,
			gpu: dbg ? info.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null,
		};
	});
	Object.assign(out, res, { completed: !!done, total_mb: +(bytes / 1048576).toFixed(2), errors: [...new Set(errors)].slice(0, 6) });
} finally {
	if (ticker) clearInterval(ticker);
	if (ffmpeg) {
		ffmpeg.stdin.end();
		await new Promise((r) => ffmpeg.on("close", r));
	}
	await browser.close();
}
console.log(JSON.stringify(out, null, 1));
process.exit(out.completed ? 0 : 1);
