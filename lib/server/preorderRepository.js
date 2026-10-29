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

// The columns added after 011 (see db/012 and db/013). Applied here once per
// server instance, so shipping this code never waits on a manual migration.
// Rows from before payments existed become 'interested' and stay off the board.
let schemaReady = null;

async function db() {
	const sql = getSql();
	schemaReady ??= (async () => {
		await sql`
			ALTER TABLE preorders
				ADD COLUMN IF NOT EXISTS suggestion TEXT,
				ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'interested',
				ADD COLUMN IF NOT EXISTS amount_minor INTEGER,
				ADD COLUMN IF NOT EXISTS currency TEXT,
				ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
				ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
				ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ
		`;
		await sql`
			CREATE UNIQUE INDEX IF NOT EXISTS uq_preorders_razorpay_order
			ON preorders(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL
		`;
	})().catch((err) => {
		schemaReady = null;
		throw err;
	});
	await schemaReady;
	return sql;
}

// Same scheme as the referral click hash in creatorRepository: day-scoped and
// salted, and NULL (store nothing) when no salt is configured.
export function hashPreorderIp(ipAddress) {
	const salt = process.env.REFERRAL_HASH_SALT;
	if (!salt || !ipAddress || ipAddress === "unknown") return null;
	const day = new Date().toISOString().slice(0, 10);
	return createHash("sha256").update(`${salt}|${day}|${ipAddress}`).digest("hex").slice(0, 32);
}

/** Pre-orders started from this hashed IP in the last hour. 0 when unhashed. */
export async function countRecentPreordersByIp(ipHash) {
	if (!ipHash) return 0;
	const sql = await db();
	const rows = await sql`
		SELECT COUNT(*)::int AS n FROM preorders
		WHERE ip_hash = ${ipHash} AND updated_at > NOW() - INTERVAL '1 hour'
	`;
	return rows[0]?.n ?? 0;
}

/** Paid pre-orders per slug, for the given slugs only. Missing slugs are 0. */
export async function countPreordersBySlug(slugs) {
	const sql = await db();
	const rows = await sql`
		SELECT monument_slug AS slug, COUNT(*)::int AS n FROM preorders
		WHERE monument_slug = ANY(${slugs}) AND payment_status = 'paid'
		GROUP BY monument_slug
	`;
	const counts = Object.fromEntries(slugs.map((s) => [s, 0]));
	for (const r of rows) counts[r.slug] = r.n;
	return counts;
}

/**
 * Holds a pre-order for one email and site before payment: creates the row,
 * or refreshes an unpaid one (its reference is kept). A paid row is left as
 * it is. Returns { reference, paid }.
 */
export async function reservePreorder({ name, email, siteSlug, suggestion, marketingOk, ipHash, userAgent }) {
	const sql = await db();
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
					ip_hash = EXCLUDED.ip_hash,
					user_agent = EXCLUDED.user_agent,
					updated_at = NOW()
				WHERE preorders.payment_status <> 'paid'
				RETURNING reference
			`;
			if (rows[0]) return { reference: rows[0].reference, paid: false };
			// No row back: the conflict was with a paid pre-order.
			const paid = await sql`SELECT reference FROM preorders WHERE email = ${email} AND monument_slug = ${siteSlug}`;
			return { reference: paid[0].reference, paid: true };
		} catch (err) {
			if (err?.code === "23505" && err?.constraint === "preorders_reference_key" && attempt < 2) continue;
			throw err;
		}
	}
}

/** Records the Razorpay order a reserved pre-order is being paid with. */
export async function attachPreorderOrder({ reference, orderId, amount, currency }) {
	const sql = await db();
	await sql`
		UPDATE preorders SET
			razorpay_order_id = ${orderId},
			amount_minor = ${amount},
			currency = ${currency},
			payment_status = 'pending',
			updated_at = NOW()
		WHERE reference = ${reference} AND payment_status <> 'paid'
	`;
}

/**
 * Marks the pre-order paid by its Razorpay order, or by its reference (the
 * order's receipt) when a newer order has replaced it on the row. Safe to call
 * twice: only the first call gets `newlyPaid`, so emails go out once.
 * Returns { preorder, newlyPaid }, or null when no pre-order matches.
 */
export async function markPreorderPaid({ orderId, paymentId, reference = null }) {
	const sql = await db();
	const updated = await sql`
		UPDATE preorders SET
			payment_status = 'paid',
			razorpay_order_id = ${orderId},
			razorpay_payment_id = ${paymentId},
			paid_at = NOW(),
			updated_at = NOW()
		WHERE (razorpay_order_id = ${orderId} OR reference = ${reference}) AND payment_status <> 'paid'
		RETURNING reference, name, email, monument_slug, suggestion, marketing_ok, amount_minor, currency
	`;
	if (updated[0]) return { preorder: updated[0], newlyPaid: true };
	const existing = await sql`
		SELECT reference, name, email, monument_slug, suggestion, marketing_ok, amount_minor, currency, razorpay_payment_id
		FROM preorders
		WHERE (razorpay_order_id = ${orderId} OR reference = ${reference}) AND payment_status = 'paid'
		LIMIT 1
	`;
	if (!existing[0]) return null;
	if (existing[0].razorpay_payment_id !== paymentId) {
		// Paid twice for the same pre-order (two tabs): refund the extra one.
		console.warn(`[preorder] ${existing[0].reference} already paid; extra payment ${paymentId} on order ${orderId} needs a refund`);
	}
	return { preorder: existing[0], newlyPaid: false };
}
