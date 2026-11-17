import "server-only";

// Play email: optional, with consent, for three things only (brief 5.4): to vote, to open the
// next site a week early, and to carry a player (name, votes, daily streak) to another device.
//
// Flow:
//   1. The player gives an address and ticks the consent box. That is a claim
//      (play_email_claims), not ownership: any number of players may claim one address.
//   2. If a player already has that address CONFIRMED, its owner is sent a link that opens their
//      player on another device. Otherwise the claimant is sent a confirmation link.
//      Either way the claimant now has a claim, so what the caller can see afterwards (email
//      status, vote) is the same whoever owns the address: the form tells nobody who plays.
//   3. Confirming is a tap on the link's page (a POST), not the visit, so a mail scanner that
//      fetches the link confirms nothing. The first claimant to confirm gets the address
//      (play_players.email, unique, holds confirmed addresses only). A claim nobody confirms
//      expires with its link and blocks nobody.
//   4. Moving the player onto another device is a separate tap. Each link moves a player once:
//      the link's nonce is cleared when it is used.
// Every email carries a signed unsubscribe link, which also stops the address (by tag) for every
// claimant except the confirmed owner who stopped it.
//
// Links are signed (HMAC-SHA256 with PLAY_SIGNING_SECRET) and point at PLAY_PUBLIC_URL, or else the
// site's own address (lib/site.js), never at the request's host. Fails closed: without the secret
// nothing is signed, sent or verified. PLAY_EMAIL_DRY_RUN=1 logs instead of sending; the log shows
// a tag of the address, and the links only for addresses ending in @example.com.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { deliverEmail } from "@/lib/server/email";
import { getSql } from "@/lib/server/neon";
import { earlySite, SITES } from "@/lib/play/sites";
import { SITE_URL } from "@/lib/site";

const CONFIRM_TTL_S = 14 * 24 * 3600;
const SLOT_S = 120; // at most one email to a player per two-minute slot
const MAX_SENDS_PER_DAY = 3; // per player and per address

// ---- addresses

