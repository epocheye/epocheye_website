import "server-only";

// Leaderboards (brief 5.4): per site and streaks. The daily board belongs to the daily feature
// (lib/server/play/daily.js) and is linked to, not repeated, here.
//
// A board shows places, display names and each row's own result, and never anything that counts
// players: it opens only once it has BOARD_MIN rows (a board of three says three people played),
// and the asking player's own row is marked only when it is among the top rows (a place like
// 214th is a count). Below the floor the answer is { open: false } and nothing else.

import { getSql } from "@/lib/server/neon";
import { BOARD_MIN, today } from "@/lib/server/play/daily";
import { dayStartMs } from "@/lib/play/daily";

export const TOP = 20;

const topN = (top) => Math.min(Math.max(1, Math.trunc(top) || TOP), TOP);

// Completed runs of a site that carry a server-measured time (runs/finish), each player's best:
// highest accuracy first, then fastest. Returns { open, rows: [{ place, name, accuracy,
// durationS, mine }] }.
export async function siteLeaders(site, playerId = null, top = TOP) {
	const sql = getSql();
	const rows = await sql`
		WITH best AS (
			SELECT DISTINCT ON (player_id) player_id, accuracy, duration_s
			FROM play_runs
			WHERE site = ${site} AND completed AND duration_s IS NOT NULL AND accuracy IS NOT NULL
			ORDER BY player_id, accuracy DESC, duration_s ASC
		)
		SELECT RANK() OVER (ORDER BY b.accuracy DESC, b.duration_s ASC)::int AS place,
		       p.display_name, b.accuracy, b.duration_s, (b.player_id = ${playerId}::uuid) IS TRUE AS mine
		FROM best b JOIN play_players p ON p.id = b.player_id
		ORDER BY b.accuracy DESC, b.duration_s ASC, p.display_name, b.player_id
		LIMIT ${topN(top)}
	`;
	if (rows.length < BOARD_MIN) return { open: false, rows: [] };
	return {
		open: true,
		rows: rows.map((r) => ({ place: r.place, name: r.display_name, accuracy: Number(r.accuracy), durationS: r.duration_s, mine: !!r.mine })),
	};
}

// Longest current daily streak: consecutive solved days ending today, or ending yesterday for a
// player with no result today yet. A wrong answer today ends the streak (the same rule as
// daily.js streakFor). Players first seen today are left off, so a throwaway id never shows.
// Returns { open, rows: [{ place, name, days, mine }] }.
export async function streakLeaders(playerId = null, top = TOP) {
	const sql = getSql();
	const day = today();
	const rows = await sql`
		WITH d AS (
			SELECT DISTINCT player_id, day FROM play_daily WHERE correct AND day <= ${day}::date
		),
		g AS (
			SELECT player_id, day, day - (ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY day))::int AS grp FROM d
		),
		s AS (
			SELECT player_id, COUNT(*)::int AS days, MAX(day) AS last FROM g GROUP BY player_id, grp
		),
		cur AS (
			SELECT s.player_id, s.days FROM s
			WHERE s.last = ${day}::date
			   OR (s.last = ${day}::date - 1 AND NOT EXISTS (
					SELECT 1 FROM play_daily t WHERE t.player_id = s.player_id AND t.day = ${day}::date
			   ))
		)
		SELECT RANK() OVER (ORDER BY c.days DESC)::int AS place,
		       p.display_name, c.days, (c.player_id = ${playerId}::uuid) IS TRUE AS mine
		FROM cur c JOIN play_players p ON p.id = c.player_id
		WHERE p.created_at < ${new Date(dayStartMs(day))}
		ORDER BY c.days DESC, p.display_name, c.player_id
		LIMIT ${topN(top)}
	`;
	if (rows.length < BOARD_MIN) return { open: false, rows: [] };
	return { open: true, rows: rows.map((r) => ({ place: r.place, name: r.display_name, days: r.days, mine: !!r.mine })) };
}
