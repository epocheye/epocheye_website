import "server-only";

// The weekly vote: which locked site gets built next (brief 1.5). Built on votes.js.
//
// - The week starts on Monday at 00:00 in Asia/Kolkata. The week key is that Monday's date.
// - One vote per player per week, changeable within the week (votes.js upserts).
// - Voting needs an email given with consent. A vote counts in the results only once that
//   address is confirmed, so a script cannot mint anonymous ids and vote with made-up addresses.
// - A founding member's vote is recorded as binding (play_votes.binding). Who is a founding
//   member is set by an admin (play_player_email.founding_member); nothing sets it on its own.
// - Results are whole percentages, and only once the week has MIN_VOTES counted votes. No count
//   is ever returned to a player.

import { getSql } from "@/lib/server/neon";
import { lockedSites } from "@/lib/play/sites";
import { castWeeklyVote, weeklyVoteOf } from "@/lib/server/play/votes";
import { MIN_VOTES, sharesOf } from "@/lib/server/play/yearVotes";

export { MIN_VOTES };

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

// The Monday (Asia/Kolkata) of the week a moment falls in, as YYYY-MM-DD.
export function weekOfKolkata(now = new Date()) {
	const local = new Date(now.getTime() + IST_OFFSET_MS); // read its UTC fields as Kolkata time
	const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
	d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
	return d.toISOString().slice(0, 10);
}

// The sites that can be voted for: the locked cards, in registry order.
export function voteChoices() {
	return lockedSites().map((s) => s.slug);
}

export function isVoteChoice(slug) {
	return typeof slug === "string" && voteChoices().includes(slug);
}

// emailState comes from email.js emailStateOf(). Returns { ok } or { ok: false, error }.
export async function castVote({ playerId, siteChoice, emailState, week = weekOfKolkata() }) {
	if (!isVoteChoice(siteChoice)) return { ok: false, error: "unknown_site" };
	if (!emailState || emailState.state === "none") return { ok: false, error: "email_required" };
	const binding = emailState.founding && emailState.state === "confirmed";
	await castWeeklyVote({ playerId, siteChoice, binding, week });
	return { ok: true };
}

export async function myVote(playerId, week = weekOfKolkata()) {
	const row = await weeklyVoteOf(playerId, week);
	return row && isVoteChoice(row.site_choice) ? row.site_choice : null;
}

async function counts(week, { bindingOnly = false } = {}) {
	const sql = getSql();
	const rows = await sql`
		SELECT v.site_choice, COUNT(*)::int AS n
		FROM play_votes v
		JOIN play_players p ON p.id = v.player_id
		JOIN play_player_email e ON e.player_id = p.id AND e.confirmed_email = p.email
		WHERE v.week = ${week}::date AND (NOT ${bindingOnly}::boolean OR e.founding_member)
		GROUP BY v.site_choice
	`;
	return new Map(rows.map((r) => [r.site_choice, r.n]));
}

const TTL_MS = 15 * 1000;
let cached = null; // { week, at, counts }

// { enough: false } or { enough: true, shares: [{ id, pct }] } over the vote choices.
export async function weeklyShares(week = weekOfKolkata()) {
	if (!cached || cached.week !== week || Date.now() - cached.at >= TTL_MS) {
		cached = { week, at: Date.now(), counts: await counts(week) };
	}
	const shares = sharesOf(cached.counts, voteChoices());
	return shares ? { enough: true, shares } : { enough: false };
}

// For the admin only: counted votes per site this week, all and binding. Raw counts never go
// to a player.
export async function adminTally(week = weekOfKolkata()) {
	const [all, binding] = await Promise.all([counts(week), counts(week, { bindingOnly: true })]);
	return voteChoices().map((id) => ({ id, counted: all.get(id) || 0, binding: binding.get(id) || 0 }));
}

export function clearVoteCache() {
	cached = null;
}
