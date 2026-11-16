import "server-only";

// Best-effort, per-instance sliding window. Serverless instances do not share
// this memory, so it slows a single noisy client rather than enforcing a hard
// global cap; pair it with a Vercel Firewall rule for that.
const buckets = new Map();
const MAX_KEYS = 10_000;

export function rateLimit(key, { limit, windowMs }) {
	const now = Date.now();
	const cutoff = now - windowMs;
	const hits = (buckets.get(key) || []).filter((t) => t > cutoff);

	if (hits.length >= limit) {
		buckets.set(key, hits);
		return { ok: false, retryAfter: Math.ceil((hits[0] + windowMs - now) / 1000) };
	}

	hits.push(now);
	buckets.set(key, hits);

	if (buckets.size > MAX_KEYS) {
		for (const [k, v] of buckets) {
			if (!v.length || v[v.length - 1] <= cutoff) buckets.delete(k);
		}
	}
	return { ok: true };
}

export function clientIp(request) {
	const forwarded = request.headers.get("x-forwarded-for");
	if (forwarded) return forwarded.split(",")[0].trim();
	return request.headers.get("x-real-ip") || "unknown";
}
