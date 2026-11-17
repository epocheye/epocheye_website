// POST /api/play/email  { anon, email, consent: true, c?, src? }  ->  { ok }
// The player leaves an email, with the consent box ticked (consent must be exactly true, or 400
// { error: "consent_required" }). The address becomes this player's claim; a confirmation link
// goes to it, or, if another player already confirmed it, that player gets a link to their own
// game (lib/server/play/email.js). The answer, and what this player can see afterwards, is the
// same whoever the address belongs to.
// 503 { error: "email_unavailable" } when PLAY_SIGNING_SECRET is not set: nothing is stored or sent.
// Limits: per IP 5 per 10 minutes, per address 3 per hour (here, per server instance); in the
// database, across instances: one send per player every 2 minutes, 3 a day per player and 3 a
// day per address.
import { rateLimit, clientIp } from "@/lib/server/rateLimit";
import { fail, featureOff, handler, limitAnon, ok, readJson } from "@/lib/server/play/http";
import { emailOf, emailReady, requestEmail } from "@/lib/server/play/email";
import { arrival } from "@/lib/server/play/request";
import { anonOf } from "@/lib/server/play/validate";
import { findPlayer } from "@/lib/server/play/players";

export const runtime = "nodejs";

const TEN_MIN = 10 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function limited(r) {
	return r.ok ? null : fail(429, "rate_limited", { headers: { "Retry-After": String(r.retryAfter || 60) } });
}

export const POST = handler("email", async (request) => {
	const off = featureOff("email");
	if (off) return off;
	const byIp = limited(rateLimit(`play:email:ip:${clientIp(request)}`, { limit: 5, windowMs: TEN_MIN }));
	if (byIp) return byIp;
	const { body, response } = await readJson(request, 1024);
	if (response) return response;
	const anon = anonOf(body.anon);
	if (!anon) return fail(400, "bad_anon");
	const email = emailOf(body.email);
	if (!email) return fail(400, "bad_email");
	if (body.consent !== true) return fail(400, "consent_required");
	if (!emailReady()) return fail(503, "email_unavailable");
	const byAnon = limitAnon(anon, "email", 3);
	if (byAnon) return byAnon;
	const byAddress = limited(rateLimit(`play:email:addr:${email}`, { limit: 3, windowMs: HOUR }));
	if (byAddress) return byAddress;
	const { playerId } = await arrival(anon, body, request);
	const player = await findPlayer(anon);
	const r = await requestEmail({ playerId, displayName: player?.displayName || "", email });
	if (!r.sent) console.warn(`[play:email] not sent: ${r.reason}`);
	return ok();
});
