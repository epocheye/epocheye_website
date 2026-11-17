import "server-only";

// Play players: an anonymous id from the browser, a display name from the generated list.

import { getSql } from "@/lib/server/neon";
import { nameFor } from "@/lib/play/names";
import { anonOf } from "@/lib/server/play/validate";

// Gets or creates the player for an anonymous id and marks them seen. The display name is set
// once, from the id, and never changes here. creatorCode must already be checked (creator.js);
// the first code a player arrives with is kept, later ones are ignored.
// Returns { id, displayName, creatorCode (the player's kept code), created } or null for an invalid id.
export async function ensurePlayer(anonId, { creatorCode = null } = {}) {
	const anon = anonOf(anonId);
	if (!anon) return null;
	const sql = getSql();
	const rows = await sql`
		INSERT INTO play_players (anon_id, display_name, creator_code)
		VALUES (${anon}, ${nameFor(anon)}, ${creatorCode})
		ON CONFLICT (anon_id) DO UPDATE
			SET last_seen_at = now(),
			    creator_code = COALESCE(play_players.creator_code, EXCLUDED.creator_code)
		RETURNING id, display_name, creator_code, (xmax = 0) AS created
	`;
	const row = rows[0];
	return row ? { id: row.id, displayName: row.display_name, creatorCode: row.creator_code, created: !!row.created } : null;
}

// The player for an anonymous id, or null. Does not create one.
export async function findPlayer(anonId) {
	const anon = anonOf(anonId);
	if (!anon) return null;
	const sql = getSql();
	const rows = await sql`
		SELECT id, display_name, creator_code, email IS NOT NULL AS has_email
		FROM play_players WHERE anon_id = ${anon} LIMIT 1
	`;
	const row = rows[0];
	return row ? { id: row.id, displayName: row.display_name, creatorCode: row.creator_code, hasEmail: !!row.has_email } : null;
}
