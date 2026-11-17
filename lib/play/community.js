// The Play client's calls for the weekly vote, email and leaderboards. Built on lib/play/api.js:
// same timeout, never throws, { ok: false } on any failure. These are the player's own acts, so
// they run with Do Not Track on as well (like the year vote); only the analytics events respect it.

import { call, runFinished, track, who } from "@/lib/play/api";
import { anonId, setAnonId } from "@/lib/play/player";

// ---- weekly vote

export function weeklyResults() {
	return call("/api/play/vote", { timeoutMs: 5000 });
}

// { ok, mine, email, name }
export function myWeeklyVote() {
	return call("/api/play/vote/me", { body: { anon: anonId() } });
}

// { ok, mine, counted } or { ok: false, error: "email_required" }
export function castWeeklyVote(site) {
	return call("/api/play/vote", { body: { ...who(), site } }).then((r) => {
		if (r.ok) track("vote", { props: { site, counted: !!r.counted } });
		return r;
	});
}

// ---- email

export function giveEmail(email, consent, reason) {
	return call("/api/play/email", { body: { ...who(), email, consent: consent === true } }).then((r) => {
		if (r.ok) track("email_given", { props: { reason: reason || null } });
		return r;
	});
}

// { ok, email: "none"|"pending"|"confirmed", unsubscribed, early }
export function emailStatus() {
	return call("/api/play/email/status", { body: { anon: anonId() } });
}

// Confirms the address behind an email link (a tap on /play/unlock). { ok, name } or
// { ok: false, error: "taken" | "bad_link" }.
export function confirmLink(t) {
	return call("/api/play/email/confirm", { body: { t } });
}

// Moves the player behind an email link onto this browser: name, votes and daily results. Each
// link does this once. { ok, name } or { ok: false }.
export async function restoreFromLink(t) {
	const r = await call("/api/play/email/restore", { body: { t } });
	if (!r.ok || !setAnonId(r.anon)) return { ok: false };
	track("unlock", { props: { what: "restore" } });
	return { ok: true, name: r.name };
}

export function unsubscribeLink(t, forget) {
	return call("/api/play/email/unsubscribe", { body: { t, forget: forget === true } });
}

// ---- leaderboards

// kind "site" (with site) or "streak". Waits for this page's own finished run to land first.
export async function leaderboard(kind, site) {
	if (site) await runFinished(site);
	return call("/api/play/leaderboard", { body: { kind, site: site || undefined, anon: anonId() }, timeoutMs: 6000 });
}
