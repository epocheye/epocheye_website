// Plays the whole palace level to the end card in headless Chrome at 375x812, as a test player,
// and checks accessibility on the way. Generic: it reads the step kind from the story panel and
// uses only what a player can reach.
//
//   node docs/play/lighthouse/scripts/playthrough.mjs <mode> [--axe] [--reduce] [--shots <dir>] [--out <file.json>]
//
//   mode  keyboard  Tab to every control (it fails a control Tab cannot reach), Enter or Space to
//                   press it, arrow keys to turn the piece. Evidence is opened from the List sheet.
//         tap       touch taps only: no drag, no gyroscope, no keyboard
//         click     mouse clicks (the quickest; used for the final play-through)
//   --axe     run axe-core (serious and critical reported) at the first step of every kind
//   --reduce  emulate prefers-reduced-motion and check no animation runs
//
// Every step also checks: no horizontal scroll, the primary action in the lower half of the
// screen, tap targets at least 44 px, a visible focus ring (keyboard mode), and the contrast of
// the story text against the brightest pixel behind it.

import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import sharp from "sharp";
import { BASE, PHONE, SLUG, launch, sleep, testPage, watchErrors } from "./common.mjs";

const args = process.argv.slice(2);
const mode = args[0] || "click";
const flag = (n) => args.includes(n);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const useAxe = flag("--axe");
const reduce = flag("--reduce");
const shots = opt("--shots");
const outFile = opt("--out");
if (shots) mkdirSync(shots, { recursive: true });
const require = createRequire(import.meta.url);
const AXE = require.resolve("axe-core/axe.min.js");

const report = { mode, reduce, markerOnPanel: [], doubledStops: [], goToOpens: [], hints: [], axe: {}, steps: {}, notReachable: [], noFocusRing: {}, smallTargets: {}, upperHalf: {}, hscroll: [], contrast: [], animations: [], sheet: null, errors: [], counts: {} };

const browser = await launch();
const { page, anon } = await testPage(browser, { viewport: PHONE, reduce });
report.anon = anon;
watchErrors(page, report.errors);

// ---------------------------------------------------------------- helpers

const kind = () =>
	page.evaluate(() => {
		if (document.querySelector(".play-end")) return "end";
		const p = document.querySelector(".play-panel");
		if (!p) return null;
		const c = [...p.classList].find((x) => x.startsWith("is-") && x !== "is-clear");
		return c ? c.slice(3) : null;
	});

const visible = (sel) =>
	page.evaluateHandle((s) => {
		const ok = (el) => {
			const r = el.getBoundingClientRect();
			const st = getComputedStyle(el);
			return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none" && !el.disabled && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
		};
		return [...document.querySelectorAll(s)].find(ok) || null;
	}, sel);

async function first(sel) {
	const h = await visible(sel);
	const el = h.asElement();
	if (!el) await h.dispose();
	return el;
}

const describe = (h) => h.evaluate((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join(".")} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40)}"`);

async function tabTo(h) {
	for (let i = 0; i < 160; i++) {
		if (await h.evaluate((el) => el === document.activeElement)) return true;
		await page.keyboard.press("Tab");
	}
	report.notReachable.push(await describe(h));
	await h.focus();
	return false;
}

// The focus ring on the control the keyboard is on: an outline or a box shadow.
async function checkFocusRing() {
	const r = await page.evaluate(() => {
		const el = document.activeElement;
		if (!el || el === document.body) return null;
		const st = getComputedStyle(el);
		const ring = (st.outlineStyle !== "none" && parseFloat(st.outlineWidth) > 0) || (st.boxShadow && st.boxShadow !== "none");
		return { ring, what: `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}` };
	});
	if (r && !r.ring) report.noFocusRing[r.what] = (report.noFocusRing[r.what] || 0) + 1;
}

