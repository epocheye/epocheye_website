// The daily Missing Piece: pure helpers shared by the generator (tools/play/daily/generate.mjs),
// the server (lib/server/play/daily.js) and the page. No imports, no browser or server calls, so
// Node can load this file directly.
//
// A daily file (content/play/daily/<slug>.json) holds every puzzle generated from one pack and a
// calendar: days, a map from date (YYYY-MM-DD, the game day below) to a puzzle id. The calendar is
// never cycled: a date that is not in any file has no puzzle. The generator keeps every date that
// has already been played, only ever adds dates after them, and never gives two files the same
// date, so adding a site or regenerating a pack never changes the puzzle of a past date or today.
//
// The game day runs midnight to midnight in India (Asia/Kolkata, UTC+05:30, no daylight saving),
// the same clock as the weekly vote.

export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

// The game day a moment falls in, as YYYY-MM-DD.
export function gameDay(now = new Date()) {
	return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

// The moment a game day starts, in ms since 1970.
export function dayStartMs(day) {
	return Date.parse(`${day}T00:00:00Z`) - IST_OFFSET_MS;
}

export function dayNumber(day) {
	return Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
}

export function addDays(day, n) {
	return new Date((dayNumber(day) + n) * DAY_MS).toISOString().slice(0, 10);
}

// { file, puzzle } for a day, or null when no file has that date.
// files: daily files, any order. If two files ever claimed one date, the first slug wins.
export function puzzleForDay(files, day) {
	if (!DAY_RE.test(day)) return null;
	const list = (files || []).filter((f) => f && f.days && typeof f.days === "object" && f.puzzles).sort((a, b) => (a.site.slug < b.site.slug ? -1 : 1));
	for (const file of list) {
		const id = file.days[day];
		const puzzle = id ? file.puzzles[id] : null;
		if (puzzle) return { file, puzzle };
	}
	return null;
}

// The last date any file has a puzzle for, or null.
export function lastPuzzleDay(files) {
	let last = null;
	for (const f of files || []) for (const d of Object.keys(f?.days || {})) if (DAY_RE.test(d) && (!last || d > last)) last = d;
	return last;
}

// What the player sees before answering: no answers, no chapter, no reveal, no explanations.
export function publicPuzzle(file, puzzle) {
	return {
		id: puzzle.id,
		site: { slug: file.site.slug, name: file.site.name, place: file.site.place || null },
		tiers: file.tiers || {},
		element: { kind: puzzle.element.kind, name: puzzle.element.name },
		clues: puzzle.clues.map(({ kind, text, source, tier, witness }) => ({ kind, text, source: source || null, tier: tier || null, witness: witness || null })),
		questions: puzzle.questions.map(({ id, kind, prompt, hint, options }) => ({
			id,
			kind,
			prompt,
			hint: hint || null,
			options: options.map(({ id: oid, label, sub, thumb }) => ({ id: oid, label, sub: sub || null, thumb: thumb || null })),
		})),
	};
}

// Checks a player's answers. answers: { [questionId]: optionId }. Unknown ids count as wrong.
export function checkAnswers(puzzle, answers) {
	const questions = puzzle.questions.map((q) => {
		const picked = typeof answers?.[q.id] === "string" && q.options.some((o) => o.id === answers[q.id]) ? answers[q.id] : null;
		return { id: q.id, picked, correct: !!picked && q.answer.includes(picked) };
	});
	const score = questions.filter((q) => q.correct).length;
	return { questions, score, max: questions.length, correct: score === questions.length };
}

// True when every question has a valid option picked.
export function answersComplete(puzzle, answers) {
	return puzzle.questions.every((q) => typeof answers?.[q.id] === "string" && q.options.some((o) => o.id === answers[q.id]));
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "17 November 2026"
export function formatDay(day) {
	if (!DAY_RE.test(day)) return "";
	const [y, m, d] = day.split("-").map(Number);
	return `${d} ${MONTHS[m - 1]} ${y}`;
}

// "1st", "2nd", "23rd", "11th"
export function ordinal(n) {
	const v = n % 100;
	if (v >= 11 && v <= 13) return `${n}th`;
	return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
}

// "0:42"
export function formatDuration(ms) {
	if (!Number.isFinite(ms) || ms < 0) return "";
	const s = Math.round(ms / 1000);
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// The share text. The squares are in the text only, never in the interface. No answers, no
// element name, no chapter: nothing a friend could use to skip the puzzle.
export function shareText({ siteName, day, grid, streak, url }) {
	const squares = grid.map((ok) => (ok ? "\u{1F7E9}" : "\u{1F7E5}")).join("");
	const right = grid.filter(Boolean).length;
	const lines = ["The Missing Piece", siteName, formatDay(day), `${squares} ${right}/${grid.length}`];
	if (streak > 1) lines.push(`Streak ${streak}`);
	if (url) lines.push(url);
	return lines.filter(Boolean).join("\n");
}
