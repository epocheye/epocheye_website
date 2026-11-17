// The Play client's line to /api/play/*. Every call has a timeout and never throws into the UI:
// on any failure it returns { ok: false }. The game works the same with the server down.
//
// Two kinds of call:
//   game records  player, run progress and finish (only with tracking allowed, see below)
//   features      the year vote and its shares, short card ids (always, they are the player's own act)
//   analytics     track(): queued, sent in batches of up to 20, and with navigator.sendBeacon when
//                 the page is closing.
// Nothing is tracked or recorded in the debug view (setQuiet) or when the browser sends Do Not
// Track or Global Privacy Control. The creator code and source go with every call, except with
// Do Not Track or Global Privacy Control on (the server ignores them then too); the player never
// sees either.

import { currentStep } from "@/lib/play/story/engine";
import { anonId, captureArrival, creatorCode, doNotTrack, source } from "@/lib/play/player";

const MAX_BATCH = 20;
const FLUSH_MS = 4000;

let quiet = false;

// The debug view: no analytics and no game records while it is open.
export function setQuiet(on) {
	quiet = !!on;
}

function tracking() {
	return !quiet && typeof window !== "undefined" && !doNotTrack();
}

// PLAY_ANALYTICS off (lib/play/features.js): the /play layout marks itself, and no event is queued.
function analyticsOn() {
	return typeof document !== "undefined" && !document.querySelector('[data-play-analytics="off"]');
}

export function who() {
	const out = { anon: anonId() };
	if (doNotTrack()) return out;
	const c = creatorCode();
	const src = source();
	if (c) out.c = c;
	if (src) out.src = src;
	return out;
}

export async function call(path, { body, method = body ? "POST" : "GET", timeoutMs = 6000, keepalive = false } = {}) {
	if (typeof window === "undefined") return { ok: false };
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), timeoutMs);
	try {
		const res = await fetch(path, {
			method,
			headers: body ? { "Content-Type": "application/json" } : undefined,
			body: body ? JSON.stringify(body) : undefined,
			signal: ctrl.signal,
			keepalive,
			credentials: "same-origin",
		});
		const json = await res.json().catch(() => null);
		if (!json || typeof json !== "object") return { ok: false, status: res.status };
		return { ...json, ok: res.ok && json.ok === true, status: res.status };
	} catch {
		return { ok: false };
	} finally {
		clearTimeout(timer);
	}
}

// ---- player

let playerCall = null;

// Makes sure the server knows this anonymous player. Once per page; retried after a failure.
export function ensurePlayer() {
	if (!tracking()) return Promise.resolve({ ok: false });
	captureArrival();
	if (!playerCall) {
		playerCall = call("/api/play/player", { body: who() }).then((r) => {
			if (!r.ok) playerCall = null;
			return r.ok ? { ok: true, name: r.name } : { ok: false };
		});
	}
	return playerCall;
}

// ---- runs

const runKey = (slug) => `play:${slug}:run`;

function readRun(slug) {
	try {
		const r = JSON.parse(window.localStorage.getItem(runKey(slug)) || "null");
		return r && Number.isInteger(r.t) ? r : null;
	} catch {
		return null;
	}
}

function writeRun(slug, run) {
	try {
		window.localStorage.setItem(runKey(slug), JSON.stringify(run));
	} catch {
		// No storage: the run lasts as long as this page.
	}
	return run;
}

const memoryRuns = new Map();

// The server takes a run key from 30 days ago to 10 minutes ahead (lib/server/play/validate.js).
const RUN_MAX_AGE_MS = 29 * 86400000;
const RUN_MAX_AHEAD_MS = 5 * 60000;

// The run in progress for a site. A new one starts when there is none, the last one finished, or
// the stored one is too old (or too far ahead of this clock) for the server to take.
function runFor(slug, startNew) {
	const stored = readRun(slug) || memoryRuns.get(slug) || null;
	const age = stored ? Date.now() - stored.t : 0;
	const run = stored && age <= RUN_MAX_AGE_MS && age >= -RUN_MAX_AHEAD_MS ? stored : null;
	if (run && !run.done) return run;
	if (!startNew && run) return run;
	const fresh = { t: Date.now(), done: false };
	memoryRuns.set(slug, fresh);
	return writeRun(slug, fresh);
}

