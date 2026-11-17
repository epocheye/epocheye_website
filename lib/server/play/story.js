import "server-only";

// A site's story, read on the server from its published pack, and an index of the ids a client
// may send back: chapters, choice options (and which are accepted), vote options, lenses.
// The slug only picks an entry of the site registry; the path read comes from the registry.

import { loadSiteOnServer } from "@/lib/play/pack.server";
import { earlySite, getPlayableSite } from "@/lib/play/sites";

const TTL_MS = 60 * 1000; // packs are republished in place: look again every minute
const cache = new Map();

function topBeats(story) {
	const out = [];
	for (const ch of story?.chapters || []) for (const b of ch.beats || []) out.push(b);
	for (const b of story?.ending?.beats || []) out.push(b);
	return out;
}

export function indexStory(story) {
	const chapters = (story?.chapters || []).filter((c) => typeof c.id === "string");
	const choices = new Map();
	const votes = new Map();
	for (const b of topBeats(story)) {
		if (b.type === "choice" && b.id) choices.set(b.id, new Map((b.options || []).map((o) => [o.id, !!o.accepted])));
		if (b.type === "vote" && b.id) votes.set(b.id, (b.options || []).map((o) => o.id));
	}
	// Choice beats of the chapters that count, which a finished run must have a first pick for.
	const requiredChoices = [];
	for (const c of chapters) {
		if (c.preview) continue;
		for (const b of c.beats || []) if (b.type === "choice" && b.id) requiredChoices.push(b.id);
	}
	if (story?.ending?.beats?.length && chapters.length && !chapters[chapters.length - 1].preview) {
		for (const b of story.ending.beats) if (b.type === "choice" && b.id) requiredChoices.push(b.id);
	}
	// A floor for a run's time: a person needs at least this long for every beat of the chapters
	// that count, even tapping straight through. A faster run is recorded but not ranked.
	let beats = 0;
	for (const c of chapters) if (!c.preview) beats += (c.beats || []).length;
	return {
		chapterIds: new Set(chapters.map((c) => c.id)),
		requiredChoices,
		minSeconds: beats * 2,
		required: chapters.filter((c) => !c.preview).map((c) => c.id),
		choices,
		votes,
		lenses: new Set((story?.lenses || []).map((l) => l.id)),
	};
}

// { entry, site, index } for a playable site, or null. Never throws. With early: true it also
// serves a site that opens within a week; the caller must have checked the player may play it early.
export async function storyFor(slug, { early = false } = {}) {
	const entry = getPlayableSite(slug) || (early ? earlySite(slug) : null);
	if (!entry) return null;
	const key = `${entry.slug}@${entry.version}`;
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
	try {
		const site = await loadSiteOnServer(entry.slug, entry.version);
		const value = site?.story ? { entry, site, index: indexStory(site.story) } : null;
		if (value) cache.set(key, { at: Date.now(), value });
		return value;
	} catch {
		return null;
	}
}

// The vote beat whose options include this id, or null.
export function voteBeatFor(index, optionId) {
	for (const [beatId, options] of index.votes) if (options.includes(optionId)) return { beatId, options };
	return null;
}
