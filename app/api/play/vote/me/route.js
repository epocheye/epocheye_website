// POST /api/play/vote/me  { anon }  ->  { ok, mine: slug|null, email: "none"|"pending"|"confirmed", name|null }
// This player's vote this week and where their email stands. Creates nothing.
import { fail, handler, limitAnon, limitIp, ok, readJson } from "@/lib/server/play/http";
import { emailStateOf } from "@/lib/server/play/email";
import { findPlayer } from "@/lib/server/play/players";
import { anonOf } from "@/lib/server/play/validate";
import { myVote } from "@/lib/server/play/vote";

export const runtime = "nodejs";

export const POST = handler("vote-me", async (request) => {
	const ipLimited = limitIp(request, "vote-me", 60);
	if (ipLimited) return ipLimited;
	const { body, response } = await readJson(request, 512);
	if (response) return response;
	const anon = anonOf(body.anon);
	if (!anon) return fail(400, "bad_anon");
	const anonLimited = limitAnon(anon, "vote-me", 30);
	if (anonLimited) return anonLimited;
	const player = await findPlayer(anon);
	if (!player) return ok({ mine: null, email: "none", name: null });
	const [mine, state] = await Promise.all([myVote(player.id), emailStateOf(player.id)]);
	return ok({ mine, email: state.state, name: player.displayName });
});
