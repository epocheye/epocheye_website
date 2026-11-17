// Reads a shared card on the server: the id from the URL, checked, then the pack it names.
// Import from server files only (the card page and its share image).

import { cache } from "react";
import { cardView, decodeCard } from "@/lib/play/card";
import { loadSiteOnServer } from "@/lib/play/pack.server";
import { getPlayableSite } from "@/lib/play/sites";

// Null for anything that cannot be shown: an id that is cut short or altered, a site that is not
// live, a pack version that does not exist, ids the story does not have. Never throws.
export const readCard = cache(async (id) => {
	try {
		const payload = decodeCard(id);
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
