import "server-only";

import { getSql } from "@/lib/server/neon";

const PUBLIC_FIELDS = `id, slug, title, excerpt, cover_image_url, published_at`;
const FULL_FIELDS = `id, slug, title, excerpt, cover_image_url, body_markdown, status, published_at, created_at, updated_at`;

function normalizeStatus(value) {
	return value === "published" ? "published" : "draft";
}

export async function listPublishedPosts({ limit = 50, offset = 0 } = {}) {
	const sql = getSql();
	const [rows, countRows] = await Promise.all([
		sql`
			SELECT id, slug, title, excerpt, cover_image_url, published_at
			FROM blog_posts
			WHERE status = 'published'
			ORDER BY published_at DESC NULLS LAST, created_at DESC
			LIMIT ${limit}
			OFFSET ${offset}
		`,
		sql`SELECT COUNT(*)::int AS count FROM blog_posts WHERE status = 'published'`,
	]);
	return { entries: rows, total: countRows[0]?.count ?? 0 };
}

export async function getPublishedPostBySlug(slug) {
	const sql = getSql();
	const rows = await sql`
		SELECT id, slug, title, excerpt, cover_image_url, body_markdown, published_at
		FROM blog_posts
		WHERE slug = ${slug} AND status = 'published'
		LIMIT 1
	`;
	return rows[0] ?? null;
}

export async function listAdminPosts({ status = "all", limit = 50, offset = 0 } = {}) {
	const sql = getSql();
	const filter = ["draft", "published"].includes(status) ? status : null;

	const rows = filter
		? await sql`
			SELECT id, slug, title, excerpt, cover_image_url, status, published_at, created_at, updated_at
			FROM blog_posts
			WHERE status = ${filter}
			ORDER BY updated_at DESC
			LIMIT ${limit}
			OFFSET ${offset}
		`
		: await sql`
			SELECT id, slug, title, excerpt, cover_image_url, status, published_at, created_at, updated_at
			FROM blog_posts
			ORDER BY updated_at DESC
			LIMIT ${limit}
			OFFSET ${offset}
		`;

	const countRows = filter
		? await sql`SELECT COUNT(*)::int AS count FROM blog_posts WHERE status = ${filter}`
		: await sql`SELECT COUNT(*)::int AS count FROM blog_posts`;

	return { entries: rows, total: countRows[0]?.count ?? 0 };
}

export async function getAdminPostById(id) {
	const sql = getSql();
	const rows = await sql`
		SELECT ${sql.unsafe(FULL_FIELDS)}
		FROM blog_posts
		WHERE id = ${id}
		LIMIT 1
	`;
	return rows[0] ?? null;
}

export async function getPostBySlug(slug) {
	const sql = getSql();
	const rows = await sql`
		SELECT id, slug
		FROM blog_posts
		WHERE slug = ${slug}
		LIMIT 1
	`;
	return rows[0] ?? null;
}

export async function createPost({
	slug,
	title,
	excerpt = null,
	cover_image_url = null,
	body_markdown = "",
	status = "draft",
}) {
	const sql = getSql();
	const normalizedStatus = normalizeStatus(status);
	const rows = await sql`
		INSERT INTO blog_posts (
			slug, title, excerpt, cover_image_url, body_markdown, status, published_at
		) VALUES (
			${slug},
			${title},
			${excerpt},
			${cover_image_url},
			${body_markdown},
			${normalizedStatus},
			${normalizedStatus === "published" ? new Date().toISOString() : null}
		)
		RETURNING id, slug, title, excerpt, cover_image_url, body_markdown, status, published_at, created_at, updated_at
	`;
	return rows[0] ?? null;
}

export async function updatePost(id, fields = {}) {
	const sql = getSql();
	const existing = await getAdminPostById(id);
	if (!existing) return null;

	const slug = fields.slug ?? existing.slug;
	const title = fields.title ?? existing.title;
	const excerpt = fields.excerpt !== undefined ? fields.excerpt : existing.excerpt;
	const coverImage = fields.cover_image_url !== undefined ? fields.cover_image_url : existing.cover_image_url;
	const bodyMarkdown = fields.body_markdown !== undefined ? fields.body_markdown : existing.body_markdown;
	const nextStatus = fields.status ? normalizeStatus(fields.status) : existing.status;

	let publishedAt = existing.published_at;
	if (nextStatus === "published" && !existing.published_at) {
		publishedAt = new Date().toISOString();
	}
	if (nextStatus === "draft") {
		publishedAt = null;
	}

	const rows = await sql`
		UPDATE blog_posts
		SET
			slug = ${slug},
			title = ${title},
			excerpt = ${excerpt},
			cover_image_url = ${coverImage},
			body_markdown = ${bodyMarkdown},
			status = ${nextStatus},
			published_at = ${publishedAt},
			updated_at = NOW()
		WHERE id = ${id}
		RETURNING id, slug, title, excerpt, cover_image_url, body_markdown, status, published_at, created_at, updated_at
	`;
	return rows[0] ?? null;
}

export async function deletePost(id) {
	const sql = getSql();
	const rows = await sql`
		DELETE FROM blog_posts
		WHERE id = ${id}
		RETURNING id
	`;
	return rows[0] ?? null;
}