// Progress calls still in flight, per site. The finish waits for them: the server ranks a run
// only on the chapters and first picks these calls recorded.
const inFlight = new Map();

function progress(slug, body) {
	const p = call("/api/play/run/progress", { body: { ...who(), site: slug, ...body } });
	if (!inFlight.has(slug)) inFlight.set(slug, new Set());
	const set = inFlight.get(slug);
	set.add(p);
	p.finally(() => set.delete(p));
	return p;
}

export function chapterProgress(slug, chapterId, kind) {
	if (!tracking() || !chapterId) return Promise.resolve({ ok: false });
	const run = runFor(slug, kind === "start");
	return progress(slug, { run: run.t, chapter: chapterId, kind });
}

// The first pick of a choice beat, as it happens. The server keeps only the first per beat.
export function choicePick(slug, chapterId, beat, option) {
	if (!tracking() || !chapterId) return Promise.resolve({ ok: false });
	const run = runFor(slug, false);
	return progress(slug, { run: run.t, chapter: chapterId, kind: "pick", beat, option });
}

// The end of a run. The server works out the chapters, the accuracy and the time from what it
// recorded; only the lens and the year vote are sent.
export function finishRun(slug, { lens, vote }) {
	if (!tracking()) return Promise.resolve({ ok: false });
	const run = runFor(slug, false);
	const done = { ...run, done: true };
	memoryRuns.set(slug, done);
	writeRun(slug, done);
	const waiting = [...(inFlight.get(slug) || [])];
	const p = Promise.allSettled(waiting).then(() =>
		call("/api/play/run/finish", { body: { ...who(), site: slug, run: run.t, lens, vote: vote || null } }),
	);
	pendingFinish.set(slug, p);
	return p;
}

const pendingFinish = new Map();

// Resolves once this page's finish call for a site has landed (at once when there is none), so a
// leaderboard or the year-vote shares read after the end of a level include the run just finished.
// It first lets the current render's effects run: the end card's own effects run before the
// level's effect that starts the finish call (children first), and would otherwise find none.
export async function runFinished(slug) {
	await new Promise((resolve) => setTimeout(resolve, 0));
	await pendingFinish.get(slug);
}

// ---- year vote

const pendingVotes = new Map();

export function castYearVote(slug, option) {
	if (quiet || typeof window === "undefined") return Promise.resolve({ ok: false });
	const p = call("/api/play/year-vote", { body: { ...who(), site: slug, option } });
	pendingVotes.set(slug, p);
	return p;
}

// { ok, enough, shares: [{ id, pct }] }. Waits for this player's own vote and run finish to land
// first: a vote counts in the shares only once its run is recorded as completed.
export async function yearVoteShares(slug) {
	// The shares are drawn in the same render that records the vote, and their effect runs first
	// (children first): let the level's effects send the vote, then wait for it.
	await new Promise((resolve) => setTimeout(resolve, 0));
	await pendingVotes.get(slug);
	await runFinished(slug);
	return call(`/api/play/year-vote?site=${encodeURIComponent(slug)}`, { timeoutMs: 5000 });
}

// ---- cards

// A short id for a finished card, or { ok: false } (the long id still works).
export function createCard(slug, { lens, choices, vote }) {
	const anon = typeof window === "undefined" ? null : anonId();
	return call("/api/play/card", { body: { anon, site: slug, lens, choices: choices || {}, vote: vote || null }, timeoutMs: 5000 });
}

// ---- analytics

const queue = [];
let timer = null;
let listening = false;

function listen() {
	if (listening) return;
	listening = true;
	window.addEventListener("pagehide", () => flush({ closing: true }));
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") flush({ closing: true });
	});
}

