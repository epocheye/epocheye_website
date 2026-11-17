import "server-only";

// Creator links (?c=<code>). A code counts only if it is an active promo code. This is a READ of
// promo_codes through getPromoCodeByCode. The creator program's click and conversion tables are
// never written from Play; Play keeps its own record in play_players, play_runs and play_events.

import { getPromoCodeByCode } from "@/lib/server/creatorRepository";
import { creatorCodeShape } from "@/lib/server/play/validate";

const TTL_MS = 10 * 60 * 1000;
const MAX = 1000;
const cache = new Map(); // code -> { at, valid }

// The code, upper-cased, when it is a real active code. Otherwise null. Never throws.
export async function checkCreatorCode(value) {
	const code = creatorCodeShape(value);
	if (!code) return null;
	const hit = cache.get(code);
	if (hit && Date.now() - hit.at < TTL_MS) return hit.valid ? code : null;
	try {
		const row = await getPromoCodeByCode(code);
		const valid = !!row;
		if (cache.size >= MAX) cache.clear();
		cache.set(code, { at: Date.now(), valid });
		return valid ? code : null;
	} catch {
		return null; // not cached: try again next time
	}
}
