import "server-only";

import { createHash, randomInt } from "node:crypto";

import { getSql } from "@/lib/server/neon";

// No 0/O or 1/I/L, so a reference read aloud or copied by hand survives.
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function newReference() {
	let out = "";
	for (let i = 0; i < 6; i += 1) out += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
	return `EE-${out}`;
}

// Same scheme as the referral click hash in creatorRepository: day-scoped and
// salted, and NULL (store nothing) when no salt is configured.
export function hashPreorderIp(ipAddress) {
	const salt = process.env.REFERRAL_HASH_SALT;
	if (!salt || !ipAddress || ipAddress === "unknown") return null;
	const day = new Date().toISOString().slice(0, 10);
	return createHash("sha256").update(`${salt}|${day}|${ipAddress}`).digest("hex").slice(0, 32);
}

/** Pre-orders created from this hashed IP in the last hour. 0 when unhashed. */
export async function countRecentPreordersByIp(ipHash) {
	if (!ipHash) return 0;
	const sql = getSql();
	const rows = await sql`
		SELECT COUNT(*)::int AS n FROM preorders
		WHERE ip_hash = ${ipHash} AND created_at > NOW() - INTERVAL '1 hour'
	`;
	return rows[0]?.n ?? 0;
}

/** Pre-order count per slug, for the given slugs only. Missing slugs are 0. */
export async function countPreordersBySlug(slugs) {
	const sql = getSql();
	const rows = await sql`
		SELECT monument_slug AS slug, COUNT(*)::int AS n FROM preorders
		WHERE monument_slug = ANY(${slugs})
		GROUP BY monument_slug
	`;
	const counts = Object.fromEntries(slugs.map((s) => [s, 0]));
	for (const r of rows) counts[r.slug] = r.n;
	return counts;
}

/**
 * Creates a pre-order, or refreshes the existing one for the same email and
 * site (its reference is kept). Returns { reference, created }.
 */
export async function upsertPreorder({ name, email, siteSlug, suggestion, marketingOk, ipHash, userAgent }) {
	const sql = getSql();
	// A reference collision (1 in ~887M) just draws a new one.
	for (let attempt = 0; ; attempt += 1) {
		try {
			const rows = await sql`
				INSERT INTO preorders (reference, name, email, monument_slug, suggestion, marketing_ok, ip_hash, user_agent)
				VALUES (${newReference()}, ${name}, ${email}, ${siteSlug}, ${suggestion}, ${marketingOk}, ${ipHash}, ${userAgent})
				ON CONFLICT (email, monument_slug) DO UPDATE SET
					name = EXCLUDED.name,
					suggestion = COALESCE(EXCLUDED.suggestion, preorders.suggestion),
					marketing_ok = EXCLUDED.marketing_ok,
					updated_at = NOW()
				RETURNING reference, (xmax = 0) AS created
			`;
			const row = rows[0];
			return { reference: row.reference, created: Boolean(row.created) };
		} catch (err) {
			if (err?.code === "23505" && err?.constraint === "preorders_reference_key" && attempt < 2) continue;
			throw err;
		}
	}
}
