import "server-only";

// Numbers for /play/admin. Internal only: counts are fine here (the no-counts rule is for players).
// Everything is read from the play_ tables, cookieless: a "player" is a distinct anonymous id.
//
// Filters (all optional except the dates, all checked by the page before they get here):
//   from, to   YYYY-MM-DD, inclusive, UTC
//   source     where the player came from (play_events.source)
//   code       creator code (play_events.creator_code, play_players.creator_code)
//   site       a site slug
// Tables that carry no source (votes, daily, players) are filtered by the player instead: the
// player's kept creator code, and "has an event from this source". Each query is separate, so one
// failing section does not take the page down.

import { getSql } from "@/lib/server/neon";

// A detail key for events whose props say what kind of thing happened (share, CTA, email).
// The first of these props that is set; "" when none is.
const DETAIL = "COALESCE(props->>'what', props->>'cta', props->>'reason', props->>'why', props->>'kind', '')";

async function safe(fn) {
	try {
		return { rows: await fn() };
	} catch (err) {
		console.error("[play:stats]", err?.message || err);
		return { error: "Query failed" };
	}
}

// One filtered read of play_events: only the names given, inside the filters.
function eventsWhere(sql, f, names) {
	return sql`
		ts >= ${f.from}::date AND ts < (${f.to}::date + 1)
		AND name = ANY (${names}::text[])
		AND (${f.source}::text IS NULL OR source = ${f.source})
		AND (${f.code}::text IS NULL OR creator_code = ${f.code})
		AND (${f.site}::text IS NULL OR site = ${f.site})
	`;
}

