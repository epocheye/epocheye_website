// POST /api/play/run/finish
//   { anon, site, run, lens, vote, src?, c? }  ->  { ok, completed, accuracy, ranked }
// The end of a level. Nothing that ranks a run is taken from this call:
//   - the run must be one the server has seen through /run/progress (else 400 unknown_run);
//   - the chapters done are the ones /run/progress recorded, and every chapter that counts must be
//     among them (else 400 not_complete);
//   - accuracy is worked out from the first picks /run/progress recorded, over every choice beat of
//     the chapters that count; with any of them missing there is no accuracy;
//   - the time is the server's, from when it first saw the run to now.
// A run with no accuracy, or faster than a person could play it (the story's minSeconds), is
// recorded as completed but has no time, so it is not on the leaderboard. Any chapters, choices
// or duration in the body are ignored. The lens and the year vote are checked against the story.
import { fail, handler, limitAnon, limitIp, ok, readJson } from "@/lib/server/play/http";
import { arrival, playerAndSite, runOf } from "@/lib/server/play/request";
import { findRun, finishRun } from "@/lib/server/play/runs";
import { voteBeatFor } from "@/lib/server/play/story";
import { tokenOf } from "@/lib/server/play/validate";
import { clearYearVoteCache } from "@/lib/server/play/yearVotes";

export const runtime = "nodejs";

export const POST = handler("run-finish", async (request) => {
	const ipLimited = limitIp(request, "finish", 20);
	if (ipLimited) return ipLimited;
	const { body, response } = await readJson(request, 4096);
	if (response) return response;
	const who = await playerAndSite(body);
	if (who.response) return who.response;
	const anonLimited = limitAnon(who.anon, "finish", 6);
	if (anonLimited) return anonLimited;
	const run = runOf(body);
	if (run.response) return run.response;
	const { entry, site, index } = who.story;

	// Lens: one of the story's own, or the default.
	let lens = site.story.default_lens || null;
	if (body.lens != null) {
		const l = tokenOf(body.lens);
		if (!l || (index.lenses.size && !index.lenses.has(l))) return fail(400, "unknown_lens");
		lens = l;
	}

	// The year vote: an option of the story's vote beat, or none.
	let yearVote = null;
	if (body.vote != null) {
		if (typeof body.vote !== "string" || !voteBeatFor(index, body.vote)) return fail(400, "unknown_vote");
		yearVote = body.vote;
	}

	const { playerId } = await arrival(who.anon, body, request);
	const seen = await findRun({ playerId, site: entry.slug, startedAt: run.startedAt });
	if (!seen) return fail(400, "unknown_run");
	const chaptersDone = seen.chapters_done || [];
	const completed = index.required.length > 0 && index.required.every((id) => chaptersDone.includes(id));
	if (!completed) return fail(400, "not_complete");

	// First picks the server recorded, for every choice beat that counts.
	const picks = seen.choices && typeof seen.choices === "object" ? seen.choices : {};
	let accuracy = null;
	if (index.requiredChoices.length && index.requiredChoices.every((id) => typeof picks[id] === "string")) {
		const right = index.requiredChoices.filter((id) => index.choices.get(id)?.get(picks[id]) === true).length;
		accuracy = Math.round((right / index.requiredChoices.length) * 10000) / 10000;
	}
	const seconds = Number.isFinite(seen.seen_s) ? seen.seen_s : null;
	const durationS = accuracy != null && seconds != null && seconds >= index.minSeconds && seconds <= 7 * 86400 ? seconds : null;

	const saved = await finishRun({ runId: seen.id, lens, completed, durationS, accuracy, yearVote, version: entry.version });
	// A completed run makes this player's year vote count in the shares.
	clearYearVoteCache(entry.slug);
	return ok({ completed: !!saved?.completed, accuracy: saved?.accuracy ?? null, ranked: saved?.durationS != null });
});