async function press(h) {
	if (!h) return false;
	if (mode === "keyboard") {
		await tabTo(h);
		await checkFocusRing();
		await page.keyboard.press("Enter");
	} else if (mode === "tap") {
		await h.evaluate((el) => el.scrollIntoView({ block: "nearest" }));
		await h.tap();
	} else {
		await h.evaluate((el) => el.scrollIntoView({ block: "nearest" }));
		await h.click();
	}
	await h.dispose();
	await sleep(140);
	return true;
}

async function layoutChecks(k) {
	const r = await page.evaluate(() => {
		const out = { hscroll: document.documentElement.scrollWidth > innerWidth + 1, small: [], primaryTop: null };
		const isVis = (el) => {
			const b = el.getBoundingClientRect();
			const st = getComputedStyle(el);
			return b.width > 0 && b.height > 0 && st.visibility !== "hidden" && b.bottom > 0 && b.top < innerHeight;
		};
		for (const el of document.querySelectorAll(".play button, .play a[href], .play [role=switch], .play [tabindex='0']")) {
			if (!isVis(el)) continue;
			const b = el.getBoundingClientRect();
			// Links inside a sentence are exempt (WCAG 2.5.5 inline exception).
			if (el.tagName === "A" && el.closest("p") && !el.classList.contains("play-pill")) continue;
			// A control may widen its touch area with an absolutely placed ::after (see play.css).
			let w = b.width;
			let h = b.height;
			const after = getComputedStyle(el, "::after");
			if (after.content !== "none" && after.position === "absolute") {
				const px = (v) => (v.endsWith("px") ? parseFloat(v) : 0);
				w = Math.max(w, b.width - px(after.left) - px(after.right));
				h = Math.max(h, b.height - px(after.top) - px(after.bottom));
			}
			if (w < 44 || h < 44) out.small.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")} ${Math.round(w)}x${Math.round(h)}`);
		}
		// A marker in the view must never sit on the story panel.
		const panel = document.querySelector(".play-panel:not(.is-clear) .play-panel-in")?.getBoundingClientRect();
		out.overlap = [];
		if (panel && panel.height > 0) {
			for (const m of document.querySelectorAll(".play-hotspot")) {
				if (!isVis(m)) continue;
				const r = m.getBoundingClientRect();
				if (r.bottom > panel.top && r.top < panel.bottom && r.right > panel.left && r.left < panel.right) out.overlap.push(m.getAttribute("aria-label"));
			}
		}
		// Joined text with a doubled full stop ("moved out.. 1800").
		const txt = document.querySelector(".play")?.innerText || "";
		const sr = [...document.querySelectorAll(".play .play-sr")].map((e) => e.textContent).join(" ");
		out.doubled = (txt + " " + sr).match(/[^.\s]\.\.(?!\.).{0,20}/g) || [];
		const primary = [...document.querySelectorAll(".play-panel .play-continue, .play-panel .play-pill.is-strong, .play-end-actions .play-pill")].find(isVis);
		if (primary) out.primaryTop = Math.round(primary.getBoundingClientRect().top);
		return out;
	});
	if (r.hscroll) report.hscroll.push(k);
	for (const o of r.overlap) report.markerOnPanel.push(`${k}: ${o}`);
	for (const d of r.doubled) report.doubledStops.push(`${k}: ${d}`);
	for (const s of r.small) report.smallTargets[s] = (report.smallTargets[s] || 0) + 1;
	if (r.primaryTop != null && r.primaryTop < 812 / 2) report.upperHalf[k] = r.primaryTop;
}

