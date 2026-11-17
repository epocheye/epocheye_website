// One-shot, idempotent migration for Epocheye Play (db/015_play.sql).
// Run with: node --env-file=.env.local scripts/migrate-play.mjs
//
// Runs the file statement by statement. As a guard, it refuses any statement that is not
// CREATE TABLE IF NOT EXISTS play_... or CREATE [UNIQUE] INDEX IF NOT EXISTS ... ON play_...,
// so it can never alter or drop anything, nor touch a table outside Play.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!connectionString) {
	console.error("Missing DATABASE_URL or NEON_DATABASE_URL in environment.");
	process.exit(1);
}

const sql = neon(connectionString);
const file = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "015_play.sql");

const ALLOWED = [
	/^CREATE TABLE IF NOT EXISTS play_[a-z_]+ \(/i,
	/^CREATE (UNIQUE )?INDEX IF NOT EXISTS play_[a-z_]+ ON play_[a-z_]+ /i,
];

function statements(text) {
	// Normalise line endings first: in JS "." does not match "\r", so on a CRLF file the comment
	// strip below would leave every comment in, and the guard would refuse the first statement.
	const noComments = text
		.replace(/\r\n?/g, "\n")
		.split("\n")
		.map((line) => line.replace(/--.*$/, ""))
		.join("\n");
	return noComments
		.split(/;\s*(?:\n|$)/)
		.map((s) => s.replace(/\s+/g, " ").trim())
		.filter(Boolean);
}

async function run() {
	const list = statements(readFileSync(file, "utf8"));
	for (const stmt of list) {
		if (!ALLOWED.some((re) => re.test(stmt))) {
			throw new Error(`Refusing a statement that is not an additive play_ create: ${stmt.slice(0, 120)}`);
		}
	}
	console.log(`Running ${list.length} statements from db/015_play.sql`);
	for (const stmt of list) {
		await sql.query(stmt);
		console.log(`  ok  ${stmt.slice(0, 90)}${stmt.length > 90 ? "..." : ""}`);
	}

	const tables = await sql`
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'public' AND table_name LIKE 'play\\_%'
		ORDER BY table_name
	`;
	console.log("Tables ensured:");
	for (const { table_name } of tables) {
		const [{ count }] = await sql.query(`SELECT COUNT(*)::int AS count FROM "${table_name}"`);
		console.log(`  ${table_name} (rows: ${count})`);
	}
	const indexes = await sql`
		SELECT indexname FROM pg_indexes
		WHERE schemaname = 'public' AND tablename LIKE 'play\\_%'
		ORDER BY indexname
	`;
	console.log(`Indexes on play_ tables: ${indexes.map((r) => r.indexname).join(", ")}`);
}

run().catch((err) => {
	console.error("Migration failed:", err.message);
	process.exit(1);
});