const EMAIL_RE = /^[^\s@"<>()[\],;:\\]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

// The address, trimmed and lower-cased, or null.
export function emailOf(value) {
	if (typeof value !== "string") return null;
	const v = value.trim().toLowerCase();
	return v.length <= 254 && EMAIL_RE.test(v) ? v : null;
}

// A short one-way tag of an address: what logs and send counts use instead of the address.
export function emailTag(email) {
	return createHash("sha256").update(String(email)).digest("base64url").slice(0, 16);
}

// Where links in emails point: PLAY_PUBLIC_URL when set (no trailing slash; http only for a local
// host), else the site's canonical address. Never the host a request came in on.
export function linkBase() {
	const set = process.env.PLAY_PUBLIC_URL;
	if (set && (/^https:\/\/[^\s/]+$/.test(set) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(set))) return set;
	return SITE_URL;
}

export function dryRun() {
	return process.env.PLAY_EMAIL_DRY_RUN === "1";
}

// ---- signing

function secret() {
	const s = process.env.PLAY_SIGNING_SECRET;
	return typeof s === "string" && s.length >= 32 ? s : null;
}

export function emailReady() {
	return !!secret();
}

function sign(payload) {
	const key = secret();
	if (!key) throw new Error("PLAY_SIGNING_SECRET is not set");
	const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
	const mac = createHmac("sha256", key).update(`play.v1.${body}`).digest("base64url");
	return `${body}.${mac}`;
}

// The payload of a valid, unexpired token of the given kind, or null.
function verify(token, kind) {
	const key = secret();
	if (!key || typeof token !== "string" || token.length > 600) return null;
	const [body, mac, extra] = token.split(".");
	if (!body || !mac || extra !== undefined) return null;
	const want = createHmac("sha256", key).update(`play.v1.${body}`).digest();
	let got;
	try {
		got = Buffer.from(mac, "base64url");
	} catch {
		return null;
	}
	if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
	let p;
	try {
		p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
	} catch {
		return null;
	}
	if (!p || p.k !== kind || typeof p.p !== "string" || typeof p.e !== "string") return null;
	if (!/^[0-9a-f-]{36}$/i.test(p.p)) return null;
	if (p.x != null && (typeof p.x !== "number" || p.x * 1000 < Date.now())) return null;
	return p;
}

function linkToken(playerId, email, nonce) {
	return sign({ k: "c", p: playerId, e: emailTag(email), n: nonce, x: Math.floor(Date.now() / 1000) + CONFIRM_TTL_S });
}

// Unsubscribe links never expire.
function unsubscribeToken(playerId, email) {
	return sign({ k: "u", p: playerId, e: emailTag(email) });
}

// ---- state

// "none", "pending" (a live claim, not confirmed) or "confirmed", plus the flags that go with it.
// A player with a confirmed address who claims another stays "confirmed" until the new one is.
export async function emailStateOf(playerId) {
	const sql = getSql();
	const rows = await sql`
		SELECT p.email, p.email_consent, e.confirmed_email, e.unsubscribed_at, COALESCE(e.founding_member, false) AS founding,
		       (c.player_id IS NOT NULL AND c.requested_at > now() - make_interval(secs => ${CONFIRM_TTL_S})) AS claim
		FROM play_players p
		LEFT JOIN play_player_email e ON e.player_id = p.id
		LEFT JOIN play_email_claims c ON c.player_id = p.id
		WHERE p.id = ${playerId} LIMIT 1
	`;
	const r = rows[0];
	if (!r) return { state: "none", unsubscribed: false, founding: false };
	const confirmed = !!r.email && r.email_consent && r.confirmed_email === r.email;
	return {
		state: confirmed ? "confirmed" : r.claim ? "pending" : "none",
		unsubscribed: !!r.unsubscribed_at,
		founding: !!r.founding,
	};
}

// Early access (brief 5.5): a site that opens within a week, for a player who confirmed an email.
export function isUnlockedEarly(player, site, now = Date.now()) {
	return !!player && player.state === "confirmed" && !!site && earlySite(site.slug, now) === site;
}

export function earlySlugsFor(player, now = Date.now()) {
	return SITES.filter((s) => isUnlockedEarly(player, s, now)).map((s) => s.slug);
}

// ---- sending

// Takes one send for this recipient player and address, or returns false. Atomic: the unique
// (player_id, slot) key lets only one request through per player per two-minute slot, and the
// same statement checks the daily caps for the player and the address.
async function takeSend(playerId, tag, kind, dry) {
	const sql = getSql();
	const rows = await sql`
		INSERT INTO play_email_sends (player_id, email_tag, kind, dry_run, slot)
		SELECT ${playerId}, ${tag}, ${kind}, ${dry}, floor(EXTRACT(EPOCH FROM now()) / ${SLOT_S})::bigint
		WHERE (SELECT COUNT(*) FROM play_email_sends WHERE player_id = ${playerId} AND sent_at > now() - interval '1 day') < ${MAX_SENDS_PER_DAY}
		  AND (SELECT COUNT(*) FROM play_email_sends WHERE email_tag = ${tag} AND sent_at > now() - interval '1 day') < ${MAX_SENDS_PER_DAY}
		  AND NOT EXISTS (SELECT 1 FROM play_email_sends WHERE player_id = ${playerId} AND sent_at > now() - make_interval(secs => ${SLOT_S}))
		ON CONFLICT (player_id, slot) DO NOTHING
		RETURNING id
	`;
	return rows.length > 0;
}

function letter({ name, link, unsubscribeUrl, owner }) {
	const subject = owner ? "Your Epocheye Play link" : "Confirm your email for Epocheye Play";
	const opening = owner
		? "Someone asked to open your Epocheye Play player on another device. If that was you, open this link on that device:"
		: "Open this link and tap Confirm to confirm your email for Epocheye Play:";
	const carry = "The same link carries your Play name, your votes and your daily streak to another phone or computer. It works once. Keep it to yourself.";
	const gets = "With a confirmed email, your vote for the next site counts, and when a new site opens you can play it a week before everyone else.";
	const lines = [`Hello ${name},`, "", opening, link, "", carry, "", gets, "", "If you did not ask for this, ignore this email.", "", `Stop all Play emails: ${unsubscribeUrl}`, "", "Epocheye"];
	const text = lines.join("\n");
	const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	const p = (s) => `<p style="margin:0 0 16px">${s}</p>`;
	const html = [
		'<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111;max-width:520px">',
		p(`Hello ${esc(name)},`),
		p(esc(opening)),
		p(`<a href="${esc(link)}" style="color:#111;font-weight:bold">${owner ? "Open my player" : "Confirm my email"}</a>`),
		p(esc(carry)),
		p(esc(gets)),
		p("If you did not ask for this, ignore this email."),
		`<p style="margin:24px 0 0;font-size:12px;color:#666"><a href="${esc(unsubscribeUrl)}" style="color:#666">Stop all Play emails</a></p>`,
		"</div>",
	].join("");
	return { subject, text, html };
}

// Sends one email for the player behind the link (playerId), whose live nonce is `nonce`.
async function sendLink({ playerId, email, name, nonce, owner }) {
	const tag = emailTag(email);
	const dry = dryRun();
	if (!(await takeSend(playerId, tag, owner ? "owner" : "confirm", dry))) return { sent: false, reason: "too_soon" };
	// Links carry the token in the fragment (#t=), which no request, log or Referer ever carries.
	const base = linkBase();
	const link = `${base}/play/unlock#t=${linkToken(playerId, email, nonce)}`;
	const unsubscribeUrl = `${base}/play/unlock/stop#t=${unsubscribeToken(playerId, email)}`;
	const msg = letter({ name, link, unsubscribeUrl, owner });
	if (dry) {
		const testAddress = email.endsWith("@example.com");
		console.log(
			`[play:email:dry-run] to=tag:${tag}${testAddress ? ` (${email})` : ""} subject="${msg.subject}"` +
				(testAddress ? ` link=${link} unsubscribe=${unsubscribeUrl}` : " links withheld (not an @example.com address)"),
		);
		return { sent: true };
	}
	const r = await deliverEmail({ to: email, subject: msg.subject, text: msg.text, html: msg.html });
	return r.ok ? { sent: true } : { sent: false, reason: "send_failed" };
}

// The address is stopped for this player? A stop by the address's confirmed owner is lifted when
// that same player gives consent again; every other stop holds.
async function stoppedFor(playerId, tag) {
	const sql = getSql();
	const rows = await sql`SELECT player_id, by_owner FROM play_email_stops WHERE email_tag = ${tag} LIMIT 1`;
	const stop = rows[0];
	if (!stop) return false;
	if (stop.by_owner && stop.player_id === playerId) {
		await sql`DELETE FROM play_email_stops WHERE email_tag = ${tag} AND player_id = ${playerId}`;
		await sql`UPDATE play_player_email SET unsubscribed_at = NULL, updated_at = now() WHERE player_id = ${playerId}`;
		return false;
	}
	return true;
}

// The player gives an address with consent. The caller's visible state afterwards is the same
// whoever the address belongs to (see the top of this file). Returns { sent, reason } for logging
// only; the route never passes it on.
export async function requestEmail({ playerId, displayName, email }) {
	const sql = getSql();
	const tag = emailTag(email);
	const nonce = randomBytes(12).toString("base64url");
	// Housekeeping: claims nobody confirmed in time are cleared out.
	await sql`DELETE FROM play_email_claims WHERE requested_at < now() - make_interval(secs => ${CONFIRM_TTL_S})`;
	await sql`
		INSERT INTO play_email_claims (player_id, email, nonce, consent_at, requested_at)
		VALUES (${playerId}, ${email}, ${nonce}, now(), now())
		ON CONFLICT (player_id) DO UPDATE
			SET email = EXCLUDED.email, nonce = EXCLUDED.nonce, consent_at = EXCLUDED.consent_at, requested_at = EXCLUDED.requested_at
	`;
	const owners = await sql`
		SELECT p.id, p.display_name, e.unsubscribed_at
		FROM play_players p JOIN play_player_email e ON e.player_id = p.id AND e.confirmed_email = p.email
		WHERE p.email = ${email} LIMIT 1
	`;
	const owner = owners[0];
	if (owner) {
		// Someone (perhaps the owner on another device) typed a confirmed address. Its owner gets a
		// link to their own player, unless they stopped Play emails.
		if (owner.unsubscribed_at || (await stoppedFor(owner.id, tag))) return { sent: false, reason: "stopped" };
		const ownerNonce = randomBytes(12).toString("base64url");
		await sql`UPDATE play_players SET unlock_token = ${ownerNonce} WHERE id = ${owner.id}`;
		return sendLink({ playerId: owner.id, email, name: owner.display_name, nonce: ownerNonce, owner: true });
	}
	if (await stoppedFor(playerId, tag)) return { sent: false, reason: "stopped" };
	return sendLink({ playerId, email, name: displayName, nonce, owner: false });
}

// What a link is: { kind: "claim", player, claim } for a live confirmation link, { kind: "owner",
// player } for a link to a player whose confirmed address it names and whose nonce it carries, or
// null. Changes nothing.
async function readLink(token) {
	const p = verify(token, "c");
	if (!p || typeof p.n !== "string") return null;
	const sql = getSql();
	const rows = await sql`
		SELECT p.id, p.anon_id, p.display_name, p.email, p.unlock_token, e.confirmed_email,
		       c.email AS claim_email, c.nonce AS claim_nonce, c.consent_at,
		       (c.requested_at > now() - make_interval(secs => ${CONFIRM_TTL_S})) AS claim_live
		FROM play_players p
		LEFT JOIN play_player_email e ON e.player_id = p.id
		LEFT JOIN play_email_claims c ON c.player_id = p.id
		WHERE p.id = ${p.p}::uuid LIMIT 1
	`;
	const r = rows[0];
	if (!r) return null;
	if (r.claim_email && r.claim_live && r.claim_nonce === p.n && emailTag(r.claim_email) === p.e) return { kind: "claim", player: r };
	if (r.email && r.confirmed_email === r.email && r.unlock_token === p.n && emailTag(r.email) === p.e) return { kind: "owner", player: r };
	return null;
}

// Confirms the address behind a link (the tap on /play/unlock). Returns { name } when the link's
// player now has that address confirmed, { taken: true } when another player confirmed it first,
// or null for a link that does not work.
export async function confirmEmail(token) {
	const link = await readLink(token);
	if (!link) return null;
	const r = link.player;
	if (link.kind === "owner") return { name: r.display_name };
	const sql = getSql();
	// A legacy hold on the address by a player who never confirmed it is released.
	await sql`
		UPDATE play_players SET email = NULL, email_consent = false, email_consent_at = NULL
		WHERE email = ${r.claim_email} AND id <> ${r.id}
		  AND NOT EXISTS (SELECT 1 FROM play_player_email e WHERE e.player_id = play_players.id AND e.confirmed_email = play_players.email)
	`;
	try {
		await sql`
			UPDATE play_players
			SET email = ${r.claim_email}, email_consent = true, email_consent_at = ${r.consent_at}, unlock_token = ${r.claim_nonce}
			WHERE id = ${r.id}
		`;
	} catch (err) {
		if (err?.code === "23505") return { taken: true };
		throw err;
	}
	await sql`
		INSERT INTO play_player_email (player_id, confirmed_email, confirmed_at)
		VALUES (${r.id}, ${r.claim_email}, now())
		ON CONFLICT (player_id) DO UPDATE
			SET confirmed_email = EXCLUDED.confirmed_email, confirmed_at = now(), unsubscribed_at = NULL, updated_at = now()
	`;
	await sql`DELETE FROM play_email_claims WHERE player_id = ${r.id} AND nonce = ${r.claim_nonce}`;
	return { name: r.display_name };
}

// The anonymous id behind a link to a confirmed player, for moving that player to the device that
// opened it. One use: the link's nonce is cleared in the same statement, so a forwarded or
// reused link moves nothing. Returns { anon, name } or null.
export async function restoreFromLink(token) {
	const p = verify(token, "c");
	if (!p || typeof p.n !== "string") return null;
	const sql = getSql();
	const rows = await sql`
		UPDATE play_players SET unlock_token = NULL
		WHERE id = ${p.p}::uuid AND unlock_token = ${p.n}
		  AND EXISTS (SELECT 1 FROM play_player_email e WHERE e.player_id = play_players.id AND e.confirmed_email = play_players.email)
		RETURNING anon_id, display_name, email
	`.catch(() => []);
	const r = rows[0];
	if (!r || emailTag(r.email) !== p.e) return null;
	return { anon: r.anon_id, name: r.display_name };
}

// Unsubscribe, and optionally forget the address as well. Returns { done, forgot } or null.
// Stops every Play email to the player behind the link and to the address it was sent to, from
// any claimant. A stop by the address's confirmed owner can be lifted by that owner only.
export async function unsubscribe(token, { forget = false } = {}) {
	const p = verify(token, "u");
	if (!p) return null;
	const sql = getSql();
	const rows = await sql`
		SELECT p.id, p.email, e.confirmed_email
		FROM play_players p LEFT JOIN play_player_email e ON e.player_id = p.id
		WHERE p.id = ${p.p}::uuid LIMIT 1
	`.catch(() => []);
	const r = rows[0];
	if (!r) return null;
	const owner = !!r.email && r.confirmed_email === r.email && emailTag(r.email) === p.e;
	await sql`
		INSERT INTO play_email_stops (email_tag, player_id, by_owner) VALUES (${p.e}, ${r.id}, ${owner})
		ON CONFLICT (email_tag) DO UPDATE
			SET player_id = CASE WHEN EXCLUDED.by_owner THEN EXCLUDED.player_id ELSE play_email_stops.player_id END,
			    by_owner = play_email_stops.by_owner OR EXCLUDED.by_owner
	`;
	await sql`
		INSERT INTO play_player_email (player_id, unsubscribed_at) VALUES (${r.id}, now())
		ON CONFLICT (player_id) DO UPDATE SET unsubscribed_at = COALESCE(play_player_email.unsubscribed_at, now()), updated_at = now()
	`;
	// A claim for the stopped address is withdrawn.
	const claims = await sql`SELECT email FROM play_email_claims WHERE player_id = ${r.id}`;
	if (claims[0] && emailTag(claims[0].email) === p.e) await sql`DELETE FROM play_email_claims WHERE player_id = ${r.id}`;
	if (forget && owner) {
		await sql`
			UPDATE play_players SET email = NULL, email_consent = false, email_consent_at = NULL, unlock_token = NULL
			WHERE id = ${r.id}
		`;
		await sql`UPDATE play_player_email SET confirmed_email = NULL, confirmed_at = NULL, updated_at = now() WHERE player_id = ${r.id}`;
	}
	return { done: true, forgot: !!forget && owner };
}

// Admin only (the route checks the admin session): mark or unmark a founding member by their
// confirmed address. Returns false when no player has that address confirmed.
export async function setFoundingMember(email, on) {
	const sql = getSql();
	const rows = await sql`SELECT id FROM play_players WHERE email = ${email} LIMIT 1`;
	const id = rows[0]?.id;
	if (!id) return false;
	await sql`
		INSERT INTO play_player_email (player_id, founding_member, founding_member_at)
		VALUES (${id}, ${!!on}, ${on ? new Date() : null})
		ON CONFLICT (player_id) DO UPDATE
			SET founding_member = EXCLUDED.founding_member, founding_member_at = EXCLUDED.founding_member_at, updated_at = now()
	`;
	return true;
}
