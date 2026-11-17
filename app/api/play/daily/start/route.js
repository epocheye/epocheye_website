// POST /api/play/daily/start   { anon, day, puzzle, c?, src? }  ->  { ok }
//   The player has seen the day's first clue. The server notes the time, and the board's time is
//   measured from it (lib/server/play/daily.js recordDaily). The first start of the day stands;
//   calling it again changes nothing. Answers are never sent here or back.
import { fail, featureOff, handler, limitAnon, limitIp, ok, readJson } from "@/lib/server/play/http";
import { arrival } from "@/lib/server/play/request";
import { answerableDays, puzzleOn, startDaily } from "@/lib/server/play/daily";
import { anonOf } from "@/lib/server/play/validate";
import { DAY_RE } from "@/lib/play/daily";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handler("daily-start", async (request) => {
	const off = featureOff("daily");
	if (off) return off;
	const ipLimited = limitIp(request, "daily-start", 20);
	if (ipLimited) return ipLimited;
	const { body, response } = await readJson(request, 1024);
	if (response) return response;
	const anon = anonOf(body.anon);
	if (!anon) return fail(400, "bad_anon");
	const anonLimited = limitAnon(anon, "daily-start", 6);
	if (anonLimited) return anonLimited;
	const day = typeof body.day === "string" && DAY_RE.test(body.day) ? body.day : null;
	if (!day || !answerableDays().includes(day)) return fail(409, "new_day");
	const found = puzzleOn(day);
	if (!found) return fail(503, "no_puzzle");
	if (body.puzzle !== found.puzzle.id) return fail(409, "new_day");
	const { playerId } = await arrival(anon, body, request);
	await startDaily({ playerId, day, puzzleId: found.puzzle.id });
	return ok();
});
