// The "What you now know" card: what it shows, and the id that carries it in a URL.
// Pure and the same on server and client. Everything shown comes from the pack's story; the id
// holds only ids, so nothing a visitor types into a URL can put words on a card.
//
// Until the Phase 3 database exists the id is the payload itself, base64url JSON:
//   { s: slug, v: pack version, l: lens, c: { choiceBeatId: optionId }, y: voteOptionId }

import { textFor } from "@/lib/play/story/engine";

const MAX_ID = 2000;
const SLUG = /^[a-z0-9_][a-z0-9_-]{0,79}$/;
const TOKEN = /^[A-Za-z0-9_.:-]{1,64}$/;

function toBase64Url(text) {
	const bytes = new TextEncoder().encode(text);
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(id) {
	const b64 = id.replace(/-/g, "+").replace(/_/g, "/");
	const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function encodeCard({ slug, version, lens, choices, vote }) {
	const c = {};
	for (const key of Object.keys(choices || {}).sort()) c[key] = choices[key];
	const payload = { s: slug, v: version, l: lens, c };
	if (vote) payload.y = vote;
	return toBase64Url(JSON.stringify(payload));
}

// Reads an id back into its payload. Null for anything that is not exactly the shape above.
export function decodeCard(id) {
	try {
		if (typeof id !== "string" || id.length === 0 || id.length > MAX_ID || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
		const p = JSON.parse(fromBase64Url(id));
		if (!p || typeof p !== "object" || Array.isArray(p)) return null;
		for (const key of Object.keys(p)) if (!["s", "v", "l", "c", "y"].includes(key)) return null;
		if (typeof p.s !== "string" || !SLUG.test(p.s)) return null;
		if (!Number.isInteger(p.v) || p.v < 1 || p.v > 9999) return null;
		if (typeof p.l !== "string" || !TOKEN.test(p.l)) return null;
		if (!p.c || typeof p.c !== "object" || Array.isArray(p.c)) return null;
		const entries = Object.entries(p.c);
		if (entries.length > 40) return null;
		for (const [k, v] of entries) if (!TOKEN.test(k) || typeof v !== "string" || !TOKEN.test(v)) return null;
		if (p.y != null && (typeof p.y !== "string" || !TOKEN.test(p.y))) return null;
		return { s: p.s, v: p.v, l: p.l, c: { ...p.c }, y: p.y ?? null };
	} catch {
		return null;
	}
}

function topBeats(story) {
	const out = [];
	for (const ch of story?.chapters || []) for (const b of ch.beats || []) out.push(b);
	for (const b of story?.ending?.beats || []) out.push(b);
	return out;
}

// What a card shows, from the pack's story and the player's ids.
// strict: an id the story does not have makes the card unreadable (null). Otherwise it is left out.
export function cardView(site, { lens, choices, vote }, { strict = false } = {}) {
	const story = site?.story;
	const ending = story?.ending;
	if (!story || !ending || !Array.isArray(ending.know) || ending.know.length === 0) return null;
	const fallback = story.default_lens || "traveller";
	const lensIds = (story.lenses || []).map((l) => l.id);
	let tell = lens || fallback;
	if (lensIds.length && !lensIds.includes(tell)) {
		if (strict) return null;
		tell = fallback;
	}
	const say = (value) => textFor(value, tell, fallback);
	const beats = topBeats(story);

	const picked = [];
	const left = new Set(Object.keys(choices || {}));
	for (const b of beats) {
		if (b.type !== "choice" || !left.has(b.id)) continue;
		left.delete(b.id);
		const option = (b.options || []).find((o) => o.id === choices[b.id]);
		if (!option) {
			if (strict) return null;
			continue;
		}
		picked.push({ id: b.id, question: say(b.text), record: say(option.record) || say(option.text) });
	}
	if (strict && left.size) return null;

	let voted = null;
	if (vote) {
		for (const b of beats) {
			const option = b.type === "vote" ? (b.options || []).find((o) => o.id === vote) : null;
			if (option) {
				voted = { id: b.id, question: say(b.text), pick: say(option.text) };
				break;
			}
		}
		if (!voted && strict) return null;
	}

	return {
		slug: site.site?.slug || null,
		siteName: site.site?.name || "",
		place: site.site?.place || "",
		title: story.title || "",
		lens: tell,
		shareLine: say(ending.share_line),
		know: ending.know.map((k) => say(k.text)).filter(Boolean),
		unknown: (ending.unknown || []).map((k) => say(k.text)).filter(Boolean),
		choices: picked,
		vote: voted,
	};
}
