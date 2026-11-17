// POST /api/play/email/status  { anon }  ->  { ok, email: "none"|"pending"|"confirmed", unsubscribed, early: [slug] }
// Where this player's email stands, and the sites open to them early (a confirmed email and a site
// that opens within a week, lib/play/sites.js earlySite). Creates nothing.
import { fail, handler, limitAnon, limitIp, ok, readJson } from "@/lib/server/play/http";
import { earlySlugsFor, emailStateOf } from "@/lib/server/play/email";
import { findPlayer } from "@/lib/server/play/players";
import { anonOf } from "@/lib/server/play/validate";

export const runtime = "nodejs";

export const POST = handler("email-status", async (request) => {
	const ipLimited = limitIp(request, "email-status", 60);
	if (ipLimited) return ipLimited;
	const { body, response } = await readJson(request, 512);
	if (response) return response;
	const anon = anonOf(body.anon);
	if (!anon) return fail(400, "bad_anon");
	const anonLimited = limitAnon(anon, "email-status", 30);
	if (anonLimited) return anonLimited;
	const player = await findPlayer(anon);
	if (!player) return ok({ email: "none", unsubscribed: false, early: [] });
	const state = await emailStateOf(player.id);
	const early = earlySlugsFor(state);
	return ok({ email: state.state, unsubscribed: state.unsubscribed, early });
});
