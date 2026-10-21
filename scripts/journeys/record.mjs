// 30 second screen recordings of /journeys, desktop and phone, with the system Chrome.
//   node scripts/journeys/record.mjs [url]        (default http://localhost:3100/journeys)
// Writes docs/journeys/recording-desktop.{webm,mp4} and recording-mobile.{webm,mp4}.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const url = process.argv[2] || "http://localhost:3100/journeys";
const OUT = "docs/journeys";
mkdirSync(OUT, { recursive: true });

async function record({ name, width, height, mobile }) {
	const browser = await puppeteer.launch({
		executablePath: CHROME,
		headless: true,
		args: ["--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", `--window-size=${width},${height}`],
	});
	const page = await browser.newPage();
	await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
	if (mobile) {
		await page.setUserAgent("Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36");
	}
	await page.goto(url, { waitUntil: "networkidle0" });
	await new Promise((r) => setTimeout(r, 3000));

	const stops = await page.evaluate(() => {
		const els = [...document.querySelectorAll("[data-frame], [data-section]")];
		return els.map((el) => el.getBoundingClientRect().top + window.scrollY);
	});
	const webm = `${OUT}/${name}.webm`;
	const recorder = await page.screencast({ path: webm });
	const perStop = 30000 / (stops.length + 1);
	for (const y of stops) {
		await page.evaluate(
			(top, d) => {
				if (window.__lenis) window.__lenis.scrollTo(top, { duration: d / 1000 });
				else window.scrollTo({ top, behavior: "smooth" });
			},
			y,
			perStop * 0.8,
		);
		await new Promise((r) => setTimeout(r, perStop));
	}
	await new Promise((r) => setTimeout(r, 1000));
	await recorder.stop();
	await browser.close();
	execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", `${OUT}/${name}.mp4`], { stdio: "inherit" });
	console.log(`✔ ${name}`);
}

await record({ name: "recording-desktop", width: 1440, height: 900, mobile: false });
await record({ name: "recording-mobile", width: 390, height: 844, mobile: true });
