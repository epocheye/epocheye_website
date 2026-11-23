// Plays the open world from the title screen to the end of the story, all six missions, as a
// player would: it walks with the keys, reads the prompts, rides the cart and presses the same
// buttons. A choice is tried option by option, and the dated cards by trial, like someone who
// does not know the answers.
//
//   PLAY_BASE=http://localhost:3100 node docs/play/lighthouse/scripts/world-playthrough.mjs <phone|pc> [--record out.mp4] [--shots <dir>]
//
// --shots saves a frame of each mission's key moment. WORLD_STOP_AFTER=<n> stops at mission n's splash.
// WORLD_FROM=<mission>:<objective> starts from a save at that point, for working on one mission.
//
// phone: Lighthouse's phone size, slow 4G and a 4x CPU slowdown, Low preset.
// pc:    1280x720, no throttling, High preset.
// Measured: bytes and seconds to the first playable frame, frame rate while walking and riding.
// This machine's GPU is a GTX 1650, so the phone frame rate here is an emulation, not a real Android.

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { BASE, CPU_SLOWDOWN, MOTO, NETWORK_4G, SLUG, launch, sleep } from "./common.mjs";

const profile = process.argv[2] === "pc" ? "pc" : "phone";
const recAt = process.argv.indexOf("--record");
const recordTo = recAt > 0 ? process.argv[recAt + 1] : null;
const shotsAt = process.argv.indexOf("--shots");
const shotsDir = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
// The objective and what must be on screen for each frame worth keeping.
const KEY_SHOTS = [
	["m2-compare", ".w-sketch", "m2_compare"],
	["m2-close", ".w-pano", "m2_restored_front"],
	["m3-court", ".w-objective", "m3_court"],
	["m3-look", ".w-objective", "m3_balcony_look"],
	["m3-halls", ".w-pano", "m3_upper_hall"],
	["m3-height", ".w-pano", "m3_height_from_balcony"],
	["m3-close", ".w-pano", "m3_painted_walls"],
	["m4-clerk", ".w-objective", "m4_office"],
	["m4-order", ".w-order", "m4_order"],
	["m5-look", ".w-pano", "m5_ceiling"],
	["m5-reveal", ".w-pano", "m5_reveal"],
	["m5-proof", ".w-proof", "m5_proof"],
	["m5-vote", ".w-choice", "m5_vote"],
	["m5-know", ".play-know", "m5_know_card"],
];
const isPhone = profile === "phone";
const viewport = isPhone ? MOTO : { width: 1280, height: 720, deviceScaleFactor: 1 };
const preset = isPhone ? "low" : "high";
// ?debug=1 records nothing. WORLD_RECORDS=1 leaves it off, on a dev server with no database only,
// to prove the game carries on when its run, vote and card calls all fail.
const url = `${BASE}/play/${SLUG}/world${process.env.WORLD_RECORDS === "1" ? "" : "?debug=1"}`;

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
	const bot = { log: [], done: false, frames: [], sample: false, stuck: 0, stuckAt: [], pause: false, splashes: [] };
	const stopAfter = window.__stopAfter ?? null;
	let orderTry = 0, orderCount = -1;
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

	// In the past era, find the way over the world's own connected-ground grid, a metre clear of
	// anything solid, as a player would walk round a tree platform or a wall.
	const clearCell = (m, i, j) => m._on(i, j) && m._on(i + 1, j) && m._on(i - 1, j) && m._on(i, j + 1) && m._on(i, j - 1);
	const nearestClear = (m, x, y) => {
		const i = Math.round((x - m.x0) / m.step), j = Math.round((y - m.y0) / m.step);
		for (let r = 0; r <= 8; r++) {
			for (let a = -r; a <= r; a++) {
				for (let b = -r; b <= r; b++) {
					if (Math.max(Math.abs(a), Math.abs(b)) === r && clearCell(m, i + a, j + b)) return [i + a, j + b];
				}
			}
		}
		return null;
	};
	const findPath = (m, from, to) => {
		const s = nearestClear(m, from[0], from[1]), e = nearestClear(m, to[0], to[1]);
		if (!s || !e) return null;
		const id = (i, j) => j * m.nx + i;
		const prev = new Int32Array(m.nx * m.ny).fill(-1);
		const queue = new Int32Array(m.nx * m.ny);
		let head = 0, tail = 0;
		queue[tail++] = id(s[0], s[1]);
		prev[id(s[0], s[1])] = id(s[0], s[1]);
		const goal = id(e[0], e[1]);
		while (head < tail && prev[goal] < 0) {
			const c = queue[head++];
			const i = c % m.nx, j = (c - i) / m.nx;
			for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
				const n = id(i + a, j + b);
				if (i + a < 0 || j + b < 0 || i + a >= m.nx || j + b >= m.ny || prev[n] >= 0 || !clearCell(m, i + a, j + b)) continue;
				prev[n] = c;
				queue[tail++] = n;
			}
		}
		if (prev[goal] < 0) return null;
		const out = [to];
		for (let c = goal; ; c = prev[c]) {
			const i = c % m.nx;
			out.push([m.x0 + i * m.step, m.y0 + ((c - i) / m.nx) * m.step]);
			if (c === prev[c]) break;
		}
		return out.reverse();
	};
	const lineClear = (m, a, b) => {
		const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
		for (let d = 0; d <= len; d += 0.4) {
			const x = a[0] + ((b[0] - a[0]) * d) / (len || 1), y = a[1] + ((b[1] - a[1]) * d) / (len || 1);
			if (!clearCell(m, Math.round((x - m.x0) / m.step), Math.round((y - m.y0) / m.step))) return false;
		}
		return true;
	};
	let path = null, pathKey = "", pathAt = 0;
	const steerTo = (rt, h, wp) => {
		const here = [h.x, h.y];
		if (!rt.reach || !rt.isPast(rt.era)) return via(here, wp, [-23, -2.1, 13.5, 25]); // the palace footprint
		const key = wp.join(",");
		if (key !== pathKey) {
			pathKey = key;
			path = findPath(rt.reach, here, wp);
			pathAt = 0;
		}
		if (!path) return via(here, wp, [-23, -2.1, 13.5, 25]);
		// Pick up the path at the node nearest the player, so a path that starts a little behind them
		// can never hand them a target they are already standing on.
		const gap = (q) => Math.hypot(q[0] - h.x, q[1] - h.y);
		let closest = pathAt;
		for (let k = pathAt; k < Math.min(path.length, pathAt + 40); k++) if (gap(path[k]) < gap(path[closest])) closest = k;
		pathAt = closest;
		while (pathAt < path.length - 1 && gap(path[pathAt]) < 1.3) pathAt++;
		let best = pathAt;
		// The grid is a metre coarse, so a shortcut must also clear the real colliders.
		const open = (q) => lineClear(rt.reach, here, q) && !rt._walkerHitsWorld(h.x, -h.y, q[0] - h.x, -(q[1] - h.y));
		for (let k = pathAt + 1; k < Math.min(path.length - 1, pathAt + 40); k++) if (open(path[k])) best = k;
		// The last step goes to the mark itself, which may stand closer to something than the grid allows.
		const last = path[path.length - 1];
		return (best >= path.length - 2 || pathAt >= path.length - 1) && (pathAt >= path.length - 2 || open(last)) ? last : path[best];
	};

	let nextTap = 0, lastObj = null, lastPos = null, lastMoveCheck = 0, lastWalk = 0, promptWanted = 0;
	const step = () => {
		const rt = window.__playWorld;
		if (!rt?.ready || bot.pause) return;
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
		if (document.querySelector(".w-title.is-over")) {
			stopAll();
			bot.done = true;
			return;
		}
		const splash = document.querySelector(".w-splash");
		if (splash) {
			stopAll();
			const text = splash.querySelector(".w-splash-h")?.innerText;
			const count = splash.querySelector(".w-splash-count")?.innerText;
			if (!bot.splashes.some((x) => x.count === count)) {
				bot.splashes.push({ text, count, place: splash.querySelector(".w-splash-place")?.innerText });
				nextTap = now + 1400;
				if (stopAfter !== null && count === `Mission ${stopAfter} complete`) bot.done = true;
			}
			if (now > nextTap) {
				nextTap = now + 1400;
				splash.click();
			}
			return;
		}
		const sub = document.querySelector(".w-subtitle-tap");
		if (sub && !document.querySelector(".w-order")) {
			stopAll();
			if (now > nextTap) {
				nextTap = now + 650;
				sub.click();
			}
			return;
		}
		const finish = document.querySelector(".w-ending-go");
		if (finish) {
			stopAll();
			// Long enough on the card for a person to see it, and for the frame to be kept.
			if (document.querySelector(".play-know")) {
				bot.cardAt ||= now;
				if (now - bot.cardAt > 3500 && now > nextTap) {
					nextTap = now + 1500;
					finish.click();
				}
			}
			return;
		}
		const tray = [...document.querySelectorAll(".play-order-tray button")];
		if (tray.length) {
			stopAll();
			if (tray.length !== orderCount) {
				orderCount = tray.length;
				orderTry = 0;
			}
			if (now > nextTap) {
				nextTap = now + 280;
				const open = [...document.querySelectorAll("[data-slot]")];
				tray[0].click();
				setTimeout(() => open[orderTry++ % open.length]?.click(), 90);
			}
			return;
		}
		if (document.querySelector(".w-order")) {
			stopAll();
			if (sub && now > nextTap) {
				nextTap = now + 650;
				sub.click();
			}
			return;
		}
		const sketchDone = document.querySelector(".w-sketch-close");
		if (sketchDone) {
			stopAll();
			if (now > nextTap) {
				nextTap = now + 900;
				sketchDone.click();
			}
			return;
		}
		const proof = document.querySelector(".w-proof button");
		if (rt.objective?.kind === "proof" && proof) {
			stopAll();
			if (now > nextTap && proof.getAttribute("aria-checked") !== "true" && proof.getAttribute("aria-pressed") !== "true") {
				nextTap = now + 1200;
				proof.click();
			}
			return;
		}
		const choice = [...document.querySelectorAll(".w-choice button")];
		if (choice.length) {
			stopAll();
			if (now > nextTap) {
				nextTap = now + 1100;
				(choice.find((b) => b.innerText === "Both." && !b.disabled) || choice.find((b) => !b.disabled))?.click();
			}
			return;
		}
		const lookGoal = rt.objective?.kind === "look_at" ? rt.objective : null;
		if (lookGoal?.pano_node) {
			stopAll();
			const core = rt.panoCore;
			if (core?.node?.loc && now > nextTap) {
				nextTap = now + 500;
				const d = lookGoal.target.map((v, i) => v - core.node.loc[i]);
				const len = Math.hypot(...d);
				core.lookAlong(d.map((v) => v / len), { animate: false });
			}
			return;
		}
		if (rt.objective && ["reveal", "ending"].includes(rt.objective.kind)) {
			stopAll();
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
		if (lookGoal && Math.hypot(h.x - lookGoal.from[0], h.y - lookGoal.from[1]) < lookGoal.radius * 0.7) {
			stopAll();
			const t = lookGoal.target;
			const dx = t[0] - h.x, dy = t[1] - h.y;
			rt.yaw = Math.atan2(-dx, dy);
			rt.pitch = Math.atan2(t[2] - (rt.pos.y + 1.55), Math.hypot(dx, dy));
			return;
		}
		const wanted = ((o.kind === "climb" || o.kind === "sketch_compare") && prompt?.kind === "action" && prompt.id === o.id)
			|| (o.kind === "talk" && prompt?.kind === "npc" && prompt.id === o.npc)
			|| (o.kind === "record" && prompt?.kind === "record" && prompt.id === o.record)
			|| (o.kind === "ride" && prompt?.kind === "ride" && prompt.id === o.ride);
		if (wanted) {
			stopAll();
			if (now > nextTap) {
				nextTap = now + 900;
				// The on-screen prompt where there is one, so a phone's only way in is the one tested.
				const onScreen = document.querySelector(".w-prompt");
				if (onScreen) {
					promptWanted = 0;
					onScreen.click();
				} else if (o.kind === "climb" || o.kind === "sketch_compare") {
					// React draws the prompt a frame or two after the world raises it. Longer is a real miss.
					promptWanted ||= now;
					if (now - promptWanted > 2500) {
						bot.noPrompt = (bot.noPrompt || 0) + 1;
						promptWanted = 0;
					}
				} else tapE();
			}
			return;
		}
		const target = steerTo(rt, h, wp);
		let aim = Math.atan2(-(target[0] - h.x), target[1] - h.y);
		// A person standing dead ahead holds a runner against them, so step round, as a player would.
		const fx = -Math.sin(aim), fy = Math.cos(aim);
		const crowd = [...rt.people, ...rt.storyNpcs.values()].filter((a) => a.group.visible);
		let ahead = Infinity, side = 0;
		for (const a of crowd) {
			const ox = a.group.position.x - h.x, oy = -a.group.position.z - h.y;
			const along = ox * fx + oy * fy, across = ox * fy - oy * fx;
			if (along > 0 && along < 2.2 && Math.abs(across) < 0.9 && along < ahead) {
				ahead = along;
				side = across >= 0 ? 1 : -1;
			}
		}
		if (side) aim += side * 0.9;
		rt.yaw = aim;
		rt.pitch = -0.1;
		key("KeyW", true);
		key("ShiftLeft", true);
		// Only time spent walking counts. A pause to talk or read is not being stuck.
		if (now - lastWalk > 400) {
			lastPos = null;
			lastMoveCheck = now;
		}
		lastWalk = now;
		if (now - lastMoveCheck > 1500) {
			if (lastPos && Math.hypot(h.x - lastPos[0], h.y - lastPos[1]) < 0.4) {
				bot.stuck++;
				bot.stuckAt.push({
					objective: o.id,
					at: [Math.round(h.x * 10) / 10, Math.round(h.y * 10) / 10],
					to: wp,
					nearest_person_m: +Math.min(...crowd.map((a) => Math.hypot(a.group.position.x - h.x, -a.group.position.z - h.y))).toFixed(2),
					moved_m: lastPos ? +Math.hypot(h.x - lastPos[0], h.y - lastPos[1]).toFixed(3) : null,
					window_ms: Math.round(now - lastMoveCheck),
					frames_in_window: bot.frames.length - (bot.framesAtCheck ?? 0),
					speed: +rt.speed.toFixed(2),
					holds: [...rt.holds],
					steer_to: target.map((v) => +v.toFixed(1)),
					ahead_blocked: rt._walkerHitsWorld(h.x, -h.y, -Math.sin(aim), -Math.cos(aim)),
					ahead_can_stand: rt._canStand(h.x - Math.sin(aim), -h.y - Math.cos(aim)),
					cell_ready: rt.streamer.isReady(h.x - Math.sin(aim) * 2, h.y + Math.cos(aim) * 2),
				});
				pathKey = ""; // look for the way again from here
			}
			lastPos = [h.x, h.y];
			lastMoveCheck = now;
			bot.framesAtCheck = bot.frames.length;
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
	// With no database the game's API calls fail, and the game must carry on: those are counted apart.
	const apiFailures = [];
	page.on("console", (m) => {
		if (m.type() !== "error") return;
		if ((m.location()?.url || "").includes("/api/play/")) apiFailures.push(m.location().url.replace(BASE, ""));
		else errors.push(m.text().slice(0, 200));
	});
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
	if (process.env.WORLD_FROM) {
		const [mission, objective] = process.env.WORLD_FROM.split(":").map(Number);
		const era = ["today", "1791", "1791", "1791", "1791", "1831"][mission];
		const state = { mission, objective, phase: "play", era, resolved: ["stone", "mud", "teak"], restored: mission > 2 ? ["exterior-colour"] : [], choices: {}, vote: null, proof: false, proofSeen: false, revealed: false, visited: [], askedApp: false };
		if (mission > 3) state.restored.push("painted-walls");
		await page.evaluateOnNewDocument((slug, json) => {
			if (sessionStorage.getItem("world-from")) return;
			sessionStorage.setItem("world-from", "1");
			localStorage.setItem(`epocheye-play:world:${slug}:v1`, json);
		}, SLUG, JSON.stringify({ v: 1, state }));
	}
	if (process.env.WORLD_STOP_AFTER) await page.evaluateOnNewDocument((n) => { window.__stopAfter = n; }, Number(process.env.WORLD_STOP_AFTER));
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

	const deadline = Date.now() + Number(process.env.WORLD_MAX_MS || (isPhone ? 2400000 : 1500000));
	let done = false;
	let shot = !process.env.WORLD_SHOT;
	const taken = new Set();
	if (shotsDir) mkdirSync(shotsDir, { recursive: true });
	while (Date.now() < deadline) {
		done = await page.evaluate(() => window.__bot?.done);
		if (done) break;
		if (shotsDir) {
			const live = await page.evaluate(() => window.__playWorld?.objective?.id || null);
			const want = KEY_SHOTS.find(([id, , name]) => id === live && !taken.has(name));
			if (want && (await page.$(want[1]))) {
				taken.add(want[2]);
				await page.evaluate(() => { window.__bot.pause = true; });
				await sleep(want[0] === "m5-reveal" ? 5200 : 1500);
				await page.screenshot({ path: join(shotsDir, `${profile}_${want[2]}.jpg`), type: "jpeg", quality: 84 });
				await page.evaluate(() => { window.__bot.pause = false; });
			}
		}
		// One frame of the past era's HUD and minimap, for the proof.
		if (!shot && (await page.evaluate(() => window.__playWorld?.objective?.kind === "ride"))) {
			await sleep(1800);
			await page.screenshot({ path: process.env.WORLD_SHOT, type: "jpeg", quality: 82 });
			shot = true;
		}
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
			splashes: b.splashes,
			missing_prompts: b.noPrompt || 0,
			stuck: b.stuck,
			stuck_at: b.stuckAt.slice(0, 12),
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
	Object.assign(out, res, { completed: !!done, total_mb: +(bytes / 1048576).toFixed(2), errors: [...new Set(errors)].slice(0, 6), api_failed_softly: [...new Set(apiFailures)] });
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
