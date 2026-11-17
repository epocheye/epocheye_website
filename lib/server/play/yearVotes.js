import "server-only";

// "Which year would you put back?" One vote per player per site, which they may change.
// Results are shares only, and only once there are enough votes that a share is not a count in
// disguise (MIN_VOTES). No total is ever returned. A vote counts in the shares only from a player
// with a completed run of that site as the server recorded it (chapters reported as they were
// played, runs.js), so a script cannot set the shares by minting anonymous ids that never played.

import { getSql } from "@/lib/server/neon";

export const MIN_VOTES = 20;

export async function castYearVote({ playerId, site, optionId }) {
	const sql = getSql();
	await sql`
		INSERT INTO play_year_votes (site, player_id, option_id)
		VALUES (${site}, ${playerId}, ${optionId})
		ON CONFLICT (site, player_id) DO UPDATE
			SET option_id = EXCLUDED.option_id, updated_at = now()
	`;
}

// Whole-number percentages that add up to 100 (largest remainder).
export function sharesOf(counts, optionIds) {
	const total = optionIds.reduce((a, id) => a + (counts.get(id) || 0), 0);
	if (total < MIN_VOTES) return null;
	const raw = optionIds.map((id) => ({ id, exact: ((counts.get(id) || 0) * 100) / total }));
	const out = raw.map((r) => ({ id: r.id, pct: Math.floor(r.exact), rest: r.exact - Math.floor(r.exact) }));
	let left = 100 - out.reduce((a, r) => a + r.pct, 0);
	for (const r of [...out].sort((a, b) => b.rest - a.rest)) {
		if (left <= 0) break;
		r.pct += 1;
		left -= 1;
	}
	return out.map(({ id, pct }) => ({ id, pct }));
}

const TTL_MS = 30 * 1000;
const cache = new Map(); // site -> { at, counts }

// A vote or a finished run changes the counts: the next read on this instance goes to the database,
// so a player sees their own vote in the shares on the end card.
export function clearYearVoteCache(site) {
	cache.delete(site);
}

// { enough: false } or { enough: true, shares: [{ id, pct }] } in the story's option order.
// Votes for an option the story no longer has are left out. Cached for 30 seconds per site.
export async function yearVoteResults(site, optionIds) {
	let hit = cache.get(site);
	if (!hit || Date.now() - hit.at >= TTL_MS) {
		const sql = getSql();
		const rows = await sql`
			SELECT v.option_id, COUNT(*)::int AS n
			FROM play_year_votes v
			WHERE v.site = ${site}
			  AND EXISTS (SELECT 1 FROM play_runs r WHERE r.player_id = v.player_id AND r.site = v.site AND r.completed)
			GROUP BY v.option_id
		`;
		hit = { at: Date.now(), counts: new Map(rows.map((r) => [r.option_id, r.n])) };
		if (cache.size > 200) cache.clear();
		cache.set(site, hit);
	}
	const shares = sharesOf(hit.counts, optionIds);
	return shares ? { enough: true, shares } : { enough: false };
}
