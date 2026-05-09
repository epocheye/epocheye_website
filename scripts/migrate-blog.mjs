// One-shot migration: create blog_posts table in Neon.
// Run with: node --env-file=.env.local scripts/migrate-blog.mjs
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!connectionString) {
	console.error("Missing DATABASE_URL or NEON_DATABASE_URL in environment.");
	process.exit(1);
}

const sql = neon(connectionString);

async function run() {
	console.log("Creating blog_posts table…");
	await sql`
		CREATE TABLE IF NOT EXISTS blog_posts (
			id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			slug            TEXT NOT NULL UNIQUE,
			title           TEXT NOT NULL,
			excerpt         TEXT,
			cover_image_url TEXT,
			body_markdown   TEXT NOT NULL DEFAULT '',
			status          TEXT NOT NULL DEFAULT 'draft'
				CHECK (status IN ('draft', 'published')),
			published_at    TIMESTAMPTZ,
			created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`;
	await sql`CREATE INDEX IF NOT EXISTS idx_blog_posts_status_pub ON blog_posts(status, published_at DESC)`;
	await sql`CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug)`;

	const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM blog_posts`;
	console.log(`✓ blog_posts table ready. Existing rows: ${count}`);
}

run().catch((err) => {
	console.error("Migration failed:", err.message);
	process.exit(1);
});
