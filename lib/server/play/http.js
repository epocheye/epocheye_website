import "server-only";

// Shared plumbing for /api/play/*: JSON in with a size cap, rate limits per IP and per player,
// and { ok, ... } out. Errors never carry a stack trace or a database message.

import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";

const MINUTE = 60 * 1000;

export function ok(data = {}, { headers } = {}) {
	return NextResponse.json({ ok: true, ...data }, { headers: { "Cache-Control": "no-store", ...headers } });
}

export function fail(status, error, { headers } = {}) {
	return NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function tooMany(retryAfter) {
	return fail(429, "rate_limited", { headers: { "Retry-After": String(retryAfter || 60) } });
}

// Per-IP limit for a route. Returns a 429 response, or null when the request may go on.
export function limitIp(request, scope, perMinute) {
	const r = rateLimit(`play:${scope}:ip:${clientIp(request)}`, { limit: perMinute, windowMs: MINUTE });
	return r.ok ? null : tooMany(r.retryAfter);
}

// Per-player limit for a route, once the anonymous id is known.
export function limitAnon(anonId, scope, perMinute) {
	if (!anonId) return null;
	const r = rateLimit(`play:${scope}:anon:${anonId}`, { limit: perMinute, windowMs: MINUTE });
	return r.ok ? null : tooMany(r.retryAfter);
}

// Reads a JSON object body of at most maxBytes. { body } or { response } with the error.
export async function readJson(request, maxBytes = 8 * 1024) {
	const declared = Number(request.headers.get("content-length") || 0);
	if (declared > maxBytes) return { response: fail(413, "too_large") };
	let text;
	try {
		text = await request.text();
	} catch {
		return { response: fail(400, "bad_body") };
	}
	if (Buffer.byteLength(text, "utf8") > maxBytes) return { response: fail(413, "too_large") };
	let body;
	try {
		body = JSON.parse(text);
	} catch {
		return { response: fail(400, "bad_json") };
	}
	if (!body || typeof body !== "object" || Array.isArray(body)) return { response: fail(400, "bad_body") };
	return { body };
}

// Wraps a handler so that anything unexpected becomes a plain 500 with no detail.
export function handler(name, fn) {
	return async (request, ctx) => {
		try {
			return await fn(request, ctx);
		} catch (err) {
			console.error(`[play:${name}]`, err?.message || err);
			return fail(500, "server_error");
		}
	};
}
