// GET  /api/play/vote  ->  { ok, week, choices: [slug], enough: false } or { ..., enough: true, shares: [{ id, pct }] }
//   This week's results (week starts Monday, Asia/Kolkata). Shares only, and only once the week has
//   enough counted votes (MIN_VOTES); a vote counts once its email is confirmed. Never a count.
// POST /api/play/vote  { anon, site, c?, src? }  ->  { ok, mine, counted }
//   Casts or changes this week's vote. Needs an email given with consent: otherwise 403
//   { error: "email_required" }. counted is false until the email is confirmed.
import { fail, handler, limitAnon, limitIp, ok, readJson } from "@/lib/server/play/http";
import { emailStateOf } from "@/lib/server/play/email";
import { arrival } from "@/lib/server/play/request";
import { anonOf } from "@/lib/server/play/validate";
import { castVote, clearVoteCache, isVoteChoice, voteChoices, weekOfKolkata, weeklyShares } from "@/lib/server/play/vote";

export const runtime = "nodejs";

export const GET = handler("vote-results", async (request) => {
	const limited = limitIp(request, "vote-get", 60);
	if (limited) return limited;
	const week = weekOfKolkata();
	const result = await weeklyShares(week);
	return ok({ week, choices: voteChoices(), ...result });
});

export const POST = handler("vote", async (request) => {
	const ipLimited = limitIp(request, "vote", 20);
	if (ipLimited) return ipLimited;
	const { body, response } = await readJson(request, 1024);
	if (response) return response;
	const anon = anonOf(body.anon);
	if (!anon) return fail(400, "bad_anon");
	const anonLimited = limitAnon(anon, "vote", 10);
	if (anonLimited) return anonLimited;
	if (!isVoteChoice(body.site)) return fail(400, "unknown_site");
	const { playerId } = await arrival(anon, body, request);
	const emailState = await emailStateOf(playerId);
	const r = await castVote({ playerId, siteChoice: body.site, emailState });
	if (!r.ok) return fail(r.error === "email_required" ? 403 : 400, r.error);
	clearVoteCache();
	return ok({ mine: body.site, counted: emailState.state === "confirmed" });
});
