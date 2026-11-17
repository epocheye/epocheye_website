// Removes every row the Phase 5 measurement scripts made in the Play tables: players whose
// anonymous id starts "test-q5-" (their runs, daily results, votes, year votes and email claims go
// with them, ON DELETE CASCADE), their analytics events, and the share cards named on the command
// line that were made after the given time (a card is shared by everyone who makes the same one,
// so an older card is left alone).
//
//   node --env-file=.env.local docs/play/lighthouse/scripts/cleanup.mjs [--dry] [--since <ISO time>] [card ids ...]

import { neon } from "@neondatabase/serverless";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const since = args.includes("--since") ? args[args.indexOf("--since") + 1] : null;
const cards = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--since");
const sql = neon(process.env.DATABASE_URL);
const LIKE = "test-q5-%";

const players = await sql`SELECT count(*)::int AS n FROM play_players WHERE anon_id LIKE ${LIKE}`;
const events = await sql`SELECT count(*)::int AS n FROM play_events WHERE anon_id LIKE ${LIKE}`;
const cardRows = cards.length && since ? await sql`SELECT id, created_at FROM play_cards WHERE id = ANY(${cards}) AND created_at >= ${since}` : [];
console.log(`test players ${players[0].n}, their events ${events[0].n}, cards to remove ${cardRows.map((c) => c.id).join(", ") || "none"}`);
if (dry) process.exit(0);

const ev = await sql`DELETE FROM play_events WHERE anon_id LIKE ${LIKE} RETURNING id`;
const pl = await sql`DELETE FROM play_players WHERE anon_id LIKE ${LIKE} RETURNING id`;
const cd = cardRows.length ? await sql`DELETE FROM play_cards WHERE id = ANY(${cardRows.map((c) => c.id)}) RETURNING id` : [];
const left = await sql`SELECT
	(SELECT count(*)::int FROM play_players WHERE anon_id LIKE ${LIKE}) AS players,
	(SELECT count(*)::int FROM play_events WHERE anon_id LIKE ${LIKE}) AS events`;
console.log(`deleted ${pl.length} test players (with their rows), ${ev.length} events, ${cd.length} cards; left: ${JSON.stringify(left[0])}`);