// Queues one event. name must be one the server accepts (lib/server/play/events.js).
export function track(name, { site = null, chapter = null, props } = {}) {
	if (!tracking() || !analyticsOn()) return;
	listen();
	queue.push({ name, site, chapter, props, path: window.location.pathname, at: Date.now() });
	if (queue.length >= MAX_BATCH) flush();
	else if (!timer) timer = setTimeout(() => flush(), FLUSH_MS);
}

// Sends everything queued. When the page is closing, navigator.sendBeacon carries it.
export function flush({ closing = false } = {}) {
	if (timer) clearTimeout(timer);
	timer = null;
	if (!queue.length || typeof window === "undefined") return;
	const base = who();
	while (queue.length) {
		const now = Date.now();
		const events = queue.splice(0, MAX_BATCH).map(({ at, ...e }) => ({ ...e, age: Math.min(600000, Math.max(0, now - at)) }));
		const body = { ...base, events };
		if (closing && typeof navigator !== "undefined" && navigator.sendBeacon) {
			try {
				if (navigator.sendBeacon("/api/play/event", new Blob([JSON.stringify(body)], { type: "application/json" }))) continue;
			} catch {
				// fall through to fetch
			}
		}
		call("/api/play/event", { body, keepalive: true });
	}
}

// ---- the level

// Everything a level reports when its story state changes: analytics, run progress, the run's
// end and the year vote. prev is null when the level has just opened. Story-agnostic: it reads
// only the engine's state and the compiled chapters.
export function reportGame(prev, next, { slug, chapters, screen }) {
	if (prev === next) return;
	const site = slug;
	const chapterId = (i) => chapters[i]?.id || null;
	const startChapter = (i) => {
		track("chapter_start", { site, chapter: chapterId(i) });
		chapterProgress(slug, chapterId(i), "start");
	};

	if (!prev) {
		track("start", { site, chapter: chapterId(next.chapter), props: { resumed: next.chapter > 0 || next.step > 0 || next.complete } });
		if (screen === "play" && !next.complete && next.step === 0) startChapter(next.chapter);
		return;
	}

	if (next.lens && next.lens !== prev.lens) track("lens", { site, props: { lens: next.lens } });

	for (const id of next.chaptersDone) {
		if (prev.chaptersDone.includes(id)) continue;
		track("chapter_finish", { site, chapter: id });
		chapterProgress(slug, id, "finish");
	}

	if (!next.complete && (next.chapter !== prev.chapter || (next.step === 0 && prev.step !== 0))) startChapter(next.chapter);

	if (next.picked && next.picked !== prev.picked) {
		const beat = currentStep(next, chapters)?.beat;
		const option = beat?.options?.find((o) => o.id === next.picked);
		if (beat && option) {
			const first = prev.choices[beat.id] == null;
			track("choice", {
				site, chapter: chapterId(next.chapter),
				props: { beat: beat.id, option: option.id, accepted: !!option.accepted, first },
			});
			if (first) choicePick(slug, chapterId(next.chapter), beat.id, option.id);
		}
	}

	if (next.proof !== prev.proof) track("proof", { site, chapter: chapterId(next.chapter), props: { on: next.proof } });

	if (next.vote && next.vote !== prev.vote) {
		track("year_vote", { site, chapter: chapterId(next.chapter), props: { option: next.vote } });
		castYearVote(slug, next.vote);
	}

	// The run is over when the engine says the level is complete, or when every chapter that counts
	// is done (a pack whose story stops at a preview chapter is never "complete"). Whichever comes
	// first ends the run, once.
	if (finished(next, chapters) && !finished(prev, chapters)) {
		track("complete", { site, props: { lens: next.lens || null } });
		finishRun(slug, { lens: next.lens, vote: next.vote });
	}
}

// Every chapter that counts (not a preview) is done, or the engine marked the level complete.
function finished(state, chapters) {
	if (state.complete) return true;
	const required = chapters.filter((c) => !c.preview);
	return required.length > 0 && required.every((c) => state.chaptersDone.includes(c.id));
}
