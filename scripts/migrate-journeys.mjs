// One-shot migration: create the journeys_intents table in Neon (db/012_journeys_intents.sql).
// Run with: node --env-file=.env.local scripts/migrate-journeys.mjs
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!connectionString) {
	console.error("Missing DATABASE_URL or NEON_DATABASE_URL in environment.");
	process.exit(1);
}

const sql = neon(connectionString);

async function run() {
	console.log("Creating journeys_intents table…");
	await sql`
		CREATE TABLE IF NOT EXISTS journeys_intents (
			id            BIGSERIAL PRIMARY KEY,
			kind          TEXT NOT NULL CHECK (kind IN ('reserve', 'notify', 'vote')),
			email         TEXT NOT NULL,
			monument      TEXT,
			tier          TEXT,
			variant       TEXT NOT NULL DEFAULT 'default',
			note          TEXT,
			status        TEXT NOT NULL DEFAULT 'intent',
			country       TEXT,
			referrer      TEXT,
			utm_source    TEXT,
			utm_medium    TEXT,
			utm_campaign  TEXT,
			created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`;
	await sql`CREATE INDEX IF NOT EXISTS journeys_intents_email_idx ON journeys_intents (email)`;
	const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM journeys_intents`;
	console.log(`✓ journeys_intents table ready. Existing rows: ${count}`);
}

run().catch((err) => {
	console.error("Migration failed:", err.message);
	process.exit(1);
});
