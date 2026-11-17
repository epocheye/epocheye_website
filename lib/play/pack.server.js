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