// Contrast of the story line against the brightest pixel behind it: the text is hidden for one
// screenshot, the box behind it is read, and its lightest pixel is compared with the text colour.
const lum = ([r, g, b]) => {
	const f = (c) => {
		c /= 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
	const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
	return (x + 0.05) / (y + 0.05);
};
async function contrastCheck(label) {
	const box = await page.evaluate(() => {
		const el = document.querySelector(".play-panel .play-line, .play-panel .play-ui-text");
		if (!el) return null;
		const b = el.getBoundingClientRect();
		const c = getComputedStyle(el).color.match(/[\d.]+/g).map(Number);
		el.dataset.q5 = el.style.color;
		el.style.color = "transparent";
		return { x: Math.max(0, b.x), y: Math.max(0, b.y), w: Math.min(b.width, innerWidth - b.x), h: Math.min(b.height, innerHeight - b.y), color: c };
	});
	if (!box || box.w < 4 || box.h < 4) return;
	await sleep(60);
	const png = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
	await page.evaluate(() => {
		const el = document.querySelector("[data-q5]");
		if (el) {
			el.style.color = el.dataset.q5;
			delete el.dataset.q5;
		}
	});
	const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
	let best = [0, 0, 0];
	let bestL = -1;
	for (let i = 0; i < data.length; i += info.channels) {
		const p = [data[i], data[i + 1], data[i + 2]];
		const l = lum(p);
		if (l > bestL) {
			bestL = l;
			best = p;
		}
	}
	const text = box.color.slice(0, 3);
	const alpha = box.color[3] ?? 1;
	const shown = text.map((c, i) => c * alpha + best[i] * (1 - alpha));
	report.contrast.push({ at: label, ratio: Number(ratio(shown, best).toFixed(2)), text: box.color, brightest: best });
}

async function axeCheck(label) {
	if (!useAxe) return;
	await page.addScriptTag({ path: AXE }).catch(() => {});
	const res = await page.evaluate(async () => {
		const r = await window.axe.run(document, { resultTypes: ["violations"], runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } });
		return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(" ") + " :: " + (n.failureSummary || "").split("\n").slice(1, 2).join("")) }));
	});
	report.axe[label] = res;
}

async function animationCheck(label) {
	if (!reduce) return;
	const running = await page.evaluate(() =>
		document
			.getAnimations()
			.filter((a) => {
				const d = a.effect?.getTiming?.().duration;
				return typeof d === "number" && d > 1 && a.playState === "running";
			})
			.map((a) => `${a.animationName || a.transitionProperty || "anim"} on ${a.effect?.target?.className || "?"}`),
	);
	if (running.length) report.animations.push({ at: label, running });
}

async function snapshot(label) {
	report.steps[label] = (report.steps[label] || 0) + 1;
	if (report.steps[label] > 1) return;
	await sleep(300);
	if (shots) await page.screenshot({ path: join(shots, `${mode}-${label}.png`) });
	await axeCheck(label);
}

// The Chapters sheet: focus goes in, Tab stays in, Escape closes it and focus comes back.
async function sheetCheck() {
	const btn = await first(".play-top-actions .play-pill:nth-of-type(2), .play-top-actions button");
	const chapters = await page.evaluateHandle(() => [...document.querySelectorAll(".play-top-actions button")].find((b) => b.textContent.trim() === "Chapters"));
	const el = chapters.asElement();
	if (btn) await btn.dispose();
	if (!el) return;
	await tabTo(el);
	await page.keyboard.press("Enter");
	await sleep(400);
	const inside = [];
	for (let i = 0; i < 25; i++) {
		inside.push(await page.evaluate(() => !!document.activeElement?.closest(".play-sheet")));
		await page.keyboard.press("Tab");
	}
	await page.keyboard.press("Escape");
	await sleep(300);
	const after = await page.evaluate(() => ({ open: !!document.querySelector(".play-sheet"), back: document.activeElement?.textContent?.trim() }));
	report.sheet = { focusStayedInside: inside.every(Boolean), closedByEscape: !after.open, focusBackOn: after.back };
}

// ---------------------------------------------------------------- the level