export async function playStats(f) {
	const sql = getSql();
	const ev = (names) => eventsWhere(sql, f, names);
	// For tables without a source column: the player's creator code and source.
	const playerOk = (p) => sql`
		(${f.code}::text IS NULL OR ${p}.creator_code = ${f.code})
		AND (${f.source}::text IS NULL OR EXISTS (
			SELECT 1 FROM play_events e WHERE e.anon_id = ${p}.anon_id AND e.source = ${f.source}
		))
	`;
	const p = sql.unsafe("p");

	const [funnel, runs, lenses, choices, proof, yearVotes, details, emailsStored, daily, dailyStarts, streaks, weekly, bySource, byCreator] =
		await Promise.all([
			// Players at each step, per site: start, each chapter started and finished, complete.
			safe(() => sql`
				SELECT site, name, CASE WHEN name IN ('start', 'complete') THEN NULL ELSE chapter END AS chapter,
				       COUNT(DISTINCT anon_id)::int AS players, COUNT(*)::int AS events
				FROM play_events
				WHERE ${ev(["start", "chapter_start", "chapter_finish", "complete"])} AND site IS NOT NULL
				GROUP BY 1, 2, 3
			`),
			// Runs as the server recorded them.
			safe(() => sql`
				SELECT site,
				       COUNT(*)::int AS runs,
				       COUNT(*) FILTER (WHERE completed)::int AS completed,
				       COUNT(DISTINCT player_id)::int AS players,
				       percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_s) FILTER (WHERE completed AND duration_s IS NOT NULL) AS median_s,
				       AVG(accuracy) FILTER (WHERE completed) AS accuracy
				FROM play_runs
				WHERE started_at >= ${f.from}::date AND started_at < (${f.to}::date + 1)
				  AND (${f.source}::text IS NULL OR source = ${f.source})
				  AND (${f.code}::text IS NULL OR creator_code = ${f.code})
				  AND (${f.site}::text IS NULL OR site = ${f.site})
				GROUP BY site
			`),
			safe(() => sql`
				SELECT site, props->>'lens' AS lens, COUNT(DISTINCT anon_id)::int AS players, COUNT(*)::int AS events
				FROM play_events WHERE ${ev(["lens"])}
				GROUP BY site, props->>'lens'
			`),
			// First pick per player is the honest split; all picks include changed minds.
			safe(() => sql`
				SELECT site, chapter, props->>'beat' AS beat, props->>'option' AS option,
				       bool_or(props->>'accepted' = 'true') AS accepted,
				       COUNT(DISTINCT anon_id) FILTER (WHERE props->>'first' = 'true')::int AS first_players,
				       COUNT(*)::int AS picks
				FROM play_events WHERE ${ev(["choice"])}
				GROUP BY site, chapter, props->>'beat', props->>'option'
			`),
			safe(() => sql`
				SELECT site,
				       COUNT(DISTINCT anon_id)::int AS players,
				       COUNT(*) FILTER (WHERE props->>'on' = 'true')::int AS turned_on,
				       COUNT(*) FILTER (WHERE props->>'on' = 'false')::int AS turned_off
				FROM play_events WHERE ${ev(["proof"])}
				GROUP BY site
			`),
			// The stored vote (a player may change it): one row per player per site.
			safe(() => sql`
				SELECT v.site, v.option_id, COUNT(*)::int AS votes
				FROM play_year_votes v JOIN play_players p ON p.id = v.player_id
				WHERE v.updated_at >= ${f.from}::date AND v.updated_at < (${f.to}::date + 1)
				  AND (${f.site}::text IS NULL OR v.site = ${f.site})
				  AND ${playerOk(p)}
				GROUP BY v.site, v.option_id
			`),
			// Shares, emails given and CTA clicks, with what kind each was.
			safe(() => sql`
				SELECT name, site, ${sql.unsafe(DETAIL)} AS detail,
				       COUNT(*)::int AS events, COUNT(DISTINCT anon_id)::int AS players
				FROM play_events WHERE ${ev(["share", "email_given", "cta_click", "unlock"])}
				GROUP BY name, site, detail
			`),
			// Emails actually stored with consent in the range (site filter does not apply).
			safe(() => sql`
				SELECT COUNT(*)::int AS emails
				FROM play_players p
				WHERE p.email IS NOT NULL AND p.email_consent
				  AND p.email_consent_at >= ${f.from}::date AND p.email_consent_at < (${f.to}::date + 1)
				  AND ${playerOk(p)}
			`),
			safe(() => sql`
				SELECT d.day::text AS day, COUNT(*)::int AS plays, COUNT(*) FILTER (WHERE d.correct)::int AS correct
				FROM play_daily d JOIN play_players p ON p.id = d.player_id
				WHERE d.day >= ${f.from}::date AND d.day <= ${f.to}::date AND ${playerOk(p)}
				GROUP BY d.day ORDER BY d.day
			`),
			safe(() => sql`
				SELECT COUNT(DISTINCT anon_id)::int AS players, COUNT(*)::int AS events
				FROM play_events
				WHERE ts >= ${f.from}::date AND ts < (${f.to}::date + 1) AND name = 'daily_start'
				  AND (${f.source}::text IS NULL OR source = ${f.source})
				  AND (${f.code}::text IS NULL OR creator_code = ${f.code})
			`),
			// Streaks of consecutive correct days. For each player, the longest streak that reached
			// into the range, and whether it is still running on the last day of the range.
			safe(() => sql`
				WITH c AS (
					SELECT d.player_id, d.day
					FROM play_daily d JOIN play_players p ON p.id = d.player_id
					WHERE d.correct AND d.day <= ${f.to}::date AND ${playerOk(p)}
				), g AS (
					SELECT player_id, day, day - (ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY day))::int AS grp FROM c
				), s AS (
					SELECT player_id, COUNT(*)::int AS len, MAX(day) AS last_day FROM g GROUP BY player_id, grp
				), best AS (
					SELECT DISTINCT ON (player_id) player_id, len, last_day
					FROM s WHERE last_day >= ${f.from}::date
					ORDER BY player_id, len DESC
				)
				SELECT b.len, b.last_day >= (${f.to}::date - 1) AS running, pl.display_name
				FROM best b JOIN play_players pl ON pl.id = b.player_id
				ORDER BY b.len DESC, b.last_day DESC
				LIMIT 500
			`),
			safe(() => sql`
				-- The same rule as the tally that decides the vote (vote.js counts): only votes whose
				-- email is confirmed, and binding from founding membership as it is now.
				SELECT v.week::text AS week, v.site_choice, COUNT(*)::int AS votes, COUNT(*) FILTER (WHERE e.founding_member)::int AS binding
				FROM play_votes v
				JOIN play_players p ON p.id = v.player_id
				JOIN play_player_email e ON e.player_id = p.id AND e.confirmed_email = p.email
				WHERE v.week >= date_trunc('week', ${f.from}::date)::date AND v.week <= ${f.to}::date
				  AND ${playerOk(p)}
				GROUP BY v.week, v.site_choice
				ORDER BY v.week DESC, votes DESC
			`),
			safe(() => sql`
				SELECT COALESCE(source, '(none)') AS key,
				       COUNT(DISTINCT anon_id) FILTER (WHERE name = 'start')::int AS starts,
				       COUNT(DISTINCT anon_id) FILTER (WHERE name = 'complete')::int AS completions
				FROM play_events WHERE ${ev(["start", "complete"])}
				GROUP BY 1 ORDER BY starts DESC LIMIT 30
			`),
			safe(() => sql`
				SELECT COALESCE(creator_code, '(none)') AS key,
				       COUNT(DISTINCT anon_id) FILTER (WHERE name = 'start')::int AS starts,
				       COUNT(DISTINCT anon_id) FILTER (WHERE name = 'complete')::int AS completions
				FROM play_events WHERE ${ev(["start", "complete"])}
				GROUP BY 1 ORDER BY starts DESC LIMIT 30
			`),
		]);

	return { funnel, runs, lenses, choices, proof, yearVotes, details, emailsStored, daily, dailyStarts, streaks, weekly, bySource, byCreator };
}

// The values the source and creator filters can take: whatever the last year of events has.
export async function filterOptions() {
	const sql = getSql();
	const r = await safe(() => sql`
		SELECT 'source' AS kind, source AS value FROM play_events
		WHERE source IS NOT NULL AND ts >= now() - interval '365 days' GROUP BY source
		UNION
		SELECT 'code', creator_code FROM play_events
		WHERE creator_code IS NOT NULL AND ts >= now() - interval '365 days' GROUP BY creator_code
		UNION
		SELECT 'code', creator_code FROM play_players WHERE creator_code IS NOT NULL GROUP BY creator_code
	`);
	const rows = r.rows || [];
	const pick = (kind) => [...new Set(rows.filter((x) => x.kind === kind).map((x) => x.value))].sort().slice(0, 200);
	return { sources: pick("source"), codes: pick("code") };
}
