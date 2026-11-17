// POST /api/play/event
//   { anon, src?, c?, events: [{ name, site?, chapter?, props?, path?, age? }] }  ->  { ok, stored, dropped }
// Cookieless analytics, batched: at most 20 events per request, whitelisted names only. An event
// that fails a check is dropped, not stored; the rest of the batch still counts. The creator code
// is stored only if it is a real active code. No IP and no user agent are stored.
// Also accepts the same body sent by navigator.sendBeacon when the page is closing.
// A browser with Do Not Track or Global Privacy Control on gets { ok, stored: 0 } and nothing is kept.
import { getSite } from "@/lib/play/sites";
import { checkCreatorCode } from "@/lib/server/play/creator";
import { EVENT_NAMES, MAX_EVENTS, recordEvents } from "@/lib/server/play/events";
import { fail, handler, limitAnon, limitIp, ok, readJson } from "@/lib/server/play/http";
import { notTracked } from "@/lib/server/play/request";
import { anonOf, intOf, isPlainObject, pathOf, propsOf, slugOf, sourceOf, tokenOf } from "@/lib/server/play/validate";

export const runtime = "nodejs";

export const POST = handler("event", async (request) => {
	const ipLimited = limitIp(request, "event", 60);
	if (ipLimited) return ipLimited;
	const { body, response } = await readJson(request, 16 * 1024);
	if (response) return response;
	const anon = anonOf(body.anon);
	if (!anon) return fail(400, "bad_anon");
	const anonLimited = limitAnon(anon, "event", 30);
	if (anonLimited) return anonLimited;
	if (!Array.isArray(body.events) || body.events.length === 0) return fail(400, "no_events");
	if (body.events.length > MAX_EVENTS) return fail(400, "too_many_events");
	if (notTracked(request)) return ok({ stored: 0, dropped: body.events.length });

	const source = sourceOf(body.src);
	const creatorCode = body.c != null ? await checkCreatorCode(body.c) : null;
	const rows = [];
	for (const e of body.events) {
		if (!isPlainObject(e) || typeof e.name !== "string" || !EVENT_NAMES.has(e.name)) continue;
		// A site is any site in the registry (a locked one can be voted for), else none.
		let site = null;
		if (e.site != null) {
			const slug = slugOf(e.site);
			if (!slug || !getSite(slug)) continue;
			site = slug;
		}
		const chapter = e.chapter == null ? null : tokenOf(e.chapter);
		if (e.chapter != null && !chapter) continue;
		const props = propsOf(e.props);
		if (!props) continue;
		const path = e.path == null ? null : pathOf(e.path);
		rows.push({
			anon_id: anon, site, name: e.name, chapter, props, source, creator_code: creatorCode, path,
			age_ms: intOf(e.age, 0, 600000) ?? 0,
		});
	}
	const stored = await recordEvents(rows);
	return ok({ stored, dropped: body.events.length - rows.length });
});
