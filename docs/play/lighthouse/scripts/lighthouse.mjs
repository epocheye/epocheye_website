// Lighthouse mobile reports for the Play pages, with Lighthouse's default mobile settings
// (simulated slow 4G, 4x CPU slowdown, Moto G Power screen).
//
//   node docs/play/lighthouse/scripts/lighthouse.mjs <out dir> [path ...]
//
// The page is opened as a test player (anonymous id "test-q5-...") so no real player row is made.
// Writes <name>.report.html and <name>.report.json per page, and prints the scores and metrics.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import lighthouse from "lighthouse";
import { BASE, SLUG, launch, testAnon } from "./common.mjs";

const out = process.argv[2] || "docs/play/lighthouse";
const paths = process.argv.length > 3 ? process.argv.slice(3) : ["/play", `/play/${SLUG}`, "/play/daily"];
mkdirSync(out, { recursive: true });

const nameOf = (p) => (p === "/play" ? "play" : p.replace(/^\/play\//, "play-").replace(/[^a-z0-9-]+/gi, "-"));
const rows = [];
for (const path of paths) {
	const browser = await launch();
	try {
		const page = await browser.newPage();
		const anon = testAnon();
		await page.evaluateOnNewDocument((id) => {
			try {
				localStorage.setItem("play:anon", id);
			} catch {
				// storage blocked
			}
		}, anon);
		const result = await lighthouse(
			`${BASE}${path}`,
			{ output: ["html", "json"], logLevel: "error", onlyCategories: ["performance", "accessibility", "best-practices", "seo"] },
			undefined,
			page,
		);
		const [html, json] = result.report;
		const name = nameOf(path);
		writeFileSync(join(out, `${name}.report.html`), html);
		writeFileSync(join(out, `${name}.report.json`), json);
		const lhr = result.lhr;
		const a = lhr.audits;
		const row = {
			path, anon,
			performance: Math.round(lhr.categories.performance.score * 100),
			accessibility: Math.round(lhr.categories.accessibility.score * 100),
			bestPractices: Math.round(lhr.categories["best-practices"].score * 100),
			seo: Math.round(lhr.categories.seo.score * 100),
			fcp: a["first-contentful-paint"].displayValue,
			lcp: a["largest-contentful-paint"].displayValue,
			tbt: a["total-blocking-time"].displayValue,
			cls: a["cumulative-layout-shift"].displayValue,
			si: a["speed-index"].displayValue,
			bytes: Math.round(a["total-byte-weight"].numericValue / 1024),
		};
		rows.push(row);
		console.log(JSON.stringify(row));
	} finally {
		await browser.close();
	}
}
writeFileSync(join(out, "summary.json"), JSON.stringify(rows, null, 1));
