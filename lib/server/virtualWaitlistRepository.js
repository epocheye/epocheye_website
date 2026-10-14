import "server-only";

import { getSql } from "@/lib/server/neon";

/**
 * Adds an email to the /virtual waitlist. A repeat email is a no-op, so the
 * caller can answer the same way either way and never reveal who signed up.
 */
export async function joinVirtualWaitlist({
	email,
	country = null,
	utmSource = null,
	utmMedium = null,
	utmCampaign = null,
	referrer = null,
	consent,
}) {
	const sql = getSql();
	await sql`
		INSERT INTO virtual_waitlist (email, country, utm_source, utm_medium, utm_campaign, referrer, consent)
		VALUES (${email}, ${country}, ${utmSource}, ${utmMedium}, ${utmCampaign}, ${referrer}, ${consent})
		ON CONFLICT (email) DO NOTHING
	`;
}
