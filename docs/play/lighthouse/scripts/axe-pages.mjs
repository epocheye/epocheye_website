// axe-core on the Play pages other than the level (the level is checked step by step by
// playthrough.mjs), at 375x812, plus the same layout checks: no horizontal scroll, tap targets.
// A card is made first through POST /api/play/card, as the end card does.
//
//   node docs/play/lighthouse/scripts/axe-pages.mjs [out.json]

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { BASE, PHONE, SLUG, launch, sleep, testAnon, testPage, watchErrors } from "./common.mjs";

const require = createRequire(import.meta.url);
const AXE = require.resolve("axe-core/axe.min.js");
const outFile = process.argv[2] || null;

// A card that matches the story: the first accepted option of every choice, and the first vote option.
const site = JSON.parse(readFileSync(`public/play/packs/${SLUG}/v1/site.json`, "utf8"));
const beats = [...site.story.chapters.flatMap((c) => c.beats || []), ...(site.story.ending?.beats || [])];
const choices = Object.fromEntries(beats.filter((b) => b.type === "choice").map((b) => [b.id, (b.options.find((o) => o.accepted) || b.options[0]).id]));
const vote = beats.find((b) => b.type === "vote")?.options?.[0]?.id || null;
const anon = testAnon();
const made = await fetch(`${BASE}/api/play/card`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ anon, site: SLUG, lens: site.story.default_lens || "traveller", choices, vote }),
}).then((r) => r.json());
console.log("card", JSON.stringify(made));

const paths = ["/play", "/play/daily", "/play/vote", "/play/leaderboards", made.ok ? `/play/c/${made.id}` : null, "/play/privacy"].filter(Boolean);
const results = { card: made.ok ? made.id : null, anon, pages: {} };
const browser = await launch();
for (const path of paths) {
	const { page } = await testPage(browser, { viewport: PHONE, anon });
	const errors = watchErrors(page, []);
	await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2", timeout: 120000 });
	await sleep(800);
	await page.addScriptTag({ path: AXE });
	const violations = await page.evaluate(async () => {
		const r = await window.axe.run(document, { resultTypes: ["violations"], runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } });
		return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.slice(0, 5).map((n) => `${n.target.join(" ")} :: ${(n.failureSummary || "").split("\n").slice(1, 2).join("")}`) }));
	});
	const layout = await page.evaluate(() => {
		const small = [];
		for (const el of document.querySelectorAll("main button, main a[href], main input, main select, main [role=switch]")) {
			const b = el.getBoundingClientRect();
			if (!b.width || !b.height) continue;
			if (el.tagName === "A" && el.closest("p, li") && !el.className.includes("play-pill")) continue; // inline links
			let w = b.width;
			let h = b.height;
			const after = getComputedStyle(el, "::after");
			if (after.content !== "none" && after.position === "absolute") {
				const px = (v) => (v.endsWith("px") ? parseFloat(v) : 0);
				w = Math.max(w, b.width - px(after.left) - px(after.right));
				h = Math.max(h, b.height - px(after.top) - px(after.bottom));
			}
			const label = el.tagName === "INPUT" && (el.type === "checkbox" || el.type === "radio") ? el.closest("label") : null;
			if (label) {
				const lb = label.getBoundingClientRect();
				w = Math.max(w, lb.width);
				h = Math.max(h, lb.height);
			}
			if (w < 44 || h < 44) small.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ").join(".")} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${Math.round(w)}x${Math.round(h)}`);
		}
		return { hscroll: document.documentElement.scrollWidth > innerWidth + 1, small };
	});
	results.pages[path] = { serious: violations.filter((v) => v.impact === "serious" || v.impact === "critical"), other: violations.filter((v) => v.impact !== "serious" && v.impact !== "critical").map((v) => `${v.impact} ${v.id}`), ...layout, errors };
	console.log(path, JSON.stringify(results.pages[path], null, 1));
	await page.close();
}
await browser.close();
if (outFile) writeFileSync(outFile, JSON.stringify(results, null, 1));
