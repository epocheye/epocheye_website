// POST /api/play/leaderboard  { kind: "site", site, anon? }  or  { kind: "streak", anon? }
//   ->  { ok, open: false, rows: [] } or { ok, open: true, rows: [{ place, name, ... , mine }] }
// Display names only, the top 20. A board opens only once it has enough rows to say nothing about
// how many play, and the asking player is marked only within the top rows. No totals.
// site rows carry accuracy (0 to 1) and durationS; streak rows carry days.
// The daily board is the daily feature's (/play/daily).
import { fail, featureOff, handler, limitIp, ok, readJson } from "@/lib/server/play/http";
import { siteLeaders, streakLeaders } from "@/lib/server/play/leaderboard";
import { findPlayer } from "@/lib/server/play/players";
import { anonOf, slugOf } from "@/lib/server/play/validate";
import { getPlayableSite } from "@/lib/play/sites";

export const runtime = "nodejs";

export const POST = handler("leaderboard", async (request) => {
	const off = featureOff("leaderboards");
	if (off) return off;
	const ipLimited = limitIp(request, "leaderboard", 30);
	if (ipLimited) return ipLimited;
	const { body, response } = await readJson(request, 512);
	if (response) return response;
	const anon = body.anon == null ? null : anonOf(body.anon);
	if (body.anon != null && !anon) return fail(400, "bad_anon");
	const player = anon ? await findPlayer(anon) : null;
	const me = player?.id || null;
	if (body.kind === "streak") return ok(await streakLeaders(me));
	if (body.kind === "site") {
		const slug = slugOf(body.site);
		// The sites a level can be played on: live ones, and a dev pack only where the level route
		// itself serves one (never in production unless PLAY_DEV_PACKS=1).
		const site = slug ? getPlayableSite(slug) : null;
		if (!site) return fail(400, "unknown_site");
		return ok(await siteLeaders(site.slug, me));
	}
	return fail(400, "bad_kind");
});
