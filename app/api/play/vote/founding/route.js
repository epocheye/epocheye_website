// Admin only (the existing admin session cookie).
// GET  /api/play/vote/founding  ->  { ok, week, tally: [{ id, counted, binding }] }
//   This week's counted votes per site, all and from founding members. Raw counts: admin only.
// POST /api/play/vote/founding  { email, founding: boolean }  ->  { ok }  (404 when no player has that address)
//   Marks or unmarks a founding member. A founding member's vote is recorded as binding.
import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { fail, handler, limitIp, ok, readJson } from "@/lib/server/play/http";
import { emailOf, setFoundingMember } from "@/lib/server/play/email";
import { adminTally, weekOfKolkata } from "@/lib/server/play/vote";

export const runtime = "nodejs";

function admin(request) {
	const auth = verifyAdminJWTFromRequest(request);
	return auth.ok ? null : fail(auth.status || 401, "not_admin");
}

export const GET = handler("vote-founding-get", async (request) => {
	const limited = limitIp(request, "vote-founding", 30) || admin(request);
	if (limited) return limited;
	const week = weekOfKolkata();
	return ok({ week, tally: await adminTally(week) });
});

export const POST = handler("vote-founding", async (request) => {
	const limited = limitIp(request, "vote-founding", 30) || admin(request);
	if (limited) return limited;
	const { body, response } = await readJson(request, 1024);
	if (response) return response;
	const email = emailOf(body.email);
	if (!email || typeof body.founding !== "boolean") return fail(400, "bad_body");
	return (await setFoundingMember(email, body.founding)) ? ok() : fail(404, "no_player");
});
