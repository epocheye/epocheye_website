import "server-only";

// The weekly vote for the next site. One vote per player per week; a player may change it during
// the week. vote.js passes the week (Monday, India time). binding records whether the player was a
// founding member with a confirmed email when they last voted; the official tally (vote.js
// counts) reads founding membership as it is now.
// Like the year vote, shares are returned only once there are enough votes.

import { getSql } from "@/lib/server/neon";
import { sharesOf } from "@/lib/server/play/yearVotes";

// The Monday (UTC) of the week a date falls in, as YYYY-MM-DD.
export function weekOf(now = new Date()) {
	const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	const back = (d.getUTCDay() + 6) % 7; // Monday 0 ... Sunday 6
	d.setUTCDate(d.getUTCDate() - back);
	return d.toISOString().slice(0, 10);
}

// siteChoice must already be checked against the list of sites that can be voted for.
export async function castWeeklyVote({ playerId, siteChoice, binding = false, week = weekOf() }) {
	const sql = getSql();
	await sql`
		INSERT INTO play_votes (week, player_id, site_choice, binding)
		VALUES (${week}::date, ${playerId}, ${siteChoice}, ${!!binding})
		ON CONFLICT (week, player_id) DO UPDATE
			SET site_choice = EXCLUDED.site_choice, binding = EXCLUDED.binding
	`;
}

export async function weeklyVoteOf(playerId, week = weekOf()) {
	const sql = getSql();
	const rows = await sql`SELECT site_choice, binding FROM play_votes WHERE player_id = ${playerId} AND week = ${week}::date LIMIT 1`;
	return rows[0] || null;
}

// { enough: false } or { enough: true, shares } over the given choices, in their order.
export async function weeklyResults(choiceIds, week = weekOf()) {
	const sql = getSql();
	const rows = await sql`
		SELECT site_choice, COUNT(*)::int AS n FROM play_votes
		WHERE week = ${week}::date GROUP BY site_choice
	`;
	const shares = sharesOf(new Map(rows.map((r) => [r.site_choice, r.n])), choiceIds);
	return shares ? { enough: true, shares } : { enough: false };
}
