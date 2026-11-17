import "server-only";

// Short ids for "What you now know" cards: /play/c/<id>. The payload is ids only, the same shape
// the long base64 ids carry ({ s, v, l, c, y }, lib/play/card.js). The same card always gets the
// same short id. Callers check the payload against the pack's story before creating a card.

import { createHash, randomBytes } from "node:crypto";
import { getSql } from "@/lib/server/neon";
import { decodeCard, encodeCard, isShortCardId } from "@/lib/play/card";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"; // no 0/O, 1/l/I
const LENGTH = 9;

function newId() {
	const bytes = randomBytes(LENGTH);
	let id = "";
	for (const b of bytes) id += ALPHABET[b % ALPHABET.length];
	return id;
}

// The canonical payload: the same card always serialises the same way.
function canonical({ slug, version, lens, choices, vote }) {
	const c = {};
	for (const key of Object.keys(choices || {}).sort()) c[key] = choices[key];
	const payload = { s: slug, v: version, l: lens, c };
	if (vote) payload.y = vote;
	return payload;
}

export async function createCard({ slug, version, lens, choices, vote }) {
	const payload = canonical({ slug, version, lens, choices, vote });
	const json = JSON.stringify(payload);
	const hash = createHash("sha256").update(json).digest("hex");
	const sql = getSql();
	for (let attempt = 0; attempt < 4; attempt++) {
		const id = newId();
		const made = await sql`
			INSERT INTO play_cards (id, site, pack_version, payload, payload_hash)
			VALUES (${id}, ${slug}, ${version}, ${json}::jsonb, ${hash})
			ON CONFLICT DO NOTHING
			RETURNING id
		`;
		if (made[0]) return made[0].id;
		const same = await sql`SELECT id FROM play_cards WHERE payload_hash = ${hash} LIMIT 1`;
		if (same[0]) return same[0].id;
		// Otherwise the random id was taken: try another.
	}
	throw new Error("could not allocate a card id");
}

// The stored payload for a short id, checked again through the card decoder, or null.
export async function getCardPayload(id) {
	if (!isShortCardId(id)) return null;
	const sql = getSql();
	const rows = await sql`SELECT payload FROM play_cards WHERE id = ${id} LIMIT 1`;
	const p = rows[0]?.payload;
	if (!p) return null;
	return decodeCard(encodeCard({ slug: p.s, version: p.v, lens: p.l, choices: p.c, vote: p.y }));
}
