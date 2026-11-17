import "server-only";

// Small hand-written validators for Play's route handlers. Each returns the clean value or null.
// Nothing a client sends reaches SQL except through these and tagged-template parameters.

import { ANON_ID_RE, CREATOR_CODE_RE, SOURCE_RE } from "@/lib/play/player";

export const TOKEN_RE = /^[A-Za-z0-9_.:-]{1,64}$/;
export const SLUG_RE = /^[a-z0-9_][a-z0-9_-]{0,79}$/;

export function anonOf(value) {
	return typeof value === "string" && ANON_ID_RE.test(value) ? value : null;
}

export function tokenOf(value) {
	return typeof value === "string" && TOKEN_RE.test(value) ? value : null;
}

export function slugOf(value) {
	return typeof value === "string" && SLUG_RE.test(value) ? value : null;
}

export function sourceOf(value) {
	if (typeof value !== "string") return null;
	const v = value.toLowerCase();
	return SOURCE_RE.test(v) ? v : null;
}

// Shape only. Whether the code is a real, active promo code is checked in creator.js.
export function creatorCodeShape(value) {
	return typeof value === "string" && CREATOR_CODE_RE.test(value) ? value.toUpperCase() : null;
}

export function intOf(value, min, max) {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	const n = Math.round(value);
	return n >= min && n <= max ? n : null;
}

export function isPlainObject(value) {
	return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

// A short path on this site, for analytics only. Query strings are dropped.
export function pathOf(value) {
	if (typeof value !== "string") return null;
	const p = value.split("?")[0].split("#")[0];
	return /^\/[A-Za-z0-9/_.\-]{0,199}$/.test(p) ? p : null;
}

// Event props: a flat object, at most 12 keys, short token keys, values that are short strings,
// finite numbers, booleans or null. Anything else drops the whole props object.
export function propsOf(value) {
	if (value == null) return {};
	if (!isPlainObject(value)) return null;
	const entries = Object.entries(value);
	if (entries.length > 12) return null;
	const out = {};
	for (const [k, v] of entries) {
		if (!/^[a-z][a-z0-9_]{0,31}$/.test(k)) return null;
		if (v === null || typeof v === "boolean") out[k] = v;
		else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
		else if (typeof v === "string" && v.length <= 120) out[k] = v;
		else return null;
	}
	return out;
}

// The run key: the time the player started the run, in ms since 1970, as the browser saw it.
// Accepted from 30 days ago to 10 minutes ahead (clock skew).
export function runStartOf(value) {
	if (typeof value !== "number" || !Number.isInteger(value)) return null;
	const now = Date.now();
	return value >= now - 30 * 86400000 && value <= now + 600000 ? new Date(value) : null;
}
