// Site pack access: where a pack lives, how its files are named, and how site.json is fetched.
// Layout is defined by tools/play/export_pack.py (cmd_assemble).

export function packBase(slug, version) {
	return `/play/packs/${slug}/v${version}`;
}

export function packUrls(slug, version) {
	const base = packBase(slug, version);
	return {
		base,
		site: `${base}/site.json`,
		face: (node, state, size, face) => `${base}/pano/${node}/${state}/${size}/${face}.webp`,
		mask: (node, restoration) => `${base}/mask/${node}/${restoration}.webp`,
		tier: (node) => `${base}/tier/${node}.webp`,
		file: (path) => `${base}/${String(path).replace(/^\/+/, "")}`,
		audio: (voice, clip) => `${base}/audio/${voice}/${clip}.m4a`,
		audioManifest: (voice) => `${base}/audio/${voice}/manifest.json`,
		voices: `${base}/audio/voices.json`,
	};
}

const cache = new Map();

// Fetches and lightly checks site.json. Cached per URL for the life of the page.
export function loadSite(slug, version) {
	const url = packUrls(slug, version).site;
	if (!cache.has(url)) {
		// The pack is republished in place, so always ask the server whether this copy is current.
		const p = fetch(url, { cache: "no-cache" })
			.then((r) => {
				if (!r.ok) throw new Error(`Pack not found (${r.status})`);
				return r.json();
			})
			.then((json) => {
				if (!json || json.mode !== "pano" || !json.site || !Array.isArray(json.nodes) || json.nodes.length === 0) {
					throw new Error("This pack is in a format the player cannot read.");
				}
				return json;
			});
		p.catch(() => cache.delete(url));
		cache.set(url, p);
	}
	return cache.get(url);
}

export function nodeById(site, id) {
	return site.nodes.find((n) => n.id === id) || null;
}

// Direction in site axes from a node to a world point. Null when they coincide.
export function directionFrom(node, target) {
	if (!node?.loc || !target) return null;
	const d = [target[0] - node.loc[0], target[1] - node.loc[1], target[2] - node.loc[2]];
	const len = Math.hypot(d[0], d[1], d[2]);
	if (len < 1e-6) return null;
	return [d[0] / len, d[1] / len, d[2] / len];
}
