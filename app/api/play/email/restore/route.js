// POST /api/play/email/restore  { t }  ->  { ok, anon, name }
// The anonymous id behind a link to a confirmed player, so the device that opened the link can
// play as that player. Each link does this once. 400 { error: "bad_link" } for anything else.
import { fail, handler, limitIp, ok, readJson } from "@/lib/server/play/http";
import { emailReady, restoreFromLink } from "@/lib/server/play/email";

export const runtime = "nodejs";

export const POST = handler("email-restore", async (request) => {
	const ipLimited = limitIp(request, "email-restore", 10);
	if (ipLimited) return ipLimited;
	const { body, response } = await readJson(request, 1024);
	if (response) return response;
	if (!emailReady()) return fail(503, "email_unavailable");
	const r = await restoreFromLink(body.t);
	return r ? ok(r) : fail(400, "bad_link");
});
