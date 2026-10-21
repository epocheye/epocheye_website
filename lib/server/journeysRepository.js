import "server-only";

import { getSql } from "@/lib/server/neon";

/**
 * Records a /journeys intent: a reservation (no payment yet), a "just notify me"
 * email, or a vote for the next monument. One table, see db/012_journeys_intents.sql.
 * Repeats of the same email + kind + monument are kept; the admin export dedupes.
 */
export async function saveJourneysIntent({
	kind,
	email,
	monument = null,
	tier = null,
	variant = "default",
	note = null,
	country = null,
	referrer = null,
	utmSource = null,
	utmMedium = null,
	utmCampaign = null,
}) {
	const sql = getSql();
	await sql`
		INSERT INTO journeys_intents
			(kind, email, monument, tier, variant, note, country, referrer, utm_source, utm_medium, utm_campaign)
		VALUES
			(${kind}, ${email}, ${monument}, ${tier}, ${variant}, ${note}, ${country}, ${referrer}, ${utmSource}, ${utmMedium}, ${utmCampaign})
	`;
}
