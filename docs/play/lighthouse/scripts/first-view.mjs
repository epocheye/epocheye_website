// First playable view, bytes before it, and frame rate while dragging the panorama.
//
//   node docs/play/lighthouse/scripts/first-view.mjs [runs=3] [profile=task|lh] [out.json]
//
// First playable view: the moment the six 512 px faces of the start viewpoint are drawn and the
// first story line is on screen. Measured in headless Chrome at Lighthouse's phone size, cold
// cache (a new browser profile every run, cache disabled), 4x CPU slowdown and slow 4G:
//   task  150 ms RTT, 1.6 Mbps down, 750 kbps up (the figures in the Phase 5 brief)
//   lh    Lighthouse's own devtools slow 4G: 562.5 ms request latency, 1.47 Mbps down, 675 kbps up
//   good4g  9 Mbps down, 1.5 Mbps up, 60 ms: a good 4G connection, for comparison only
// Frame rate: the panorama dragged for 5 s under the same CPU slowdown, once the view has
// settled. Headless Chrome draws WebGL in software (SwiftShader), which is slower than a phone GPU.

import { writeFileSync } from "node:fs";
import { BASE, CPU_SLOWDOWN, MOTO, NETWORK_4G, SLUG, launch, median, percentile, sleep, testPage, watchErrors } from "./common.mjs";

const runs = Number(process.argv[2] || 3);
const profile = process.argv[3] || "task";
const outFile = process.argv[4] || null;
const PROFILES = {
	task: NETWORK_4G,
	lh: { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1024 * 1024 * 0.9) / 8, uploadThroughput: (750 * 1024 * 0.9) / 8 },
	// A good 4G connection, for comparison only (our figures, not a Lighthouse profile).
	good4g: { offline: false, latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 },
};
const NETWORK = PROFILES[profile] || NETWORK_4G;
const url = `${BASE}/play/${SLUG}`;

// Installed before any page script: notes when the first view is up, and counts WebGL draws per frame.
function probe() {
	const fv = { pano: null, panoSeen: null, line: null, lineText: "" };
	window.__fv = fv;
	window.__draws = 0;
	for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
		if (!C) continue;
		const orig = C.prototype.drawElements;
		C.prototype.drawElements = function (...a) {
			window.__draws++;
			return orig.apply(this, a);
		};
	}
	const tick = (now) => {
		if (fv.panoSeen != null && fv.pano == null) fv.pano = now; // the frame after the mark: the faces are drawn
		if (fv.panoSeen == null && performance.getEntriesByName("play:first-view").length) fv.panoSeen = now;
		if (fv.line == null) {
			const el = document.querySelector(".play-panel .play-line");
			const text = el?.textContent?.trim();
			if (text && el.getClientRects().length) {
				fv.line = now;
				fv.lineText = text;
			}
		}
		if (fv.pano == null || fv.line == null) requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
}

// FV_GL=swiftshader draws WebGL in software (the pessimistic case); otherwise Chrome uses this
// machine's GPU, which is faster than a mid-range phone's.
const GL = process.env.FV_GL === "swiftshader" ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : [];

