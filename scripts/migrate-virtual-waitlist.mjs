// One-shot migration: create the virtual_waitlist table in Neon (db/011_virtual_waitlist.sql).
// Run with: node --env-file=.env.local scripts/migrate-virtual-waitlist.mjs
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!connectionString) {
	console.error("Missing DATABASE_URL or NEON_DATABASE_URL in environment.");
	process.exit(1);
}

const sql = neon(connectionString);

async function run() {
	console.log("Creating virtual_waitlist table…");
	await sql`
		CREATE TABLE IF NOT EXISTS virtual_waitlist (
			id            BIGSERIAL PRIMARY KEY,
			email         TEXT NOT NULL UNIQUE,
			country       TEXT,
			utm_source    TEXT,
			utm_medium    TEXT,
			utm_campaign  TEXT,
			referrer      TEXT,
			consent       BOOLEAN NOT NULL,
			created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`;

	const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM virtual_waitlist`;
	console.log(`✓ virtual_waitlist table ready. Existing rows: ${count}`);
}

run().catch((err) => {
	console.error("Migration failed:", err.message);
	process.exit(1);
});
