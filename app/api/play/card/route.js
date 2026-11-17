// POST /api/play/card   { site, lens, choices: { choiceBeatId: optionId }, vote }  ->  { ok, id }
//   A short id for a "What you now know" card (/play/c/<id>). The card must match the pack's
//   story exactly (the same strict check the card page uses), so a short id never names nonsense.
//   The same card always gets the same id.
// GET  /api/play/card?id=<short id>  ->  { ok, card: { site, version, lens, choices, vote } }
import { cardView, isShortCardId } from "@/lib/play/card";
import { createCard, getCardPayload } from "@/lib/server/play/cards";
import { fail, featureOff, handler, limitAnon, limitIp, ok, readJson } from "@/lib/server/play/http";
import { storyFor } from "@/lib/server/play/story";
import { anonOf, isPlainObject, slugOf, tokenOf } from "@/lib/server/play/validate";

export const runtime = "nodejs";

export const POST = handler("card", async (request) => {
	const off = featureOff();
	if (off) return off;
	const ipLimited = limitIp(request, "card", 20);
	if (ipLimited) return ipLimited;
	const { body, response } = await readJson(request, 4096);
	if (response) return response;
	// The anonymous id is optional here (a card is not tied to a player), but limits when sent.
	const anonLimited = limitAnon(anonOf(body.anon), "card", 10);
	if (anonLimited) return anonLimited;
	const slug = slugOf(body.site);
	const story = slug ? await storyFor(slug) : null;
	if (!story) return fail(400, "unknown_site");
	const lens = tokenOf(body.lens);
	if (!lens) return fail(400, "unknown_lens");
	if (body.choices != null && !isPlainObject(body.choices)) return fail(400, "bad_choices");
	const choices = {};
	for (const [k, v] of Object.entries(body.choices || {})) {
		if (!tokenOf(k) || !tokenOf(v)) return fail(400, "unknown_choice");
		choices[k] = v;
	}
	if (Object.keys(choices).length > 40) return fail(400, "unknown_choice");
	const vote = body.vote == null ? null : tokenOf(body.vote);
	if (body.vote != null && !vote) return fail(400, "unknown_vote");
	const view = cardView(story.site, { lens, choices, vote }, { strict: true });
	if (!view) return fail(400, "card_does_not_match_story");
	const id = await createCard({ slug: story.entry.slug, version: story.entry.version, lens, choices, vote });
	return ok({ id });
});

export const GET = handler("card-get", async (request) => {
	const off = featureOff();
	if (off) return off;
	const ipLimited = limitIp(request, "card-get", 120);
	if (ipLimited) return ipLimited;
	const id = new URL(request.url).searchParams.get("id");
	if (!isShortCardId(id)) return fail(400, "bad_id");
	const p = await getCardPayload(id);
	if (!p) return fail(404, "not_found");
	return ok({ card: { site: p.s, version: p.v, lens: p.l, choices: p.c, vote: p.y } });
});
