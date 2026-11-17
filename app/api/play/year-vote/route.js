// POST /api/play/year-vote   { anon, site, option, src?, c? }  ->  { ok }
//   The player's answer to the story's vote beat. One per player per site; a new pick replaces it.
// GET  /api/play/year-vote?site=<slug>  ->  { ok, enough: false } or { ok, enough: true, shares: [{ id, pct }] }
//   Live shares, cached for 30 seconds per server instance (cleared there by a vote or a finished run). Only once there are enough votes (MIN_VOTES) that a share
//   cannot give away how many people voted; no count is ever returned.
import { fail, handler, limitAnon, limitIp, ok, readJson } from "@/lib/server/play/http";
import { arrival, playerAndSite } from "@/lib/server/play/request";
import { storyFor, voteBeatFor } from "@/lib/server/play/story";
import { slugOf } from "@/lib/server/play/validate";
import { castYearVote, clearYearVoteCache, yearVoteResults } from "@/lib/server/play/yearVotes";

export const runtime = "nodejs";

export const POST = handler("year-vote", async (request) => {
	const ipLimited = limitIp(request, "year-vote", 30);
	if (ipLimited) return ipLimited;
	const { body, response } = await readJson(request, 1024);
	if (response) return response;
	const who = await playerAndSite(body);
	if (who.response) return who.response;
	const anonLimited = limitAnon(who.anon, "year-vote", 10);
	if (anonLimited) return anonLimited;
	if (typeof body.option !== "string" || !voteBeatFor(who.story.index, body.option)) return fail(400, "unknown_option");
	const { playerId } = await arrival(who.anon, body, request);
	await castYearVote({ playerId, site: who.story.entry.slug, optionId: body.option });
	clearYearVoteCache(who.story.entry.slug);
	return ok();
});

export const GET = handler("year-vote-results", async (request) => {
	const ipLimited = limitIp(request, "year-vote-get", 60);
	if (ipLimited) return ipLimited;
	const slug = slugOf(new URL(request.url).searchParams.get("site"));
	const story = slug ? await storyFor(slug) : null;
	if (!story) return fail(400, "unknown_site");
	// The story's first vote beat. A story without one has nothing to show.
	const options = [...story.index.votes.values()][0];
	if (!options) return fail(404, "no_vote");
	const result = await yearVoteResults(story.entry.slug, options);
	// No browser or CDN cache: a stale-while-revalidate copy would show a player the shares from
	// before their own vote. The per-instance cache in yearVotes.js keeps the database load down.
	return ok(result);
});
