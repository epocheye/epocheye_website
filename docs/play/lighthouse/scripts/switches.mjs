// Each Play feature switch turned off once on a local production server (lib/play/features.js).
// Starts `next start` on PORT with one switch off, checks pages, API routes and links (plain
// fetches, as a bot would) and the pages in headless Chrome (no console errors, no failed
// requests, nothing switched off is asked for), then stops the server. Needs `npm run build` first.
//
//   node docs/play/lighthouse/scripts/switches.mjs [PLAY_DAILY ...]   (default: all seven)

import { spawn, execSync } from "node:child_process";
import { PHONE, SLUG, launch, sleep, testAnon, testPage, watchErrors } from "./common.mjs";
const PORT = 3106;
const base = `http://localhost:${PORT}`;
const ALL = ["PLAY_ENABLED", "PLAY_DAILY", "PLAY_VOTE", "PLAY_LEADERBOARDS", "PLAY_EMAIL", "PLAY_NARRATION", "PLAY_ANALYTICS"];
const which = process.argv.length > 2 ? process.argv.slice(2) : ALL;
const anon = testAnon();
let fails = 0;
const check = (ok, msg) => {
	console.log(`  ${ok ? "PASS" : "FAIL"}  ${msg}`);
	if (!ok) fails++;
};

async function startServer(env) {
	const child = spawn("npx", ["next", "start", "-p", String(PORT)], { env: { ...process.env, ...env }, shell: true, stdio: "ignore" });
	for (let i = 0; i < 60; i++) {
		await sleep(500);
		try {
			const r = await fetch(`${base}/play/privacy`);
			if (r.status) return child;
		} catch {
			// not up yet
		}
	}
	throw new Error("server did not start");
}
function stopServer(child) {
	try {
		execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
	} catch {
		// already gone
	}
}

const get = async (path) => {
	const r = await fetch(base + path, { redirect: "manual" });
	return { status: r.status, text: await r.text() };
};
const post = async (path, body) => {
	const r = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
	return { status: r.status, json: await r.json().catch(() => null) };
};
const hrefs = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

// Opens a page in Chrome and returns the API calls it made and any error.
async function visit(browser, path, waitMs = 4000) {
	const { page } = await testPage(browser, { viewport: PHONE, anon });
	const errors = watchErrors(page, []);
	const calls = [];
	page.on("request", (r) => {
		if (r.url().includes("/api/play/") || r.url().includes("/audio/")) calls.push(r.url().replace(base, ""));
	});
	await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 120000 });
	await sleep(waitMs);
	const text = await page.evaluate(() => document.body.innerText);
	const links = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
	const buttons = await page.$$eval("button", (bs) => bs.map((b) => b.textContent.trim()));
	return { page, errors, calls, text, links, buttons };
}

const API = {
	daily: [["GET", "/api/play/daily"], ["POST", "/api/play/daily/me"], ["POST", "/api/play/daily/start"]],
	vote: [["GET", "/api/play/vote"], ["POST", "/api/play/vote"], ["POST", "/api/play/vote/me"]],
	leaderboards: [["POST", "/api/play/leaderboard"]],
	email: [["POST", "/api/play/email"], ["POST", "/api/play/email/status"], ["POST", "/api/play/email/confirm"], ["POST", "/api/play/email/restore"]],
	analytics: [["POST", "/api/play/event"]],
	all: [["POST", "/api/play/player"], ["POST", "/api/play/card"], ["POST", "/api/play/run/progress"], ["POST", "/api/play/run/finish"], ["POST", "/api/play/year-vote"], ["GET", `/api/play/year-vote?site=${SLUG}`]],
};
async function api404(list) {
	for (const [m, p] of list) {
		const r = m === "GET" ? await get(p) : await post(p, { anon });
		check(r.status === 404, `${m} ${p} answers 404 (got ${r.status})`);
	}
}

