// /api/play/daily   The Missing Piece (brief 1.4).
//
// GET   ->  { ok, day, puzzle }   today's puzzle (game day, India time), with no answers.
// POST  { anon, day, puzzle, answers: { [questionId]: optionId }, c?, src? }
//       ->  { ok, counted, day, result, durationMs, unranked, streak, board }
//   The server checks the answers. One counted result per player per day: the first stands. A
//   later answer is checked and shown (counted: false) but changes nothing; result then carries
//   the counted one and attempt the one just sent. The time is the server's, from the start it
//   recorded (POST /api/play/daily/start) to now; any time the browser sends is ignored.
//   unranked says why the counted result is not on the board: "new", "time" or null.
import { fail, featureOff, handler, limitAnon, limitIp, ok, readJson } from "@/lib/server/play/http";
import { arrival } from "@/lib/server/play/request";
import { answerableDays, dailyBoard, dailyFor, publicDaily, puzzleOn, recordDaily, resultOf, streakFor, unrankedReason } from "@/lib/server/play/daily";
import { anonOf, isPlainObject, tokenOf } from "@/lib/server/play/validate";
import { answersComplete, DAY_RE } from "@/lib/play/daily";
import { featureOn } from "@/lib/play/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler("daily", async (request) => {
	const off = featureOff("daily");
	if (off) return off;
	const limited = limitIp(request, "daily-get", 60);
	if (limited) return limited;
	const daily = publicDaily();
	if (!daily) return fail(503, "no_puzzle");
	return ok(daily);
});

// { [questionId]: optionId } with short token strings only, or null.
function answersOf(value) {
	if (!isPlainObject(value)) return null;
	const entries = Object.entries(value);
	if (!entries.length || entries.length > 4) return null;
	const out = {};
	for (const [k, v] of entries) {
		const key = tokenOf(k);
		const id = tokenOf(v);
		if (!key || !id) return null;
		out[key] = id;
	}
	return out;
}

export const POST = handler("daily", async (request) => {
	const off = featureOff("daily");
	if (off) return off;
	const ipLimited = limitIp(request, "daily-post", 20);
	if (ipLimited) return ipLimited;
	const { body, response } = await readJson(request, 2048);
	if (response) return response;
	const anon = anonOf(body.anon);
	if (!anon) return fail(400, "bad_anon");
	const anonLimited = limitAnon(anon, "daily-post", 6);
	if (anonLimited) return anonLimited;

	const day = typeof body.day === "string" && DAY_RE.test(body.day) ? body.day : null;
	if (!day) return fail(400, "bad_day");
	// The day the puzzle was loaded for must still be open, and the puzzle must be that day's.
	if (!answerableDays().includes(day)) return fail(409, "new_day");
	const found = puzzleOn(day);
	if (!found) return fail(503, "no_puzzle");
	if (body.puzzle !== found.puzzle.id) return fail(409, "new_day");
	const answers = answersOf(body.answers);
	if (!answers || !answersComplete(found.puzzle, answers)) return fail(400, "bad_answers");

	const { playerId } = await arrival(anon, body, request);
	const attempt = resultOf(found.file, found.puzzle, answers);
	const { stored } = await recordDaily({
		playerId,
		day,
		puzzleId: found.puzzle.id,
		result: { answers, grid: attempt.grid },
		correct: attempt.correct,
		score: attempt.score,
	});

	const first = await dailyFor(playerId, day);
	let result = attempt;
	if (!stored) {
		const firstAnswers = first?.result?.answers;
		if (first && first.puzzle_id === found.puzzle.id && firstAnswers) result = resultOf(found.file, found.puzzle, firstAnswers);
	}
	// With the leaderboards switched off there is no board to send.
	const [streak, board] = await Promise.all([streakFor(playerId, day), featureOn("leaderboards") ? dailyBoard(day, playerId) : null]);
	return ok({
		counted: stored, day, result, attempt: stored ? undefined : attempt,
		durationMs: first?.duration_ms ?? null, unranked: unrankedReason(first), streak, board,
	});
});
