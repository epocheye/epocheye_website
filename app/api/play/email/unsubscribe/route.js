// POST /api/play/email/unsubscribe  { t, forget? }  ->  { ok, forgot }
// Stops every Play email for the player behind a signed unsubscribe link. With forget: true the
// address and the consent are removed as well. 400 { error: "bad_link" } for an invalid link.
import { fail, handler, limitIp, ok, readJson } from "@/lib/server/play/http";
import { emailReady, unsubscribe } from "@/lib/server/play/email";

export const runtime = "nodejs";

export const POST = handler("email-unsubscribe", async (request) => {
	const ipLimited = limitIp(request, "email-unsubscribe", 10);
	if (ipLimited) return ipLimited;
	const { body, response } = await readJson(request, 1024);
	if (response) return response;
	if (!emailReady()) return fail(503, "email_unavailable");
	const r = await unsubscribe(body.t, { forget: body.forget === true });
	return r ? ok({ forgot: r.forgot }) : fail(400, "bad_link");
});
