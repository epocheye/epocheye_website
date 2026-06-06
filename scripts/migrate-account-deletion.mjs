// One-shot migration: create account_deletion_requests table in Neon.
// Run with: node --env-file=.env.local scripts/migrate-account-deletion.mjs
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!connectionString) {
	console.error("Missing DATABASE_URL or NEON_DATABASE_URL in environment.");
	process.exit(1);
}

const sql = neon(connectionString);

async function run() {
	console.log("Creating account_deletion_requests table…");
	await sql`
		CREATE TABLE IF NOT EXISTS account_deletion_requests (
			id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			email      TEXT NOT NULL,
			reason     TEXT,
			status     TEXT NOT NULL DEFAULT 'pending',
			source     TEXT NOT NULL DEFAULT 'delete-account-page',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`;
	await sql`CREATE INDEX IF NOT EXISTS idx_account_deletion_created ON account_deletion_requests(created_at DESC)`;

	const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM account_deletion_requests`;
	console.log(`✓ account_deletion_requests table ready. Existing rows: ${count}`);
}

run().catch((err) => {
	console.error("Migration failed:", err.message);
	process.exit(1);
});