for (const name of which) {
	console.log(`\n${name}=off`);
	const server = await startServer({ [name]: "off" });
	const browser = await launch();
	try {
		if (name === "PLAY_ENABLED") {
			for (const p of ["/play", `/play/${SLUG}`, "/play/daily", "/play/vote", "/play/leaderboards", "/play/c/4wTzdGG4y", "/play/unlock"]) {
				const r = await get(p);
				check(r.status === 200 && r.text.includes("Coming soon") && !r.text.includes("play-panel") && !r.text.includes("/pano/"), `${p}: Coming soon, no game`);
			}
			const priv = await get("/play/privacy");
			check(priv.status === 200 && priv.text.includes("What Play keeps"), "/play/privacy still answers");
			const stop = await get("/play/unlock/stop");
			check(stop.status === 200 && stop.text.includes("Stop Play emails"), "/play/unlock/stop still answers");
			await api404([...API.all, ...API.daily, ...API.vote, ...API.leaderboards, ...API.email, ...API.analytics]);
			const unsub = await post("/api/play/email/unsubscribe", { t: "x" });
			check(unsub.status !== 404, `unsubscribe API still answers (${unsub.status})`);
			const v = await visit(browser, "/play", 2500);
			check(v.errors.length === 0 && v.calls.length === 0, `/play in Chrome: no errors, no API calls (${v.errors.join("; ")}${v.calls.join(", ")})`);
			check(v.links.every((h) => !/^\/play\/(daily|vote|leaderboards)/.test(h)), "no links into the game");
		}
		if (name === "PLAY_DAILY") {
			const r = await get("/play/daily");
			check(r.text.includes("The daily puzzle is not available right now"), "/play/daily: not available page");
			await api404(API.daily);
			const home = await get("/play");
			check(!hrefs(home.text).includes("/play/daily"), "/play has no daily link");
			const lb = await get("/play/leaderboards");
			check(!hrefs(lb.text).includes("/play/daily") && !lb.text.includes("Daily streaks"), "/play/leaderboards has no daily link and no streak board");
		}
		if (name === "PLAY_VOTE") {
			const r = await get("/play/vote");
			check(r.text.includes("The weekly vote is not available right now"), "/play/vote: not available page");
			await api404(API.vote);
			const v = await visit(browser, "/play", 2500);
			check(!v.links.some((h) => h.startsWith("/play/vote")), "/play has no vote links (header or locked cards)");
			check(v.errors.length === 0, `/play in Chrome: no errors (${v.errors.join("; ")})`);
		}
		if (name === "PLAY_LEADERBOARDS") {
			const r = await get("/play/leaderboards");
			check(r.text.includes("The leaderboards are not available right now"), "/play/leaderboards: not available page");
			await api404(API.leaderboards);
			const home = await get("/play");
			check(!hrefs(home.text).includes("/play/leaderboards"), "/play has no leaderboards link");
			const daily = await post("/api/play/daily/me", { anon });
			check(daily.status === 200 && daily.json?.board == null, "the daily API sends no board");
			const v = await visit(browser, "/play/daily", 3000);
			check(!v.links.includes("/play/leaderboards") && v.errors.length === 0, `/play/daily in Chrome: no board link, no errors (${v.errors.join("; ")})`);
		}
		if (name === "PLAY_EMAIL") {
			const r = await get("/play/unlock");
			check(r.text.includes("This email link is not available right now"), "/play/unlock: not available page");
			const stop = await get("/play/unlock/stop");
			check(stop.text.includes("Stop Play emails"), "/play/unlock/stop still answers");
			await api404(API.email);
			await api404(API.vote); // the vote needs email
			const v = await visit(browser, "/play", 3000);
			check(!v.buttons.some((b) => /week early/i.test(b)) && !v.calls.some((c) => c.includes("/email/")), `/play: no email offer and no email call (${v.calls.join(", ")})`);
			check(!v.links.some((h) => h.startsWith("/play/vote")), "/play: no vote links (the vote needs email)");
			check(v.errors.length === 0, `/play in Chrome: no errors (${v.errors.join("; ")})`);
		}
		if (name === "PLAY_NARRATION") {
			const v = await visit(browser, `/play/${SLUG}`, 5000);
			check(!v.buttons.some((b) => /^Sound/.test(b)), "level: no Sound button");
			check(!v.calls.some((c) => c.includes("/audio/")), "level: no audio fetched");
			check(v.errors.length === 0, `level in Chrome: no errors (${v.errors.join("; ")})`);
		}
		if (name === "PLAY_ANALYTICS") {
			await api404(API.analytics);
			const v = await visit(browser, `/play/${SLUG}`, 1500);
			// Move the story on a few lines and leave the page: events would be sent then.
			for (let i = 0; i < 4; i++) {
				await v.page.evaluate(() => document.querySelector(".play-panel .play-continue")?.click());
				await sleep(300);
			}
			await v.page.goto(`${base}/play`, { waitUntil: "domcontentloaded" });
			await sleep(5500);
			check(!v.calls.some((c) => c.includes("/api/play/event")), `no analytics event sent (${v.calls.join(", ")})`);
			check(v.calls.some((c) => c.includes("/api/play/run/progress")), "game records still kept (run progress)");
			check(v.errors.length === 0, `no errors (${v.errors.join("; ")})`);
		}
	} finally {
		await browser.close();
		stopServer(server);
		await sleep(1500);
	}
}
console.log(`\ntest player ${anon}`);
console.log(fails ? `${fails} check(s) failed` : "all checks passed");
process.exit(fails ? 1 : 0);
