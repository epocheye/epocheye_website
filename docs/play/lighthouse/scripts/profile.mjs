// CPU profile of a page load (4x CPU slowdown, no network throttling), top functions by self time.
// A diagnosis aid for QUALITY.md, not a measurement of the bar.
//
//   node docs/play/lighthouse/scripts/profile.mjs [path] [seconds]

import { BASE, CPU_SLOWDOWN, MOTO, SLUG, launch, sleep, testPage } from "./common.mjs";

const path = process.argv[2] || `/play/${SLUG}`;
const seconds = Number(process.argv[3] || 12);
const browser = await launch();
try {
	const { page } = await testPage(browser, { viewport: MOTO });
	const cdp = await page.createCDPSession();
	await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });
	await cdp.send("Profiler.enable");
	await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
	await cdp.send("Profiler.start");
	await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
	await sleep(seconds * 1000);
	const { profile } = await cdp.send("Profiler.stop");
	const dt = profile.timeDeltas;
	const self = new Map();
	const byId = new Map(profile.nodes.map((n) => [n.id, n]));
	for (let i = 0; i < profile.samples.length; i++) {
		const n = byId.get(profile.samples[i]);
		const f = n.callFrame;
		const key = `${f.functionName || "(anon)"} ${f.url.replace(BASE, "")}:${f.lineNumber}:${f.columnNumber}`;
		self.set(key, (self.get(key) || 0) + (dt[i] || 0) / 1000);
	}
	const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
	for (const [k, ms] of top) console.log(String(Math.round(ms)).padStart(6), k);
} finally {
	await browser.close();
}
