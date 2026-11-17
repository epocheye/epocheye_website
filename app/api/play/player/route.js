// POST /api/play/player   { anon, c? }  ->  { ok, name }
// Gets or creates the anonymous player and returns their display name (from the generated list).
// A creator code is checked against promo_codes (read only) and kept if it is the player's first,
// unless the browser sends Do Not Track or Global Privacy Control.
import { checkCreatorCode } from "@/lib/server/play/creator";
import { fail, featureOff, handler, limitAnon, limitIp, ok, readJson } from "@/lib/server/play/http";
import { ensurePlayer } from "@/lib/server/play/players";
import { notTracked } from "@/lib/server/play/request";
import { anonOf } from "@/lib/server/play/validate";

export const runtime = "nodejs";

export const POST = handler("player", async (request) => {
	const off = featureOff();
	if (off) return off;
	const ipLimited = limitIp(request, "player", 30);
	if (ipLimited) return ipLimited;
	const { body, response } = await readJson(request, 1024);
	if (response) return response;
	const anon = anonOf(body.anon);
	if (!anon) return fail(400, "bad_anon");
	const anonLimited = limitAnon(anon, "player", 10);
	if (anonLimited) return anonLimited;
	const creatorCode = body.c != null && !notTracked(request) ? await checkCreatorCode(body.c) : null;
	const player = await ensurePlayer(anon, { creatorCode });
	if (!player) return fail(400, "bad_anon");
	return ok({ name: player.displayName });
});
