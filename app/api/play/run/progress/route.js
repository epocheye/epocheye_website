// POST /api/play/run/progress
//   { anon, site, run, chapter, kind: "start" | "finish" | "pick", beat?, option?, src?, c? }
//   ->  { ok, chaptersDone }
// A chapter started or finished, or the first pick of a choice. The chapter id, and for a pick the
// choice beat and its option, must be in the pack's story. Repeating a call changes nothing: the
// run is keyed by its start time, a finished chapter is recorded once, and a beat keeps its first
// pick. These records, not the finish call, are what the leaderboard ranks.
import { fail, handler, limitAnon, limitIp, ok, readJson } from "@/lib/server/play/http";
import { arrival, playerAndSite, runOf } from "@/lib/server/play/request";
import { recordProgress } from "@/lib/server/play/runs";
import { tokenOf } from "@/lib/server/play/validate";

export const runtime = "nodejs";

const KINDS = new Set(["start", "finish", "pick"]);

export const POST = handler("run-progress", async (request) => {
	const ipLimited = limitIp(request, "progress", 120);
	if (ipLimited) return ipLimited;
	const { body, response } = await readJson(request, 2048);
	if (response) return response;
	const who = await playerAndSite(body);
	if (who.response) return who.response;
	const anonLimited = limitAnon(who.anon, "progress", 60);
	if (anonLimited) return anonLimited;
	const run = runOf(body);
	if (run.response) return run.response;
	if (!KINDS.has(body.kind)) return fail(400, "bad_kind");
	const chapter = tokenOf(body.chapter);
	if (!chapter || !who.story.index.chapterIds.has(chapter)) return fail(400, "unknown_chapter");
	let pick = null;
	if (body.kind === "pick") {
		const options = typeof body.beat === "string" ? who.story.index.choices.get(body.beat) : null;
		if (!options || typeof body.option !== "string" || !options.has(body.option)) return fail(400, "unknown_choice");
		pick = { beat: body.beat, option: body.option };
	}

	const { playerId, creatorCode, source } = await arrival(who.anon, body, request);
	const { entry } = who.story;
	const saved = await recordProgress({
		playerId, site: entry.slug, version: entry.version, startedAt: run.startedAt, chapter,
		finished: body.kind === "finish", pick, source, creatorCode,
	});
	return ok({ chaptersDone: saved?.chaptersDone || [] });
});
