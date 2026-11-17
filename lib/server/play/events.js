import "server-only";

// Cookieless analytics for Play. Only whitelisted event names; no IP and no user agent stored.

import { getSql } from "@/lib/server/neon";

export const EVENT_NAMES = new Set([
	"start", "lens", "chapter_start", "chapter_finish", "choice", "complete", "proof", "year_vote", "share",
	"email_given", "cta_click", "daily_start", "daily_finish", "vote", "unlock",
]);

export const MAX_EVENTS = 20;

// rows: [{ anon_id, site, name, chapter, props, source, creator_code, path, age_ms }], already
// validated. One statement for the whole batch. Returns how many were stored.
export async function recordEvents(rows) {
	if (!rows.length) return 0;
	const sql = getSql();
	const stored = await sql`
		INSERT INTO play_events (ts, anon_id, site, name, chapter, props, source, creator_code, path)
		SELECT now() - make_interval(secs => x.age_ms / 1000.0), x.anon_id, x.site, x.name, x.chapter,
		       COALESCE(x.props, '{}'::jsonb), x.source, x.creator_code, x.path
		FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
			AS x(anon_id text, site text, name text, chapter text, props jsonb, source text, creator_code text, path text, age_ms int)
		RETURNING id
	`;
	return stored.length;
}
