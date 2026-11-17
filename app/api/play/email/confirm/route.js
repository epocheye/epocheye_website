// POST /api/play/email/confirm  { t }  ->  { ok, name }  or  { ok: false, error: "taken" | "bad_link" }
// The tap on the email link's page that confirms the address. A visit alone confirms nothing, so a
// mail scanner that fetches the link changes nothing. "taken": another player confirmed the same
// address first.
import { fail, featureOff, handler, limitIp, ok, readJson } from "@/lib/server/play/http";
import { confirmEmail, emailReady } from "@/lib/server/play/email";
import { clearVoteCache } from "@/lib/server/play/vote";

export const runtime = "nodejs";

export const POST = handler("email-confirm", async (request) => {
	const off = featureOff("email");
	if (off) return off;
	const ipLimited = limitIp(request, "email-confirm", 10);
	if (ipLimited) return ipLimited;
	const { body, response } = await readJson(request, 1024);
	if (response) return response;
	if (!emailReady()) return fail(503, "email_unavailable");
	const r = await confirmEmail(body.t);
	if (!r) return fail(400, "bad_link");
	if (r.taken) return fail(409, "taken");
	clearVoteCache();
	return ok({ name: r.name });
});