async function oneRun(i) {
	const browser = await launch(GL);
	const errors = [];
	try {
		const { page, anon } = await testPage(browser, { viewport: MOTO });
		watchErrors(page, errors);
		await page.evaluateOnNewDocument(probe);
		const cdp = await page.createCDPSession();
		await cdp.send("Network.enable");
		await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
		await cdp.send("Network.emulateNetworkConditions", NETWORK);
		await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });

		await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
		await page.waitForFunction(() => window.__fv && window.__fv.pano != null && window.__fv.line != null, { timeout: 120000, polling: 200 });
		const fv = await page.evaluate(() => {
			const f = window.__fv;
			const at = Math.max(f.pano, f.line);
			const nav = performance.getEntriesByType("navigation")[0];
			const res = performance.getEntriesByType("resource");
			const before = res.filter((r) => r.responseEnd <= at);
			const started = res.filter((r) => r.startTime <= at && r.responseEnd > at);
			const faces = before.filter((r) => /\/pano\//.test(r.name)).map((r) => r.name.split("/pano/")[1]);
			const gl = (() => {
				const c = document.createElement("canvas").getContext("webgl");
				const ext = c?.getExtension("WEBGL_debug_renderer_info");
				return ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";
			})();
			return {
				pano: f.pano, line: f.line, at, lineText: f.lineText, gl,
				bytesBefore: (nav?.transferSize || 0) + before.reduce((s, r) => s + (r.transferSize || 0), 0),
				requestsBefore: before.length + 1,
				inFlight: started.map((r) => r.name.replace(location.origin, "")),
				faces,
				list: [{ name: location.pathname, bytes: nav?.transferSize || 0, end: nav?.responseEnd }, ...before.map((r) => ({ name: r.name.replace(location.origin, ""), bytes: r.transferSize, end: Math.round(r.responseEnd) }))],
				fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null,
			};
		});

		if (process.env.FV_NOFPS === "1") {
			const out = { run: i, anon, firstViewMs: Math.round(fv.at), panoMs: Math.round(fv.pano), lineMs: Math.round(fv.line), fcpMs: fv.fcp && Math.round(fv.fcp), bytesBefore: fv.bytesBefore, requestsBefore: fv.requestsBefore, list: fv.list, errors };
			console.log(`run ${i}: first view ${out.firstViewMs} ms (pano ${out.panoMs}, line ${out.lineMs}), ${(out.bytesBefore / 1024).toFixed(0)} KB in ${out.requestsBefore} requests; errors ${errors.length}`);
			return out;
		}
		// Let the view settle (sharper faces arrive in the background), then drag for 5 s.
		const settleStart = Date.now();
		let last = await page.evaluate(() => performance.getEntriesByType("resource").length);
		for (;;) {
			await sleep(2500);
			const n = await page.evaluate(() => performance.getEntriesByType("resource").length);
			if (n === last || Date.now() - settleStart > 45000) break;
			last = n;
		}
		const box = await page.evaluate(() => {
			const r = document.querySelector(".play-pano-canvas").getBoundingClientRect();
			return { x: r.x + r.width / 2, y: r.y + r.height * 0.3 };
		});
		await page.evaluate(() => {
			window.__frames = [];
			window.__drawFrames = 0;
			let lastDraws = window.__draws;
			window.__recording = true;
			const rec = (t) => {
				if (!window.__recording) return;
				window.__frames.push(t);
				if (window.__draws !== lastDraws) window.__drawFrames++;
				lastDraws = window.__draws;
				requestAnimationFrame(rec);
			};
			requestAnimationFrame(rec);
		});
		await page.mouse.move(box.x, box.y);
		await page.mouse.down();
		const t0 = Date.now();
		let k = 0;
		while (Date.now() - t0 < 5000) {
			k++;
			await page.mouse.move(box.x + Math.sin(k / 12) * 140, box.y + Math.cos(k / 17) * 30);
		}
		await page.mouse.up();
		const fps = await page.evaluate(() => {
			window.__recording = false;
			const f = window.__frames;
			const d = [];
			for (let j = 1; j < f.length; j++) d.push(f[j] - f[j - 1]);
			return { intervals: d, drawFrames: window.__drawFrames, span: f.length > 1 ? f[f.length - 1] - f[0] : 0 };
		});
		const fpsOf = (ms) => 1000 / ms;
		const out = {
			run: i, anon,
			firstViewMs: Math.round(fv.at), panoMs: Math.round(fv.pano), lineMs: Math.round(fv.line), fcpMs: fv.fcp && Math.round(fv.fcp),
			bytesBefore: fv.bytesBefore, requestsBefore: fv.requestsBefore, inFlight: fv.inFlight, faces: fv.faces, firstLine: fv.lineText, gl: fv.gl,
			fpsMedian: Number(fpsOf(median(fps.intervals)).toFixed(1)),
			fpsP5: Number(fpsOf(percentile(fps.intervals, 95)).toFixed(1)),
			panoFramesPerSecond: Number(((fps.drawFrames / fps.span) * 1000).toFixed(1)),
			frames: fps.intervals.length,
			list: fv.list,
			errors,
		};
		console.log(`run ${i}: first view ${out.firstViewMs} ms (pano ${out.panoMs}, line ${out.lineMs}), ${(out.bytesBefore / 1024).toFixed(0)} KB in ${out.requestsBefore} requests; drag fps median ${out.fpsMedian}, p5 ${out.fpsP5}, pano redraws ${out.panoFramesPerSecond}/s; errors ${errors.length}`);
		return out;
	} finally {
		await browser.close();
	}
}

// The first load after a server start is slow (the route and the browser warm up): one load is
// made and thrown away before the measured runs. Cold cache still holds for every measured run
// (a new browser profile each time).
await fetch(url).then((r) => r.text()).catch(() => null);
{
	const warm = await launch();
	const { page: p } = await testPage(warm, { viewport: MOTO });
	await p.goto(url, { waitUntil: "load", timeout: 120000 }).catch(() => null);
	await warm.close();
}
const results = [];
for (let i = 1; i <= runs; i++) results.push(await oneRun(i));
const summary = {
	url, profile, network: NETWORK, cpuSlowdown: CPU_SLOWDOWN, viewport: MOTO, runs: results.length,
	firstViewMedianMs: median(results.map((r) => r.firstViewMs)),
	bytesBeforeMedian: median(results.map((r) => r.bytesBefore)),
	fpsMedian: median(results.map((r) => r.fpsMedian)),
	fpsP5Median: median(results.map((r) => r.fpsP5)),
	gl: results[0]?.gl,
	results,
};
console.log(JSON.stringify({ ...summary, results: undefined }, null, 1));
if (outFile) writeFileSync(outFile, JSON.stringify(summary, null, 1));
