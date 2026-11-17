// POST /api/play/daily/me   { anon, day? }
//   ->  { ok, day, played, result|null, durationMs, unranked, streak, board }
// The player's own counted result for the day (today when day is left out, or a day still open
// for answers), their streak and the day's board (lib/server/play/daily.js dailyBoard), display
// names only. Never creates a player: someone who has not played gets played: false and the board.
import { fail, handler, limitIp, ok, readJson } from "@/lib/server/play/http";
import { answerableDays, dailyBoard, dailyFor, puzzleOn, resultOf, streakFor, today, unrankedReason } from "@/lib/server/play/daily";
import { findPlayer } from "@/lib/server/play/players";
import { anonOf } from "@/lib/server/play/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handler("daily-me", async (request) => {
	const limited = limitIp(request, "daily-me", 40);
	if (limited) return limited;
	const { body, response } = await readJson(request, 512);
	if (response) return response;
	const anon = body.anon == null ? null : anonOf(body.anon);
	if (body.anon != null && !anon) return fail(400, "bad_anon");
	const day = body.day == null ? today() : body.day;
	if (typeof day !== "string" || !answerableDays().includes(day)) return fail(409, "new_day");

	const player = anon ? await findPlayer(anon) : null;
	const playerId = player?.id || null;
	const [row, streak, board] = await Promise.all([
		playerId ? dailyFor(playerId, day) : null,
		playerId ? streakFor(playerId, day) : 0,
		dailyBoard(day, playerId),
	]);
	let result = null;
	if (row?.result?.answers) {
		const found = puzzleOn(day);
		if (found && found.puzzle.id === row.puzzle_id) result = resultOf(found.file, found.puzzle, row.result.answers);
	}
	return ok({ day, played: !!row, result, durationMs: row?.duration_ms ?? null, unranked: unrankedReason(row), streak, board });
});
