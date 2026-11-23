// Proof for the rides: drives each one straight at each limit and at people, with the keyboard, and
// records whether it stopped. Also takes the screenshots of each ride, mounted and not.
//
//   PLAY_BASE=http://localhost:3140 node docs/play/lighthouse/scripts/world-rides.mjs <outDir> [--preset low|medium|high] [--input keyboard|touch|gamepad] [--shots-only] [--tests-only]
//
// --input drives every test with that device: the real on-screen stick at phone size, or a fake gamepad.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { BASE, MOTO, SLUG, launch, sleep } from "./common.mjs";

const outDir = process.argv[2] || "docs/play/lighthouse/rides";
const at = process.argv.indexOf("--preset");
const preset = at > 0 ? process.argv[at + 1] : "high";
const inputAt = process.argv.indexOf("--input");
const inputMode = inputAt > 0 ? process.argv[inputAt + 1] : "keyboard";
const onlyAt = process.argv.indexOf("--only");
const only = onlyAt > 0 ? process.argv[onlyAt + 1] : null; // run just the drives whose label contains this
const picked = (rows) => rows.filter((row) => !only || row[0].includes(only));
const shotsOnly = process.argv.includes("--shots-only");
const testsOnly = process.argv.includes("--tests-only");
const url = `${BASE}/play/${SLUG}/world?debug=1`;

// [label, ride, from, towards, seconds, gallop]
const LIMITS = [
	["horse at the ditch from the east", "horse-1", [312, 150], [230, 150], 14, true],
	["horse at the ditch from the north", "horse-1", [95, 363], [60, 290], 16, true],
	["horse at the south ditch", "horse-1", [0, -180], [0, -95], 14, true],
	["horse at the causeway and gate", "horse-1", [312, 74], [250, 77], 14, true],
	["horse at the outwork", "horse-1", [312, 40], [262, 48], 14, true],
	["horse at the map edge", "horse-1", [300, 100], [420, 100], 12, true],
	["elephant at the palace court", "elephant-1", [-60, 50], [-10, -10], 34, false],
	["elephant at the palace from the avenue end", "elephant-1", [-62, 62], [0, 20], 34, false],
	["elephant off the avenue, north", "elephant-1", [-160, 88], [-150, 150], 22, false],
	["elephant off the avenue, south", "elephant-1", [-160, 86], [-175, 20], 26, false],
	["elephant at the avenue's west end", "elephant-1", [-240, 100], [-320, 112], 40, false],
	["elephant at the inclosure wall", "elephant-1", [-70, 66], [-20, 96], 28, false],
	["cart up the palace steps", "cart-1", [-3, -32], [-3, 12], 16, false],
	["cart at the platform, east", "cart-1", [34, 12], [6, 12], 12, false],
	["cart at the platform, west", "cart-1", [-46, 12], [-16, 12], 12, false],
	["cart at the platform, north", "cart-1", [-4, 46], [-4, 10], 14, false],
	["cart into the tank", "cart-1", [150, 28], [172, 36], 12, false],
	["cart at the ditch", "cart-1", [292, 150], [235, 150], 22, false],
];

// [label, ride, from, towards, seconds, gallop]. A person is stood still on the line, half way along.
const PEOPLE = [
	["horse at a person, gallop", "horse-1", [302, 150], [302, 80], 14, true],
	["horse at a person, walk", "horse-1", [302, 130], [302, 106], 16, false],
	["elephant at a person", "elephant-1", [-150, 86], [-115, 80], 34, false],
	["cart at a person", "cart-1", [-90, 72], [-60, 66], 16, false],
];

// [label, ride, from, towards, seconds, gallop]. Real walkers on their routes, head on.
const WALKERS = [
	["horse down the approach road", "horse-1", [312, 66], [282, 58], 22, false],
	["horse at a gallop down the approach road", "horse-1", [316, 72], [284, 58], 14, true],
	["elephant along the avenue", "elephant-1", [-96, 80], [-200, 98], 45, false],
	["elephant along the avenue, the other way", "elephant-1", [-205, 100], [-100, 80], 45, false],
	["cart along the avenue", "cart-1", [-70, 68], [-190, 96], 34, false],
	["cart through the court", "cart-1", [-44, -46], [32, -30], 22, false],
];