const t0 = Date.now();
await page.goto(`${BASE}/play/${SLUG}`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector(".play-panel", { timeout: 120000 });
await page.waitForFunction(() => performance.getEntriesByName("play:first-view").length, { timeout: 120000 });
if (mode === "keyboard") await sheetCheck();

const nodesSeen = new Set();
let guard = 0;
let last = "";
let same = 0;
while (guard++ < 2500) {
	const k = await kind();
	if (k === "end") break;
	if (!k) {
		await sleep(250);
		continue;
	}
	report.counts[k] = (report.counts[k] || 0) + 1;
	const node = await page.evaluate(() => document.querySelector(".play-where-node")?.textContent || "");
	const sig = `${k}|${node}|${await page.evaluate(() => document.querySelector(".play-panel")?.textContent?.slice(0, 120))}`;
	same = sig === last ? same + 1 : 0;
	last = sig;
	if (same > 60) throw new Error(`stuck at ${sig}`);

	await layoutChecks(k);
	await animationCheck(k);
	if (!nodesSeen.has(node) && (await page.$(".play-panel .play-line, .play-panel .play-ui-text"))) {
		nodesSeen.add(node);
		await sleep(600); // let the view settle
		await contrastCheck(`${k} at ${node}`);
	}

	if (k === "lens") {
		await snapshot("lens");
		const h = await page.evaluateHandle(() => [...document.querySelectorAll(".play-options.is-grid .play-option")].find((b) => /traveller/i.test(b.textContent)) || document.querySelector(".play-options.is-grid .play-option"));
		await press(h.asElement());
	} else if (k === "look") {
		if (await page.$(".play-evidence")) {
			await snapshot("look-evidence-open");
			await press(await first(".play-panel .play-continue"));
			continue;
		}
		await snapshot("look");
		const hint = await page.evaluate(() => ({ count: document.querySelector(".play-panel .play-count")?.textContent, hint: document.querySelector(".play-panel .play-ui-text")?.textContent }));
		if (/Nothing more/.test(hint.hint || "") && !report.hints.some((x) => x.hint === hint.hint)) report.hints.push(hint);
		const done = await first(".play-panel .play-continue");
		if (done) {
			await press(done);
			continue;
		}
		// tap and click: a marker in the view first, then a card; the keyboard uses the list.
		const marker = mode === "keyboard" ? null : await first(".play-hotspot.is-evidence:not(.is-done)");
		if (marker) {
			await press(marker);
			continue;
		}
		const card = await first(".play-tray-card:not(.is-done)");
		if (card) {
			await press(card);
			continue;
		}
		const list = await page.evaluateHandle(() => [...document.querySelectorAll(".play-panel .play-pill")].find((b) => b.textContent.trim() === "List"));
		await press(list.asElement());
		await page.waitForSelector(".play-sheet", { timeout: 5000 });
		await snapshot("sheet-evidence");
		const row = await page.evaluateHandle(() => [...document.querySelectorAll(".play-sheet .play-list-row")].find((r) => !r.querySelector(".play-list-state svg")));
		if (row.asElement()) {
			const away = await row.evaluate((r) => /^go to/i.test(r.querySelector(".play-list-kicker")?.textContent || ""));
			await press(row.asElement());
			// One tap on a "Go to" row moves there and opens the card.
			if (away) report.goToOpens.push(await page.waitForSelector(".play-evidence", { timeout: 3000 }).then(() => true, () => false));
		} else await page.keyboard.press("Escape");
		await sleep(400);
	} else if (k === "choice") {
		if (await page.$(".play-picked")) {
			await press(await first(".play-panel .play-continue"));
		} else {
			await snapshot("choice");
			await press(await first(".play-panel .play-option.is-row:not([disabled])"));
		}
	} else if (k === "restore") {
		if (await page.$(".play-piece")) {
			await snapshot("restore");
			const set = await page.evaluateHandle(() => [...document.querySelectorAll(".play-piece-actions .play-pill")].find((b) => !b.disabled));
			if (set.asElement()) {
				await press(set.asElement());
				await sleep(500);
				continue;
			}
			const loaded = await page.evaluate(() => !document.querySelector(".play-piece-actions .play-icon-btn")?.disabled);
			if (!loaded) {
				await sleep(300);
				continue;
			}
			if (mode === "keyboard") {
				const canvas = await first(".play-piece-canvas");
				await tabTo(canvas);
				await checkFocusRing();
				await canvas.dispose();
				await page.keyboard.press("ArrowRight");
				await sleep(120);
			} else {
				await press(await first('.play-piece-actions .play-icon-btn[aria-label="Turn right"]'));
			}
		} else if (await page.$(".play-panel.is-clear")) {
			await sleep(400);
		} else {
			await press(await first(".play-panel .play-continue"));
		}
	} else if (k === "order") {
		await snapshot("order");
		const cardH = await first(".play-order-card");
		if (cardH) {
			const before = await page.$$eval(".play-order-card", (x) => x.length);
			const slots = await page.$$eval(".play-order-slot", (x) => x.length);
			for (let i = 0; i < slots; i++) {
				const c = await first(".play-order-card");
				await press(c);
				const s = await page.evaluateHandle((n) => document.querySelectorAll(".play-order-slot")[n] || null, i);
				if (!s.asElement()) break;
				await press(s.asElement());
				await sleep(150);
				const now = await page.$$eval(".play-order-card", (x) => x.length);
				if (now < before) break;
			}
			await cardH.dispose().catch(() => {});
		} else {
			await press(await first(".play-panel .play-continue"));
		}
	} else if (k === "reveal") {
		await snapshot("reveal");
		await sleep(800);
	} else if (k === "proof") {
		const cont = await first(".play-panel .play-continue");
		if (cont) await press(cont);
		else {
			await snapshot("proof");
			await press(await first('.play-panel [role="switch"]'));
		}
	} else if (k === "vote") {
		const cont = await first(".play-panel .play-continue");
		if (cont) await press(cont);
		else {
			await snapshot("vote");
			await press(await first(".play-panel .play-option.is-vote"));
		}
	} else if (k === "know") {
		await snapshot("know");
		await press(await first(".play-panel .play-continue"));
	} else {
		await snapshot(k);
		const c = await first(".play-panel .play-continue");
		if (c) await press(c);
		else await sleep(250);
	}
}

await page.waitForSelector(".play-end", { timeout: 30000 });
await sleep(1500);
await snapshot("end");
await layoutChecks("end");
report.reachedEnd = !!(await page.$(".play-end"));
report.endButtons = await page.$$eval(".play-end-actions .play-pill", (x) => x.map((b) => b.textContent.trim()));
report.seconds = Math.round((Date.now() - t0) / 1000);
await browser.close();

const summary = {
	mode, reduce, reachedEnd: report.reachedEnd, seconds: report.seconds, anon,
	errors: report.errors,
	axe: Object.fromEntries(Object.entries(report.axe).map(([k, v]) => [k, v.filter((x) => x.impact === "serious" || x.impact === "critical").map((x) => `${x.impact} ${x.id}: ${x.nodes.join(" | ")}`)])),
	axeMinor: Object.fromEntries(Object.entries(report.axe).map(([k, v]) => [k, v.filter((x) => x.impact !== "serious" && x.impact !== "critical").map((x) => `${x.impact} ${x.id}`)])),
	notReachable: report.notReachable, noFocusRing: report.noFocusRing, sheet: report.sheet,
	smallTargets: report.smallTargets, primaryInUpperHalf: report.upperHalf, horizontalScroll: report.hscroll,
	contrastMin: report.contrast.reduce((m, c) => (m == null || c.ratio < m.ratio ? c : m), null), contrast: report.contrast,
	animations: report.animations, counts: report.counts, endButtons: report.endButtons,
	markerOnPanel: report.markerOnPanel, doubledStops: report.doubledStops, goToOpens: report.goToOpens, nothingMoreHints: report.hints,
};
console.log(JSON.stringify(summary, null, 1));
if (outFile) writeFileSync(outFile, JSON.stringify(summary, null, 1));
