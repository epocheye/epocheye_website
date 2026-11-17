import "server-only";

// What most Play requests carry: who (anon), which site, which run, where they came from and the
// creator code. Each is checked here; the site and its ids are checked against the pack's story.

import { earlySite } from "@/lib/play/sites";
import { checkCreatorCode } from "@/lib/server/play/creator";
import { emailStateOf } from "@/lib/server/play/email";
import { fail } from "@/lib/server/play/http";
import { ensurePlayer, findPlayer } from "@/lib/server/play/players";
import { storyFor } from "@/lib/server/play/story";
import { anonOf, runStartOf, slugOf, sourceOf } from "@/lib/server/play/validate";

// The browser asked not to be tracked (Do Not Track or Global Privacy Control). Such a request
// still plays and keeps its own game records, but nothing about where it came from is kept.
export function notTracked(request) {
	if (!request?.headers) return false;
	return request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1";
}

// A site that opens early for this player: one whose opening is within a week, for a player with
// a confirmed email (brief 5.5). Null otherwise.
async function earlyStory(slug, anon) {
	if (!earlySite(slug)) return null;
	const player = await findPlayer(anon);
	if (!player) return null;
	const state = await emailStateOf(player.id);
	return state.state === "confirmed" ? storyFor(slug, { early: true }) : null;
}

// { anon, story } or { response }. story is { entry, site, index } for a playable site, or for a
// site open early to this player.
export async function playerAndSite(body) {
	const anon = anonOf(body.anon);
	if (!anon) return { response: fail(400, "bad_anon") };
	const slug = slugOf(body.site);
	const story = slug ? (await storyFor(slug)) || (await earlyStory(slug, anon)) : null;
	if (!story) return { response: fail(400, "unknown_site") };
	return { anon, story };
}

// The run key, or a 400.
export function runOf(body) {
	const startedAt = runStartOf(body.run);
	return startedAt ? { startedAt } : { response: fail(400, "bad_run") };
}

// Ensures the player row and returns { playerId, creatorCode, source }. The creator code is the
// player's own kept one (the first real code they arrived with), so a run is credited to the
// creator whose link brought the player, even in a later visit without the link. With Do Not
// Track or Global Privacy Control on, no code or source is taken from this request.
export async function arrival(anon, body, request = null) {
	const quiet = notTracked(request);
	const sent = !quiet && body.c != null ? await checkCreatorCode(body.c) : null;
	const player = await ensurePlayer(anon, { creatorCode: sent });
	return { playerId: player.id, creatorCode: quiet ? null : player.creatorCode || null, source: quiet ? null : sourceOf(body.src) };
}