const browser = await launch(["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"]);
const report = { preset, input: inputMode, first_load: {}, limits: [], people: [], walkers: [], boarding: [], controls: [], shots: [] };
const errors = [];
const glbs = [];
let exit = 1;
try {
	await mkdir(outDir, { recursive: true });
	const page = await browser.newPage();
	await page.setViewport(inputMode === "touch" ? MOTO : { width: 1280, height: 720, deviceScaleFactor: 1 });
	page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 240)));
	page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 240)));
	page.on("response", (r) => {
		if (r.status() >= 400 && r.url().includes("/play/worlds/")) errors.push(`${r.status()} ${r.url()}`);
		if (/actors\/(horse|elephant)\.glb/.test(r.url())) glbs.push(r.url().split("/").pop());
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
	if (inputMode === "gamepad") {
		await page.evaluateOnNewDocument(() => {
			window.__pad = null;
			navigator.getGamepads = () => (window.__pad ? [window.__pad] : []);
		});
	}
	// The real on-screen stick, through real touch events. 52 px is its full travel.
	let thumb = null;
	await page.exposeFunction("__stick", async (on, gallop) => {
		if (!on) {
			if (thumb) await page.touchscreen.touchEnd();
			thumb = null;
			return;
		}
		const box = await (await page.$(".w-stick")).boundingBox();
		thumb = [box.x + box.width / 2, box.y + box.height / 2];
		await page.touchscreen.touchStart(thumb[0], thumb[1]);
		await page.touchscreen.touchMove(thumb[0], thumb[1] - (gallop ? 52 : 34));
	});
	await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180000 });
	await page.waitForSelector(".w-title .w-btn", { timeout: 180000 });
	await page.evaluate(() => [...document.querySelectorAll(".w-title .w-btn")].find((b) => b.innerText === "Play muted").click());
	await page.waitForFunction(() => window.__playWorld?.ready && window.__playWorld.kcc, { timeout: 180000, polling: 200 });
	for (let i = 0; i < 12 && (await page.$(".w-mission")); i++) {
		await page.evaluate(() => document.querySelector(".w-mission")?.click());
		await sleep(1000);
	}
	await page.waitForFunction(() => window.__playWorld.streamer.open, { timeout: 120000, polling: 250 });
	report.first_load.animal_models_requested = [...glbs];

	await page.evaluate((mode) => {
		const rt = window.__playWorld;
		rt.setObjective({ id: "proof", kind: "goto", at: [0, 0], radius: 0 }, null);
		rt._arrived = true;
		const keys = new Set();
		const key = (code, on) => {
			if (on === keys.has(code)) return;
			if (on) keys.add(code);
			else keys.delete(code);
			window.dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { code }));
		};
		const pad = (y, trigger, a = false) => {
			const btn = (p) => ({ pressed: p, value: p ? 1 : 0, touched: p });
			const buttons = Array.from({ length: 16 }, () => btn(false));
			buttons[0] = btn(a);
			buttons[7] = btn(trigger);
			window.__pad = { id: "test", index: 0, connected: true, mapping: "standard", axes: [0, y, 0, 0], buttons, timestamp: performance.now() };
		};
		// Forward on the chosen device. Below 0.72 of the stick is a walk, past it a gallop.
		const control = async (on, gallop = false) => {
			if (mode === "gamepad") pad(on ? (gallop ? -1 : -0.7) : 0, on && gallop);
			else if (mode === "touch") await window.__stick(on, gallop);
			else {
				key("KeyW", on);
				key("ShiftLeft", on && gallop);
			}
		};
		const gap = (a, r) => {
			const ox = a.group.position.x - r.group.position.x, oz = a.group.position.z - r.group.position.z;
			const c = Math.cos(r.heading), s = Math.sin(r.heading);
			const u = Math.abs(ox * c - oz * s) - r.halfX, v = Math.abs(ox * s + oz * c) - r.halfZ;
			return Math.hypot(Math.max(u, 0), Math.max(v, 0)) + Math.min(Math.max(u, v), 0);
		};
		const wait = (ms) => new Promise((w) => setTimeout(w, ms));
		const inPoly = (x, y, pts) => {
			let inside = false;
			for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
				const [xi, yi] = pts[i], [xj, yj] = pts[j];
				if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
			}
			return inside;
		};
		// Does not use the engine's own limit code. Reads the world data and looks at the ground.
		const audit = (r, seen) => {
			const c = Math.cos(r.heading), s = Math.sin(r.heading);
			const w = rt.world, zone = r.zone;
			const nx = Math.ceil((r.halfX * 2) / 0.2), nz = Math.ceil((r.halfZ * 2) / 0.2);
			for (let i = 0; i <= nx; i++) {
				for (let j = 0; j <= nz; j++) {
					if (i && j && i < nx && j < nz && (i + j) % 3) continue;
					const lx = (i / nx - 0.5) * 2 * r.halfX, lz = (j / nz - 0.5) * 2 * r.halfZ;
					const x = r.group.position.x + lx * c + lz * s, z = r.group.position.z - lx * s + lz * c, y = -z;
					if ((w.no_ride || []).some((q) => x > q[0] && x < q[2] && y > q[1] && y < q[3])) seen.no_ride++;
					if ((w.water?.tanks || []).some((t) => inPoly(x, y, t.keep))) seen.water++;
					if (w.walk_limit && !inPoly(x, y, w.walk_limit)) seen.map_edge++;
					if (zone?.deny?.some((p) => inPoly(x, y, p))) seen.zone++;
					if (zone?.allow && !zone.allow.some((p) => inPoly(x, y, p))) seen.zone++;
					const h = rt.terrain.sample(x, y);
					if (h !== null && h < w.min_walk_y) seen.ditch++;
					if (h !== null && (i === 0 || j === 0 || i === nx || j === nz)) {
						const hit = rt.phys.castRay(new rt.R.Ray({ x, y: h + 2.6, z }, { x: 0, y: -1, z: 0 }), 2.6, true, undefined, undefined, rt.collider, rt.body);
						if (hit) seen.raised = Math.max(seen.raised, +(2.6 - (hit.timeOfImpact ?? hit.toi ?? 2.6)).toFixed(2));
					}
				}
			}
		};
		const crowd = () => [...rt.people, ...rt.storyNpcs.values()].filter((a) => a.group.visible);
		window.__rides = {
			key,
			pad,
			control,
			gap,
			wait,
			place(id, from, to) {
				if (rt.riding) rt.dismount();
				const r = rt.rides.get(id);
				r.group.position.set(from[0], rt.groundAt(from[0], -from[1]), -from[1]);
				r.heading = Math.atan2(-(to[0] - from[0]), to[1] - from[1]);
				r.group.rotation.y = r.heading;
				r.v = 0;
				return r;
			},
			async drive(id, from, to, seconds, gallop, full = false) {
				const r = window.__rides.place(id, from, to);
				rt.mountRide(id);
				rt.yaw = r.heading;
				await wait(350);
				await control(true, gallop);
				const t0 = performance.now();
				let labelMissing = 0;
				// The test sets the ride down by hand, which a player cannot do, so it can land beside
				// someone. That person counts only if the gap then closes. Anyone else counts in full.
				const setDown = new Map(crowd().map((a) => [a, gap(a, r)]));
				const setDownNear = Math.min(Infinity, ...setDown.values());
				let closestAt = null;
				let over = 0, closest = Infinity, top = 0, lastMove = t0, px = r.group.position.x, pz = r.group.position.z, braked = false, prev = 0;
				const seen = { no_ride: 0, water: 0, map_edge: 0, zone: 0, ditch: 0, raised: 0 };
				while (performance.now() - t0 < seconds * 1000) {
					rt.yaw = r.heading;
					over = Math.max(over, rt._poseViolations(r, r.group.position.x, r.group.position.z, r.heading));
					for (const a of crowd()) {
						const g = gap(a, r), began = setDown.get(a);
						if (began !== undefined && began < 0.54 && g >= began - 0.02) continue;
						if (g < closest) {
							closest = g;
							closestAt = { ms: Math.round(performance.now() - t0), ride_speed: +Math.abs(r.v).toFixed(2), person: rt.people.indexOf(a) };
						}
					}
					top = Math.max(top, Math.abs(r.v));
					audit(r, seen);
					// A ride with a notice shows it the whole time it is ridden.
					if (r.spec.notice && performance.now() - t0 > 600 && !document.querySelector(".w-note")?.innerText.includes(r.spec.notice.text)) labelMissing++;
					if (Math.abs(r.v) < prev - 0.05 && Math.abs(r.v) > 0.05) braked = true;
					prev = Math.abs(r.v);
					if (Math.hypot(r.group.position.x - px, r.group.position.z - pz) > 0.03) {
						px = r.group.position.x;
						pz = r.group.position.z;
						lastMove = performance.now();
					}
					// Stood still for two seconds with the key held down: it has stopped.
					if (!full && performance.now() - lastMove > 2000) break;
					await wait(40);
				}
				const stopped = performance.now() - lastMove > 1500;
				await control(false);
				await wait(350);
				const end = [+r.group.position.x.toFixed(1), +(-r.group.position.z).toFixed(1)];
				const out = { stopped, end, travelled_m: +Math.hypot(end[0] - from[0], end[1] - from[1]).toFixed(1), left_to_target_m: +Math.hypot(end[0] - to[0], end[1] - to[1]).toFixed(1), parts_over_a_limit: over, closest_person_m: closest === Infinity ? null : +closest.toFixed(2), closest_at: closestAt, set_down_beside_m: setDownNear === Infinity ? null : +setDownNear.toFixed(2), top_speed: +top.toFixed(2), slowed_before_stopping: braked, label_missing: labelMissing, audit: seen };
				return out;
			},
			// Puts a walker on the ride's line and holds it still.
			standOn(k, p) {
				const a = rt.people[k];
				a.group.position.set(p[0], rt.groundAt(p[0], -p[1]), -p[1]);
				a.wait = 1e6;
				return k;
			},
			release(k) {
				rt.people[k].wait = 0.5;
			},
		};
	}, inputMode);

	const goTo = async (p) => {
		await page.evaluate((q) => {
			const rt = window.__playWorld;
			if (rt.riding) rt.dismount();
			if (!rt.isPast(rt.era)) rt.setEra(rt.pastEra);
			rt.teleport(q);
		}, p);
		await page.waitForFunction((q) => window.__playWorld.streamer.isReady(q[0], q[1]), { timeout: 90000, polling: 200 }, p);
		await page.evaluate((q) => window.__playWorld.teleport(q), p);
		await sleep(300);
	};
	const loaded = async (id, near) => {
		await goTo(near);
		await page.waitForFunction((r) => window.__playWorld.rides.get(r).ready, { timeout: 60000, polling: 200 }, id);
	};

	// ---- Loaded on demand
	const home = await page.evaluate(() => ({ horse: window.__playWorld.rides.get("horse-1").spec.at, elephant: window.__playWorld.rides.get("elephant-1").spec.at }));
	await loaded("horse-1", [home.horse[0] - 8, home.horse[1] - 6]);
	report.first_load.after_walking_to_the_horse = [...new Set(glbs)];
	await loaded("elephant-1", [home.elephant[0] + 3, home.elephant[1] - 7]);
	report.first_load.after_walking_to_the_elephant = [...new Set(glbs)];

	if (!shotsOnly) {
		for (const [label, id, from, to, seconds, gallop] of picked(LIMITS)) {
			await goTo(from);
			await sleep(400);
			const r = await page.evaluate((a, b, c, d, e) => window.__rides.drive(a, b, c, d, e), id, from, to, seconds, gallop);
			report.limits.push({ label, ride: id, from, to, ...r });
			console.log(label, JSON.stringify(r));
		}
		for (const [label, id, from, to, seconds, gallop] of picked(PEOPLE)) {
			await goTo(from);
			await sleep(400);
			const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
			const k = await page.evaluate((m) => {
				const rt = window.__playWorld;
				rt._shareRoutes();
				// The walker nearest the line, so it is one already in this part of the map.
				let best = 0, bestD = Infinity;
				rt.people.forEach((a, i) => {
					const d = Math.hypot(a.group.position.x - m[0], a.group.position.z + m[1]);
					if (d < bestD) {
						bestD = d;
						best = i;
					}
				});
				return window.__rides.standOn(best, m);
			}, mid);
			await sleep(300);
			const r = await page.evaluate((a, b, c, d, e) => window.__rides.drive(a, b, c, d, e), id, from, to, seconds, gallop);
			await page.evaluate((i) => window.__rides.release(i), k);
			report.people.push({ label, ride: id, person_at: mid, ...r });
			console.log(label, JSON.stringify(r));
		}

		for (const [label, id, from, to, seconds, gallop] of picked(WALKERS)) {
			await goTo(from);
			await page.evaluate(() => window.__playWorld._shareRoutes());
			await sleep(1600);
			const r = await page.evaluate((a, b, c, d, e) => window.__rides.drive(a, b, c, d, e, true), id, from, to, seconds, gallop);
			report.walkers.push({ label, ride: id, ...r });
			console.log(label, JSON.stringify(r));
		}

		// Boarding and leaving: step down from every side, next to something, and check the feet.
		for (const [label, id, spot, face] of [
			["horse in the open", "horse-1", [302, 110], [302, 60]],
			["horse against the ditch line", "horse-1", [284, 130], [250, 130]],
			["elephant on the avenue", "elephant-1", [-150, 86], [-110, 80]],
			["elephant by the inclosure wall", "elephant-1", [-60, 66], [-30, 80]],
			["cart beside the palace", "cart-1", [-30, 10], [-20, 10]],
		]) {
			await goTo([spot[0] + 3, spot[1] - 5]);
			const res = await page.evaluate(async (a, b, c) => {
				const rt = window.__playWorld;
				const r = window.__rides.place(a, b, c);
				await window.__rides.wait(200);
				rt.mountRide(a);
				await window.__rides.wait(500);
				const down = rt.dismount();
				await window.__rides.wait(700);
				const R = rt.R;
				const shape = new R.Capsule(0.39, 0.3);
				const inside = !!rt.phys.intersectionWithShape({ x: rt.pos.x, y: rt.pos.y + 1.14, z: rt.pos.z }, { x: 0, y: 0, z: 0, w: 1 }, shape, undefined, undefined, rt.collider, rt.body);
				return { got_down: down, riding_after: rt.riding, inside_a_collider: inside, can_stand: rt._canStand(rt.pos.x, rt.pos.z), on_connected_ground: !rt.reach || rt.reach.near(rt.pos.x, -rt.pos.z), from_ride_m: +window.__rides.gap({ group: { position: rt.pos } }, r).toFixed(2) };
			}, id, spot, face);
			report.boarding.push({ label, ride: id, ...res });
			console.log("boarding", label, JSON.stringify(res));
		}
	}

	// ---- On and off with the device itself: the prompt, a short drive, and the prompt again.
	if (!shotsOnly) {
		const press = async () => {
			if (inputMode === "touch") await (await page.$(".w-prompt")).tap();
			else if (inputMode === "gamepad") {
				await page.evaluate(() => window.__rides.pad(0, false, true));
				await sleep(250);
				await page.evaluate(() => window.__rides.pad(0, false, false));
			} else {
				await page.keyboard.down("KeyE");
				await sleep(80);
				await page.keyboard.up("KeyE");
			}
		};
		for (const [id, spot, face] of [["horse-1", [302, 110], [302, 60]], ["elephant-1", [-150, 86], [-110, 80]], ["cart-1", [-90, 72], [-60, 66]]]) {
			await goTo([spot[0] + 3, spot[1] - 5]);
			await page.evaluate((a, b, c) => {
				const rt = window.__playWorld;
				// The game may have put its own objective back, and only a roaming one shows ride prompts.
				rt.setObjective({ id: "proof", kind: "goto", at: [0, 0], radius: 0 }, null);
				rt._arrived = true;
				const r = window.__rides.place(a, b, c);
				const c0 = Math.cos(r.heading), s0 = Math.sin(r.heading);
				rt.teleport([b[0] + c0 * (r.halfX + 1.2), b[1] + s0 * (r.halfX + 1.2)]);
			}, id, spot, face);
			await page.waitForFunction((a) => window.__playWorld.prompt?.kind === "ride" && window.__playWorld.prompt.id === a, { timeout: 15000, polling: 100 }, id);
			await page.waitForSelector(".w-prompt", { timeout: 5000 });
			const near = await page.evaluate((a) => {
				const n = window.__playWorld.rides.get(a).spec.notice;
				return { prompt: document.querySelector(".w-prompt").innerText, notice_ok: !n || !!document.querySelector(".w-note")?.innerText.includes(n.text) };
			}, id);
			await press();
			await page.waitForFunction((a) => window.__playWorld.riding === a, { timeout: 6000, polling: 50 }, id);
			await sleep(400);
			const moved = await page.evaluate(async () => {
				const rt = window.__playWorld, r = rt.rides.get(rt.riding);
				rt.yaw = r.heading;
				const from = [r.group.position.x, r.group.position.z];
				await window.__rides.control(true, false);
				await window.__rides.wait(1800);
				await window.__rides.control(false);
				await window.__rides.wait(900);
				return +Math.hypot(r.group.position.x - from[0], r.group.position.z - from[1]).toFixed(2);
			});
			await page.waitForFunction(() => /Get down/.test(document.querySelector(".w-prompt")?.innerText || ""), { timeout: 6000, polling: 100 });
			await press();
			await page.waitForFunction(() => !window.__playWorld.riding, { timeout: 6000, polling: 50 });
			const row = { ride: id, ...near, moved_m: moved, got_down: true };
			report.controls.push(row);
			console.log("controls", JSON.stringify(row));
		}
	}

	// ---- A parked animal is solid, and walking straight at it leads round it.
	if (!shotsOnly && inputMode === "keyboard") {
		report.walk_round = [];
		for (const [id, spot, face] of [["horse-1", [302, 110], [302, 60]], ["elephant-1", [-150, 86], [-110, 80]]]) {
			for (const turn of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.7]) {
				await goTo([spot[0] + 3, spot[1] - 7]);
				const res = await page.evaluate(async (a, b, c, t) => {
					const rt = window.__playWorld;
					const r = window.__rides.place(a, b, c);
					const look = r.heading + t, reach = r.halfZ + 6;
					const start = [b[0] + Math.sin(look) * reach, b[1] - Math.cos(look) * reach];
					const end = [b[0] - Math.sin(look) * reach, b[1] + Math.cos(look) * reach];
					rt.teleport(start);
					await window.__rides.wait(700);
					window.__rides.key("KeyW", true);
					const t0 = performance.now();
					let closest = Infinity, arrived = false;
					while (performance.now() - t0 < 16000) {
						const dx = end[0] - rt.pos.x, dy = end[1] + rt.pos.z;
						if (Math.hypot(dx, dy) < 1.2) {
							arrived = true;
							break;
						}
						rt.yaw = Math.atan2(-dx, dy);
						closest = Math.min(closest, window.__rides.gap({ group: { position: rt.pos } }, r));
						await window.__rides.wait(40);
					}
					window.__rides.key("KeyW", false);
					return { arrived, closest_m: +closest.toFixed(2), seconds: +((performance.now() - t0) / 1000).toFixed(1) };
				}, id, spot, face, turn);
				report.walk_round.push({ ride: id, from_deg: Math.round((turn * 180) / Math.PI), ...res });
				console.log("walk round", id, JSON.stringify(res));
			}
		}
	}

	// ---- Screenshots
	if (!testsOnly && inputMode === "keyboard") {
		await page.addStyleTag({ content: ".w-prompt, .w-keys { display: none !important; }" });
		for (const [name, id, from, to] of [
			["horse", "horse-1", [302, 110], [302, 60]],
			["elephant", "elephant-1", [-150, 87], [-110, 80]],
		]) {
			await goTo([from[0] + 6, from[1] + 6]);
			await page.evaluate((a, b, c) => window.__rides.place(a, b, c), id, from, to);
			for (const [view, turn] of [["side", Math.PI / 2], ["rear", 0]]) {
				// On foot, standing back from it.
				await page.evaluate(async (a, t) => {
					const rt = window.__playWorld;
					if (rt.riding) rt.dismount();
					const r = rt.rides.get(a);
					const look = r.heading + t;
					const back = (t ? r.halfX : r.halfZ) + 2.2;
					rt.teleport([r.group.position.x + Math.sin(look) * back, -(r.group.position.z + Math.cos(look) * back)]);
					rt.player.visible = false;
					await window.__rides.wait(500);
					rt.yaw = Math.atan2(-(r.group.position.x - rt.pos.x), -(r.group.position.z - rt.pos.z));
					rt.facing = rt.yaw;
					rt.pitch = -0.04;
				}, id, turn);
				await sleep(1100);
				await page.screenshot({ path: path.join(outDir, `${name}_${view}_unmounted.jpg`), type: "jpeg", quality: 85 });
				// Mounted.
				await page.evaluate(async (a, t) => {
					const rt = window.__playWorld;
					const r = rt.rides.get(a);
					rt.player.visible = true;
					rt.mountRide(a);
					await window.__rides.wait(400);
					rt.yaw = r.heading + t;
					rt.pitch = -0.1;
				}, id, turn);
				await sleep(1100);
				await page.screenshot({ path: path.join(outDir, `${name}_${view}_mounted.jpg`), type: "jpeg", quality: 85 });
				report.shots.push(`${name}_${view}`);
			}
			await page.evaluate(() => window.__playWorld.dismount());
			await sleep(300);
		}
		// A gait in motion, from the side.
		for (const [name, id, from, to, gallop] of [
			["horse_gallop", "horse-1", [298, 190], [306, 20], true],
			["elephant_walk", "elephant-1", [-170, 90], [-110, 80], false],
		]) {
			await goTo(from);
			await page.evaluate(async (a, b, c, g) => {
				const r = window.__rides.place(a, b, c);
				window.__playWorld.mountRide(a);
				window.__rides.key("KeyW", true);
				if (g) window.__rides.key("ShiftLeft", true);
				await window.__rides.wait(g ? 2600 : 2400);
				window.__playWorld.yaw = r.heading + 1.2;
			}, id, from, to, gallop);
			await sleep(450);
			await page.screenshot({ path: path.join(outDir, `${name}_moving.jpg`), type: "jpeg", quality: 85 });
			await page.evaluate(() => {
				window.__rides.key("KeyW", false);
				window.__rides.key("ShiftLeft", false);
				window.__playWorld.dismount();
			});
			await sleep(1200);
			await page.evaluate(() => window.__playWorld.dismount());
		}
	}
	report.errors = [...new Set(errors)].slice(0, 12);
	const crossed = (r) => r.parts_over_a_limit > 0 || r.audit.no_ride || r.audit.water || r.audit.map_edge || r.audit.zone || r.audit.ditch || r.label_missing || (r.closest_person_m != null && r.closest_person_m < 0.5);
	const failed = [...report.limits.filter((r) => !r.stopped || crossed(r)), ...report.people.filter((r) => !r.stopped || crossed(r)), ...report.walkers.filter(crossed)];
	const badBoard = report.boarding.filter((b) => !b.got_down || b.riding_after || b.inside_a_collider || !b.can_stand || !b.on_connected_ground);
	report.failed = failed.map((f) => f.label);
	report.failed_boarding = badBoard.map((b) => b.label);
	report.failed_walk_round = (report.walk_round || []).filter((w) => !w.arrived || w.closest_m < 0.3);
	report.failed_controls = report.controls.filter((c) => !c.notice_ok || !(c.moved_m > 0.3));
	exit = report.errors.length || failed.length || badBoard.length || report.failed_walk_round.length || report.failed_controls.length ? 1 : 0;
} finally {
	await browser.close();
}
await writeFile(path.join(outDir, "rides.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ first_load: report.first_load, failed: report.failed, failed_boarding: report.failed_boarding, failed_walk_round: report.failed_walk_round, failed_controls: report.failed_controls, errors: report.errors }, null, 1));
process.exit(exit);
