import "server-only";

// The daily Missing Piece on the server: which puzzle a day has, the player's one counted result
// per day, the day's board and streaks. The puzzles come from content/play/daily/ (written by
// tools/play/daily/generate.mjs); answers never leave the server before a result is recorded.
//
// Days are game days: midnight to midnight in India (lib/play/daily.js gameDay).
//
// The board is honest about what it can check:
//   - the time is the server's own, from the first clue it handed out (startDaily) to the answer;
//     a result with no recorded start, or faster than MIN_MS, has no time and is not on the board.
//   - a player first seen on the day itself is not on that day's board, and is on the streak
//     board only once they existed before today. A throwaway id that answers once to read the
//     answers cannot put itself, or the real id it helps, on a board that day.
//   - a board opens only with BOARD_MIN rows (fewer would say how few played), and the asking
//     player's own row is shown only when it is among the top rows (a place like 214th is a count).

import DAILY from "@/content/play/daily";
import { getSql } from "@/lib/server/neon";
import { addDays, checkAnswers, DAY_RE, dayStartMs, gameDay, publicPuzzle, puzzleForDay } from "@/lib/play/daily";

export { DAY_RE };

export const BOARD_TOP = 20;
export const BOARD_MIN = 10; // the same floor the social exporter uses (tools/play/social/export.mjs)
const MIN_MS = 8000; // three clues and two questions cannot be read and answered faster than this

// Today, as a game day (India time).
export function today(now = new Date()) {
	return gameDay(now);
}

// A late answer to yesterday's puzzle is still taken for this long after midnight.
const GRACE_MS = 15 * 60 * 1000;

// The days a player may answer for right now: today, and yesterday just after midnight.
export function answerableDays(now = new Date()) {
	const t = today(now);
	return now.getTime() - dayStartMs(t) < GRACE_MS ? [t, addDays(t, -1)] : [t];
}

// { day, file, puzzle } for a day, or null when no daily file has that date.
export function puzzleOn(day) {
	const found = puzzleForDay(DAILY, day);
	return found ? { day, file: found.file, puzzle: found.puzzle } : null;
}

// What GET /api/play/daily sends: the day and its puzzle, with no answers.
export function publicDaily(day = today()) {
	const found = puzzleOn(day);
	return found ? { day, puzzle: publicPuzzle(found.file, found.puzzle) } : null;
}

// Everything the player may see once their answers are in: each question's pick and answer, the
// explanations already written for the options, the chapter it belongs to and the picture that
// shows where. Built from the puzzle and the stored answers, so a returning player sees the same.
export function resultOf(file, puzzle, answers) {
	const check = checkAnswers(puzzle, answers);
	const byId = new Map(check.questions.map((q) => [q.id, q]));
	return {
		score: check.score,
		max: check.max,
		correct: check.correct,
		grid: check.questions.map((q) => q.correct),
		questions: puzzle.questions.map((q) => {
			const c = byId.get(q.id);
			const label = (id) => q.options.find((o) => o.id === id)?.label || null;
			return {
				id: q.id,
				prompt: q.prompt,
				picked: c.picked,
				pickedLabel: c.picked ? label(c.picked) : null,
				correct: c.correct,
				answer: q.answer,
				answerLabels: q.answer.map(label).filter(Boolean),
				explain: (c.picked && q.explain?.[c.picked]) || [],
			};
		}),
		element: { kind: puzzle.element.kind, name: puzzle.element.name, image: puzzle.element.image || null },
		chapter: { n: puzzle.chapter.n, title: puzzle.chapter.title, years: puzzle.chapter.years || null },
		site: { slug: file.site.slug, name: file.site.name },
		reveal: puzzle.reveal || null,
	};
}

// The server hands out the day's first clue: the clock for the board starts here. The first start
// of the day stands; a later one changes nothing.
export async function startDaily({ playerId, day, puzzleId }) {
	if (!DAY_RE.test(day)) throw new Error("bad day");
	const sql = getSql();
	await sql`
		INSERT INTO play_daily_starts (day, player_id, puzzle_id)
		VALUES (${day}::date, ${playerId}, ${puzzleId})
		ON CONFLICT (day, player_id) DO NOTHING
	`;
}

