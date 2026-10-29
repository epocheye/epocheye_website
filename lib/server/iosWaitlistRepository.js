import "server-only";

import { getSql } from "@/lib/server/neon";

// See db/014_ios_waitlist.sql. Created here once per server instance, so
// shipping this code never waits on a manual migration.
let schemaReady = null;

async function db() {
	const sql = getSql();
	schemaReady ??= (async () => {
		await sql`
			CREATE TABLE IF NOT EXISTS ios_waitlist (
				email TEXT PRIMARY KEY,
				source TEXT,
				ip_hash TEXT,
				created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
			)
		`;
		await sql`CREATE INDEX IF NOT EXISTS idx_ios_waitlist_ip_created ON ios_waitlist(ip_hash, created_at)`;
	})().catch((err) => {
		schemaReady = null;
		throw err;
	});
	await schemaReady;
	return sql;
}

/** Sign-ups from this hashed IP in the last hour. 0 when unhashed. */
export async function countRecentIosSignupsByIp(ipHash) {
	if (!ipHash) return 0;
	const sql = await db();
	const rows = await sql`
		SELECT COUNT(*)::int AS n FROM ios_waitlist
		WHERE ip_hash = ${ipHash} AND created_at > NOW() - INTERVAL '1 hour'
	`;
	return rows[0]?.n ?? 0;
}

/** Adds an email to the waitlist. Signing up twice is a no-op. */
export async function joinIosWaitlist({ email, source, ipHash }) {
	const sql = await db();
	await sql`
		INSERT INTO ios_waitlist (email, source, ip_hash)
		VALUES (${email}, ${source}, ${ipHash})
		ON CONFLICT (email) DO NOTHING
	`;
}
