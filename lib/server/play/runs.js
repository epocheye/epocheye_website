import "server-only";

// Runs of a level. A run is keyed by (player, site, the time the player started it), so every
// call for the same run lands on the same row and repeating a call changes nothing.
// Callers check every id against the pack's story first (story.js); this file trusts its inputs
// only as far as their types.
//
// What a leaderboard ranks is built here, on the server, as the run goes:
//   - chapters_done: only chapters reported finished through /run/progress;
//   - choices: the first pick of each choice beat, reported through /run/progress as it happens
//     (a later pick never replaces it);
//   - the time: from when the server first saw the run (play_run_clock) to the finish.

import { getSql } from "@/lib/server/neon";

// Chapter started or finished, or a choice picked. Creates the run (and its clock) on its first
// call. A finished chapter is added to chapters_done once; a pick is kept only if the beat has none.
export async function recordProgress({ playerId, site, version, startedAt, chapter, finished = false, pick = null, source = null, creatorCode = null }) {
	const sql = getSql();
	const done = finished ? [chapter] : [];
	const beat = pick?.beat || null;
	const first = pick ? JSON.stringify({ [pick.beat]: pick.option }) : "{}";
	const rows = await sql`
		WITH r AS (
			INSERT INTO play_runs (player_id, site, pack_version, started_at, chapters_done, choices, source, creator_code)
			VALUES (${playerId}, ${site}, ${version}, ${startedAt}, ${done}::text[], ${first}::jsonb, ${source}, ${creatorCode})
			ON CONFLICT (player_id, site, started_at) DO UPDATE
				SET chapters_done = CASE
						WHEN ${!!finished}::boolean AND NOT (${chapter}::text = ANY (play_runs.chapters_done))
						THEN array_append(play_runs.chapters_done, ${chapter}::text)
						ELSE play_runs.chapters_done
					END,
				    choices = CASE
						WHEN ${beat}::text IS NOT NULL AND (play_runs.choices ->> ${beat}::text) IS NULL
						THEN play_runs.choices || ${first}::jsonb
						ELSE play_runs.choices
					END,
				    source = COALESCE(play_runs.source, EXCLUDED.source),
				    creator_code = COALESCE(play_runs.creator_code, EXCLUDED.creator_code),
				    updated_at = now()
			RETURNING id, chapters_done
		),
		c AS (
			INSERT INTO play_run_clock (run_id) SELECT id FROM r
			ON CONFLICT (run_id) DO NOTHING
		)
		SELECT id, chapters_done FROM r
	`;
	return rows[0] ? { id: rows[0].id, chaptersDone: rows[0].chapters_done } : null;
}

// The run as the server recorded it, with how long ago the server first saw it, or null.
export async function findRun({ playerId, site, startedAt }) {
	const sql = getSql();
	const rows = await sql`
		SELECT r.id, r.chapters_done, r.choices, r.completed, r.finished_at,
		       EXTRACT(EPOCH FROM (COALESCE(r.finished_at, now()) - c.first_seen_at))::int AS seen_s
		FROM play_runs r LEFT JOIN play_run_clock c ON c.run_id = r.id
		WHERE r.player_id = ${playerId} AND r.site = ${site} AND r.started_at = ${startedAt}
		LIMIT 1
	`;
	return rows[0] || null;
}

// The end of a run, on a run the server has seen. Calling it again for the same run keeps the
// first finish (its time and its result) and only updates the lens and the year vote.
export async function finishRun({ runId, lens, completed, durationS, accuracy, yearVote, version }) {
	const sql = getSql();
	const rows = await sql`
		UPDATE play_runs
		SET lens = ${lens},
		    pack_version = ${version},
		    year_vote = COALESCE(${yearVote}, year_vote),
		    completed = completed OR ${completed},
		    duration_s = CASE WHEN finished_at IS NULL THEN ${durationS} ELSE duration_s END,
		    accuracy = CASE WHEN finished_at IS NULL THEN ${accuracy} ELSE accuracy END,
		    finished_at = COALESCE(finished_at, now()),
		    updated_at = now()
		WHERE id = ${runId}
		RETURNING id, completed, accuracy, duration_s
	`;
	const row = rows[0];
	return row ? { id: row.id, completed: row.completed, accuracy: row.accuracy == null ? null : Number(row.accuracy), durationS: row.duration_s } : null;
}