// Records the player's answer. The time is worked out here, from the recorded start of this
// puzzle to now; it is null (not on the board) with no start, a start for another puzzle, or a
// time too short to be a person. { stored: true } for a new result, { stored: false } when the
// player already has one that day: the first result stands.
export async function recordDaily({ playerId, day, puzzleId, result, correct, score }) {
	if (!DAY_RE.test(day)) throw new Error("bad day");
	const sql = getSql();
	const rows = await sql`
		WITH s AS (
			SELECT (EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::int AS ms
			FROM play_daily_starts
			WHERE day = ${day}::date AND player_id = ${playerId} AND puzzle_id = ${puzzleId}
		)
		INSERT INTO play_daily (day, player_id, puzzle_id, result, correct, score, duration_ms)
		VALUES (
			${day}::date, ${playerId}, ${puzzleId}, ${JSON.stringify(result || {})}::jsonb, ${!!correct}, ${score | 0},
			(SELECT CASE WHEN ms >= ${MIN_MS} AND ms <= 3600000 THEN ms END FROM s)
		)
		ON CONFLICT (day, player_id) DO NOTHING
		RETURNING id
	`;
	return { stored: rows.length > 0 };
}

export async function dailyFor(playerId, day) {
	if (!DAY_RE.test(day)) return null;
	const sql = getSql();
	const rows = await sql`
		SELECT d.puzzle_id, d.result, d.correct, d.score, d.duration_ms,
		       (p.created_at < ${new Date(dayStartMs(day))}) AS settled
		FROM play_daily d JOIN play_players p ON p.id = d.player_id
		WHERE d.player_id = ${playerId} AND d.day = ${day}::date LIMIT 1
	`;
	return rows[0] || null;
}

// Why a stored result is not on the day's board, or null when it is: "new" (the player was first
// seen that day) or "time" (no time the server could check).
export function unrankedReason(row) {
	if (!row) return null;
	if (!row.settled) return "new";
	if (row.duration_ms == null) return "time";
	return null;
}

// The day's board: display names only, best score first, then fastest. Only results with a
// server-measured time, from players who existed before the day began.
// Returns { open: false } below BOARD_MIN rows, else { open: true, rows: [{ place, name, score,
// durationMs, mine }] } with the top rows only.
export async function dailyBoard(day, playerId = null, top = BOARD_TOP) {
	if (!DAY_RE.test(day)) return { open: false, rows: [] };
	const sql = getSql();
	const n = Math.min(Math.max(1, Math.trunc(top) || BOARD_TOP), BOARD_TOP);
	const rows = await sql`
		SELECT RANK() OVER (ORDER BY d.score DESC, d.duration_ms ASC)::int AS place,
		       p.display_name, d.score, d.duration_ms, (d.player_id = ${playerId}::uuid) IS TRUE AS mine
		FROM play_daily d JOIN play_players p ON p.id = d.player_id
		WHERE d.day = ${day}::date AND d.duration_ms IS NOT NULL AND p.created_at < ${new Date(dayStartMs(day))}
		ORDER BY d.score DESC, d.duration_ms ASC, d.created_at, d.player_id
		LIMIT ${n}
	`;
	if (rows.length < BOARD_MIN) return { open: false, rows: [] };
	return { open: true, rows: rows.map((r) => ({ place: r.place, name: r.display_name, score: r.score, durationMs: r.duration_ms, mine: !!r.mine })) };
}

// Consecutive solved days (every question right) ending on `day`, or ending the day before when
// the player has no result for `day` yet. A wrong answer on `day` ends the streak at 0 that day.
// The same rule as the streak board in leaderboard.js.
export async function streakFor(playerId, day) {
	if (!DAY_RE.test(day)) return 0;
	const sql = getSql();
	const rows = await sql`
		SELECT day::text AS day, correct FROM play_daily
		WHERE player_id = ${playerId} AND day <= ${day}::date
		ORDER BY day DESC LIMIT 400
	`;
	let i = 0;
	let expect = day;
	if (rows[0]?.day === day) {
		if (!rows[0].correct) return 0;
	} else {
		expect = addDays(day, -1);
	}
	let streak = 0;
	for (; i < rows.length; i++) {
		const r = rows[i];
		if (r.day !== expect || !r.correct) break;
		streak++;
		expect = addDays(expect, -1);
	}
	return streak;
}
