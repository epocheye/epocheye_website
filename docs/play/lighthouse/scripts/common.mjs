// Shared bits for the Phase 5 quality measurements (docs/play/QUALITY.md).
// Run with node from the repo root against a local production server (npm run build, then
// npx next start -p <port>). Every player these scripts make has an anonymous id starting
// "test-q5-"; cleanup.mjs removes their rows afterwards.

import { randomBytes } from "node:crypto";
import puppeteer from "puppeteer-core";

export const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
export const BASE = (process.env.PLAY_BASE || "http://localhost:3105").replace(/\/$/, "");
export const SLUG = "tipu-summer-palace-bengaluru";

// Lighthouse's mobile profile: slow 4G as Lighthouse defines it, and a 4x CPU slowdown.
export const NETWORK_4G = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };
export const CPU_SLOWDOWN = 4;
// Lighthouse's emulated phone (Moto G Power class).
export const MOTO = { width: 412, height: 823, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true };
export const PHONE = { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

export const testAnon = () => `test-q5-${randomBytes(8).toString("hex")}`;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function launch(extra = []) {
	// Through the local HTTP/2 proxy (h2proxy.mjs) the certificate is a throwaway self-signed one.
	const tls = BASE.startsWith("https:") ? ["--ignore-certificate-errors"] : [];
	return puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--mute-audio", "--no-first-run", ...tls, ...extra] });
}

// A page that plays as a test player: the anonymous id is set before any page script runs.
export async function testPage(browser, { viewport = PHONE, anon = testAnon(), reduce = false } = {}) {
	const page = await browser.newPage();
	await page.setViewport(viewport);
	if (reduce) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
	await page.evaluateOnNewDocument((id) => {
		try {
			localStorage.setItem("play:anon", id);
		} catch {
			// storage blocked
		}
	}, anon);
	return { page, anon };
}

// Console errors and failed requests, except the Vercel analytics script (it exists only on Vercel).
export function watchErrors(page, list = []) {
	const vercel = /_vercel\/|vercel-insights|\/_vercel|va\.vercel/i;
	page.on("console", (m) => {
		if (m.type() !== "error") return;
		const loc = m.location()?.url || "";
		if (vercel.test(loc) || vercel.test(m.text())) return;
		list.push(`console: ${m.text()} ${loc}`);
	});
	page.on("pageerror", (e) => list.push(`pageerror: ${e.message || e}`));
	page.on("response", (r) => {
		if (r.status() >= 400 && !vercel.test(r.url())) list.push(`${r.status()} ${r.url()}`);
	});
	page.on("requestfailed", (r) => {
		if (!vercel.test(r.url()) && !/ERR_ABORTED/.test(r.failure()?.errorText || "")) list.push(`failed ${r.url()} ${r.failure()?.errorText}`);
	});
	return list;
}

export const median = (xs) => {
	const s = [...xs].sort((a, b) => a - b);
	const n = s.length;
	return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN;
};
export const percentile = (xs, p) => {
	const s = [...xs].sort((a, b) => a - b);
	if (!s.length) return NaN;
	const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
	return s[i];
};
