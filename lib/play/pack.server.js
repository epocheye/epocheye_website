// Server-side access to a pack's site.json, for pages rendered on the server (the shared card
// and its share image). Import this from server files only.
//
// 1. Read the file from disk. Locally that is public/. On Vercel a function only has the files
//    traced into it, so next.config.mjs lists every pack's site.json for the card routes
//    (outputFileTracingIncludes). site.json is small; the panoramas are never traced.
// 2. If the file is not there, ask this deployment for it over HTTP. The address comes from the
//    environment, never from the request, so a forged Host header cannot point it elsewhere.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { packUrls } from "@/lib/play/pack";
import { compileStory } from "@/lib/play/story/engine";

function usable(json) {
	return json && json.mode === "pano" && json.site && Array.isArray(json.nodes) && json.story ? json : null;
}

async function fromDisk(slug, version) {
	try {
		const file = join(/* turbopackIgnore: true */ process.cwd(), "public", "play", "packs", slug, `v${version}`, "site.json");
		return usable(JSON.parse(await readFile(file, "utf8")));
	} catch {
		return null;
	}
}

async function overHttp(slug, version) {
	const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://127.0.0.1:${process.env.PORT || 3000}`;
	const headers = {};
	// A protected preview deployment only answers its own functions when they carry this.
	if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
	try {
		const r = await fetch(`${origin}${packUrls(slug, version).site}`, { cache: "no-store", headers, signal: AbortSignal.timeout(6000) });
		if (!r.ok) return null;
		return usable(await r.json());
	} catch {
		return null;
	}
}

// slug and version must come from the site registry (lib/play/sites.js), never from a URL.
export async function loadSiteOnServer(slug, version) {
	return (await fromDisk(slug, version)) || (await overHttp(slug, version));
}

// The six smallest faces a new player sees first: the viewpoint and state the level opens on,
// chosen the way the level chooses them (components/play/Level.jsx startView, engine/panoCore.js
// setNode) for a player with no save, at chapter n of a ?ch=<n> link or else the first chapter.
export function firstFaces(pack, slug, version, chapterNumber = null) {
	const chapters = compileStory(pack.story);
	let chapter = chapters[0];
	if (chapterNumber != null) chapter = chapters.find((c) => c.n === chapterNumber) || chapters[chapterNumber] || chapter;
	const byId = (id) => (id ? pack.nodes.find((n) => n.id === id) : null);
	const node = byId(chapter?.start_node) || byId(pack.site.start_node) || pack.nodes[0];
	if (!node || !Array.isArray(pack.site.faces)) return [];
	const states = node.states?.length ? node.states : ["now"];
	const want = chapter?.state || "now";
	const state = states.includes(want) ? want : states[0];
	const size = Math.min(...(pack.site.sizes?.length ? pack.site.sizes : [512]));
	const face = packUrls(slug, version).face;
	return pack.site.faces.map((f) => face(node.id, state, size, f));
}

// The copy of site.json handed to the page: without fields kept for the team only
// (a fact's source_internal), which the player never sees.
export function forClient(pack) {
	if (!pack?.story?.facts) return pack;
	const facts = pack.story.facts.map((f) => {
		if (!f || typeof f !== "object" || !("source_internal" in f)) return f;
		const { source_internal: _internal, ...rest } = f;
		return rest;
	});
	return { ...pack, story: { ...pack.story, facts } };
}
