// Plays today's Missing Piece in headless Chrome at 375x812 against a running server, then removes
// every row it wrote. Test players have anonymous ids starting "test-daily-".
//
//   node --env-file=.env.local tools/play/daily/smoke.mjs http://localhost:3000 [shots-dir]
//
// Checks: GET carries no answers; a right run (tap path) counts 2 of 2 with a streak, and a
// brand-new player is told their first day is not on the board; a second try the same day is checked but not counted; a wrong run (keyboard only) counts
// 0; the chapter button opens the right chapter; reduced motion turns the animation off; no
// console errors. Needs DATABASE_URL (to clean up) and puppeteer-core with a local Chrome.

import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import puppeteer from "puppeteer-core";
import { neon } from "@neondatabase/serverless";
import { gameDay, puzzleForDay } from "../../../lib/play/daily.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const shots = process.argv[3] ? resolve(process.argv[3]) : null;
if (shots) mkdirSync(shots, { recursive: true });
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = neon(process.env.DATABASE_URL);

let fails = 0;
const check = (ok, msg) => {
	console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
	if (!ok) fails++;
};

// The same puzzle the server picks today, read from the generated files (so the test knows answers).
const dir = join(ROOT, "content", "play", "daily");
const files = (readFileSync(join(dir, "index.js"), "utf8").match(/"\.\/[^"]+\.json"/g) || []).map((m) => JSON.parse(readFileSync(join(dir, m.slice(3, -1)), "utf8")));
const day = gameDay();
const { file: pfile, puzzle } = puzzleForDay(files, day);
const right = Object.fromEntries(puzzle.questions.map((q) => [q.id, q.answer[0]]));
const wrong = Object.fromEntries(puzzle.questions.map((q) => [q.id, q.options.find((o) => !q.answer.includes(o.id)).id]));
console.log(`day ${day}, puzzle ${puzzle.id}, ${puzzle.questions.length} questions, chapter ${puzzle.chapter.n}`);

const anonA = `test-daily-${randomBytes(8).toString("hex")}`;
const anonB = `test-daily-${randomBytes(8).toString("hex")}`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--mute-audio"] });
const errors = [];

async function openAs(anon, { reduce = false } = {}) {
	const page = await browser.newPage();
	await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
	if (reduce) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
	page.on("console", (m) => {
		if (m.type() === "error" && !/vercel|insights|Failed to load resource/i.test(m.text())) errors.push(m.text());
	});
	page.on("pageerror", (e) => errors.push(String(e)));
	// A failed load names its address here; the console line does not.
	page.on("response", (r) => {
		if (r.status() >= 400 && !/_vercel\//.test(r.url())) errors.push(`${r.status()} ${r.url()}`);
	});
	await page.evaluateOnNewDocument((id) => {
		try {
			localStorage.setItem("play:anon", id);
		} catch {
			// ignore
		}
	}, anon);
	await page.goto(`${base}/play/daily`, { waitUntil: "domcontentloaded", timeout: 120000 });
	return page;
}

const clickText = (page, sel, text) =>
	page.evaluate(
		(s, t) => {
			const el = [...document.querySelectorAll(s)].find((b) => b.textContent.trim() === t && !b.disabled);
			if (!el) return false;
			el.click();
			return true;
		},
		sel,
		text,
	);
const pick = (page, qid, id) => page.evaluate((q, v) => document.querySelector(`input[name="q-${q}"][value="${v}"]`).closest("label").click(), qid, id);
const shot = async (page, name) => {
	if (shots) await page.screenshot({ path: join(shots, `${name}.png`), fullPage: true });
};

try {
	// ---- the API hides the answers
	const get = await (await fetch(`${base}/api/play/daily`)).json();
	check(get.ok && get.day === day && get.puzzle.id === puzzle.id, `GET /api/play/daily gives today's puzzle (${get.puzzle?.id})`);
	check(!JSON.stringify(get).includes('"answer"') && !JSON.stringify(get).includes('"explain"') && !JSON.stringify(get).includes('"chapter":'), "GET carries no answers, explanations or chapter");

	// ---- player A: tap path, every answer right
	const a = await openAs(anonA);
	await a.waitForSelector(".play-daily-clue", { timeout: 120000 });
	await sleep(800);
	await shot(a, "1-clue");
	const clueCount = puzzle.clues.length;
	for (let i = 0; i < clueCount; i++) {
		const label = i === clueCount - 1 ? "To the questions" : "Next clue";
		check(await clickText(a, ".play-daily-actions button", label), `tap "${label}"`);
		await sleep(250);
	}
	const shownClues = await a.$$eval(".play-daily-clue", (els) => els.length);
	check(shownClues === 0, `clues give way to the questions after ${clueCount} taps`);
	for (let i = 0; i < puzzle.questions.length; i++) {
		const q = puzzle.questions[i];
		await a.waitForSelector(`input[name="q-${q.id}"]`);
		if (i === 0) await shot(a, "2-question");
		await pick(a, q.id, right[q.id]);
		await sleep(150);
		const last = i === puzzle.questions.length - 1;
		check(await clickText(a, ".play-daily-actions button", last ? "Check my answers" : "Next question"), `answer question ${i + 1} (${q.kind}) and go on`);
		await sleep(250);
	}
	await a.waitForSelector(".play-daily-result", { timeout: 30000 });
	await sleep(1200);
	await shot(a, "3-result-right");
	const ra = await a.evaluate(() => ({
		score: document.querySelector(".play-daily-score-line")?.textContent || "",
		squares: [...document.querySelectorAll(".play-daily-square")].map((s) => s.classList.contains("is-right")),
		notes: [...document.querySelectorAll(".play-daily-score .play-note")].map((n) => n.textContent),
		chapter: document.querySelector(".play-daily-chapter-line")?.textContent || "",
		href: document.querySelector(".play-daily-chapter a")?.getAttribute("href") || "",
		mine: document.querySelector(".play-board-row.is-mine")?.textContent || "",
		focus: document.activeElement?.textContent || "",
	}));
	const max = puzzle.questions.length;
	check(ra.score.startsWith(`${max} of ${max} right`), `right run scores "${ra.score}"`);
	check(ra.squares.length === max && ra.squares.every(Boolean), "the grid shows every square right");
	check(ra.notes.some((n) => /Solved 1 day in a row/.test(n)), `streak shown: ${ra.notes.join(" | ")}`);
	check(ra.chapter.replace(/ /g, " ") === `This piece belongs to Chapter ${puzzle.chapter.n}`, `"${ra.chapter}"`);
	check(ra.href === `/play/${pfile.site.slug}?ch=${puzzle.chapter.n}`, `chapter button goes to ${ra.href}`);
	check(!ra.mine && ra.notes.some((n) => /first day is not on the board/.test(n)), "a brand-new player is not on today's board, and is told so");
	check(ra.focus === "Your result", "focus moved to the result heading");
	const rowsA = await sql`SELECT d.score, d.correct, d.duration_ms FROM play_daily d JOIN play_players p ON p.id = d.player_id WHERE p.anon_id = ${anonA} AND d.day = ${day}::date`;
	check(rowsA.length === 1 && rowsA[0].score === max && rowsA[0].correct === true, `one counted row for A: ${JSON.stringify(rowsA)}`);

	// ---- player A again, the same day: shown the counted result, and a second answer is not counted
	const a2 = await openAs(anonA);
	await a2.waitForSelector(".play-daily-result", { timeout: 60000 });
	const again = await a2.evaluate(() => document.querySelector(".play-daily-score")?.textContent || "");
	check(/You played today/.test(again), "reloading the page shows the counted result, not the puzzle");
	const second = await a2.evaluate(
		async (body) => (await fetch("/api/play/daily", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json(),
		{ anon: anonA, day, puzzle: puzzle.id, answers: wrong, ms: 5000 },
	);
	check(second.ok && second.counted === false && second.result.score === max && second.attempt?.score === 0, `second POST the same day: counted ${second.counted}, kept score ${second.result?.score}, this try ${second.attempt?.score}`);
	const rowsA2 = await sql`SELECT d.score FROM play_daily d JOIN play_players p ON p.id = d.player_id WHERE p.anon_id = ${anonA}`;
	check(rowsA2.length === 1 && rowsA2[0].score === max, "still one row for A, first result stands");
	await a2.close();

	// ---- player B: keyboard only, every answer wrong, reduced motion
	const b = await openAs(anonB, { reduce: true });
	await b.waitForSelector(".play-daily-clue", { timeout: 120000 });
	await sleep(500);
	const anim = await b.evaluate(() => getComputedStyle(document.querySelector(".play-daily-clues > li.is-current")).animationName);
	check(anim === "none", `reduced motion: clue animation is "${anim}"`);
	const focusOn = async (text) => {
		for (let i = 0; i < 30; i++) {
			const t = await b.evaluate(() => (document.activeElement?.tagName === "BUTTON" ? document.activeElement.textContent.trim() : ""));
			if (t === text) return true;
			await b.keyboard.press("Tab");
		}
		return false;
	};
	for (let i = 0; i < clueCount; i++) {
		const label = i === clueCount - 1 ? "To the questions" : "Next clue";
		check(await focusOn(label), `keyboard reaches "${label}"`);
		await b.keyboard.press("Enter");
		await sleep(250);
	}
	for (let i = 0; i < puzzle.questions.length; i++) {
		const q = puzzle.questions[i];
		await b.waitForSelector(`input[name="q-${q.id}"]`);
		// Tab into the radio group, then arrow keys move and select.
		let inGroup = false;
		for (let t = 0; t < 30 && !inGroup; t++) {
			await b.keyboard.press("Tab");
			inGroup = await b.evaluate((n) => document.activeElement?.name === n, `q-${q.id}`);
		}
		check(inGroup, `keyboard reaches question ${i + 1}'s options`);
		await b.keyboard.press("Space");
		for (let t = 0; t < 6; t++) {
			const v = await b.evaluate((n) => document.querySelector(`input[name="${n}"]:checked`)?.value || null, `q-${q.id}`);
			if (v === wrong[q.id]) break;
			await b.keyboard.press("ArrowDown");
			await sleep(60);
		}
		const v = await b.evaluate((n) => document.querySelector(`input[name="${n}"]:checked`)?.value || null, `q-${q.id}`);
		check(v === wrong[q.id], `keyboard picked ${v} (a wrong option) for question ${i + 1}`);
		const last = i === puzzle.questions.length - 1;
		check(await focusOn(last ? "Check my answers" : "Next question"), "keyboard reaches the next button");
		await b.keyboard.press("Enter");
		await sleep(300);
	}
	await b.waitForSelector(".play-daily-result", { timeout: 30000 });
	await sleep(800);
	await shot(b, "4-result-wrong");
	const rb = await b.evaluate(() => ({
		score: document.querySelector(".play-daily-score-line")?.textContent || "",
		answers: [...document.querySelectorAll(".play-daily-qres strong")].map((s) => s.textContent),
		streak: [...document.querySelectorAll(".play-daily-score .play-note")].some((n) => /in a row/.test(n.textContent)),
		board: [...document.querySelectorAll(".play-board-row")].map((r) => ({ mine: r.classList.contains("is-mine"), text: r.textContent })),
	}));
	check(rb.score.startsWith(`0 of ${max} right`), `wrong run scores "${rb.score}"`);
	check(rb.answers.length === max && rb.answers.every((t) => t.startsWith("The answer:")), `each question shows its answer: ${rb.answers.join(" | ")}`);
	check(!rb.streak, "no streak line after a wrong run");
	check(rb.board.every((r) => !r.mine), "brand-new player B is not on today's board either");
	check(rb.board.every((r) => !/\d+ players|total/i.test(r.text)), "board shows no totals");

	// ---- the chapter button opens that chapter
	await Promise.all([b.waitForNavigation({ timeout: 120000 }), b.click(".play-daily-chapter a")]);
	await b.waitForSelector(".play-where-chapter", { timeout: 120000 });
	await sleep(1500);
	const where = await b.evaluate(() => ({ url: location.pathname + location.search, chapter: document.querySelector(".play-where-chapter")?.textContent || "" }));
	await shot(b, "5-chapter");
	check(where.url === `/play/${pfile.site.slug}?ch=${puzzle.chapter.n}`, `chapter link opened ${where.url}`);
	check(where.chapter.startsWith(`Chapter ${puzzle.chapter.n}`) && where.chapter.includes(puzzle.chapter.title), `level opened on "${where.chapter}"`);
	await b.close();
	await a.close();

	// ---- a stale day is refused
	const stale = await (await fetch(`${base}/api/play/daily`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ anon: anonB, day: "2020-01-01", puzzle: puzzle.id, answers: right }) })).json();
	check(stale.ok === false && stale.error === "new_day", `an old day is refused (${stale.error})`);
	check(errors.length === 0, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(" | ")}` : ""}`);
} finally {
	await browser.close();
	const anons = [anonA, anonB];
	const ev = await sql`DELETE FROM play_events WHERE anon_id = ANY(${anons}) RETURNING id`;
	const pl = await sql`DELETE FROM play_players WHERE anon_id = ANY(${anons}) RETURNING id`;
	const left = await sql`SELECT count(*)::int AS n FROM play_daily d JOIN play_players p ON p.id = d.player_id WHERE p.anon_id LIKE 'test-daily-%'`;
	console.log(`cleanup: ${pl.length} test players (and their daily rows) and ${ev.length} events deleted; test-daily rows left: ${left[0].n}`);
}

console.log(fails ? `\n${fails} check(s) failed` : "\nall checks passed");
process.exitCode = fails ? 1 : 0;
