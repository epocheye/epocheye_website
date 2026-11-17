// Reads a shared card on the server: the id from the URL, checked, then the pack it names.
// Import from server files only (the card page and its share image).
//
// Two kinds of id: a short id stored in play_cards (Phase 3), or the long id that is the payload
// itself. Both end up as the same checked payload.

import { headers } from "next/headers";
import { cache } from "react";
import { cardView, decodeCard, isShortCardId } from "@/lib/play/card";
import { loadSiteOnServer } from "@/lib/play/pack.server";
import { getPlayableSite } from "@/lib/play/sites";
import { getCardPayload } from "@/lib/server/play/cards";
import { rateLimit } from "@/lib/server/rateLimit";

// A short id is a database read, so it is rate limited per IP (the card page and its share image
// both come through here). Long ids are decoded with no read and need no limit.
async function shortIdAllowed() {
	try {
		const h = await headers();
		const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
		return rateLimit(`play:card-page:ip:${ip}`, { limit: 60, windowMs: 60 * 1000 }).ok;
	} catch {
		return true; // no request (a build-time render): nothing to limit
	}
}

async function payloadOf(id) {
	if (isShortCardId(id)) {
		if (!(await shortIdAllowed())) return null;
		try {
			return await getCardPayload(id);
		} catch {
			return null; // database unreachable: the card cannot be read, the page still renders
		}
	}
	return decodeCard(id);
}

// Null for anything that cannot be shown: an id that is cut short or altered, a site that is not
// live, a pack version that does not exist, ids the story does not have. Never throws.
export const readCard = cache(async (id) => {
	try {
		const payload = await payloadOf(id);
		if (!payload) return null;
		// The slug only picks an entry of the site registry. The path that is read comes from the registry.
		const entry = getPlayableSite(payload.s);
		if (!entry || payload.v > entry.version) return null;
		const site = await loadSiteOnServer(entry.slug, entry.version);
		if (!site) return null;
		// A card made on this version of the pack must match its story exactly. A card from an older
		// version is shown from today's story, without any choice the story no longer has.
		const view = cardView(site, { lens: payload.l, choices: payload.c, vote: payload.y }, { strict: payload.v === entry.version });
		return view ? { view, slug: entry.slug } : null;
	} catch {
		return null;
	}
});
