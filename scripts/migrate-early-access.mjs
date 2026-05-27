// One-shot migration: create early_access_signups table in Neon.
// Run with: node --env-file=.env.local scripts/migrate-early-access.mjs
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!connectionString) {
	console.error("Missing DATABASE_URL or NEON_DATABASE_URL in environment.");
	process.exit(1);
}

const sql = neon(connectionString);

async function run() {
	console.log("Creating early_access_signups table…");
	await sql`
		CREATE TABLE IF NOT EXISTS early_access_signups (
			id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			email      TEXT NOT NULL UNIQUE,
			source     TEXT NOT NULL DEFAULT 'early-access-page',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`;
	await sql`CREATE INDEX IF NOT EXISTS idx_early_access_created ON early_access_signups(created_at DESC)`;

	const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM early_access_signups`;
	console.log(`✓ early_access_signups table ready. Existing rows: ${count}`);
}

run().catch((err) => {
	console.error("Migration failed:", err.message);
	process.exit(1);
});
