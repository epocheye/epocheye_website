// The daily page's calls to /api/play/daily. Built on lib/play/api.js: a timeout, never throws,
// { ok: false } on any failure. Answering is the player's own act, so it is sent with Do Not
// Track on as well (like the year vote); only the analytics events respect it.

import { call, who } from "@/lib/play/api";
import { anonId, captureArrival } from "@/lib/play/player";

// { ok, day, puzzle } today's puzzle, without answers.
export function todaysPuzzle() {
	return call("/api/play/daily", { timeoutMs: 6000 });
}

// { ok, day, played, result, durationMs, unranked, streak, board }
export function myDaily(day) {
	return call("/api/play/daily/me", { body: { anon: anonId(), day }, timeoutMs: 6000 });
}

// The first clue is on screen: the server starts the board's clock (its own, not this one).
export function startDaily({ day, puzzle }) {
	captureArrival();
	return call("/api/play/daily/start", { body: { ...who(), day, puzzle }, timeoutMs: 6000 });
}

// { ok, counted, day, result, attempt?, durationMs, unranked, streak, board } or { ok: false, error }
export function sendAnswers({ day, puzzle, answers }) {
	captureArrival();
	return call("/api/play/daily", { body: { ...who(), day, puzzle, answers }, timeoutMs: 8000 });
}
