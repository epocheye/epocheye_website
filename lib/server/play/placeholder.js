import "server-only";

// A route that exists, is rate limited, and answers "not ready" until its feature is built.

import { fail, handler, limitIp } from "@/lib/server/play/http";

export function placeholder(name) {
	return handler(name, async (request) => {
		const limited = limitIp(request, name, 30);
		if (limited) return limited;
		return fail(501, "not_ready");
	});
}
