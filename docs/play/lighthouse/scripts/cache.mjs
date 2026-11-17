// Cache-Control on every file under public/play/packs, as the server sends it (brief 5.7: pack
// files on versioned paths; no immutable header on anything unversioned). HEAD requests.
//
//   node docs/play/lighthouse/scripts/cache.mjs
//
// Rule checked: immutable only for /play/packs/<slug>/v<N>/(pano|mask|tier)/...; every other path
// under /play/packs (other files in a version, unversioned paths, missing files) is not immutable.

import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { BASE } from "./common.mjs";

const root = join("public", "play", "packs");
const files = [];
const walk = (d) => {
	for (const f of readdirSync(d)) {
		const p = join(d, f);
		if (statSync(p).isDirectory()) walk(p);
		else files.push("/" + relative("public", p).split(sep).join("/"));
	}
};
walk(root);
// Paths with no version, real or not, and a missing file in a version.
const extra = [
	"/play/packs/tipu-summer-palace-bengaluru/site.json",
	"/play/packs/tipu-summer-palace-bengaluru/pano/forecourt/now/512/px.webp",
	"/play/packs/tipu-summer-palace-bengaluru/latest/pano/forecourt/now/512/px.webp",
	"/play/packs/tipu-summer-palace-bengaluru/cover.webp",
	"/play/packs/tipu-summer-palace-bengaluru/v1/pano/forecourt/now/512/missing.webp",
];
const VERSIONED_BIG = /^\/play\/packs\/[^/]+\/v\d+\/(pano|mask|tier)\//;
const tally = {};
let bad = 0;
for (const path of [...files, ...extra]) {
	const r = await fetch(BASE + encodeURI(path), { method: "HEAD" });
	const cc = r.headers.get("cache-control") || "";
	const immutable = /immutable/.test(cc);
	const should = VERSIONED_BIG.test(path) && r.ok;
	const kind = `${VERSIONED_BIG.test(path) ? path.match(VERSIONED_BIG)[1] : (path.match(/\/v\d+\/([^/]+)/)?.[1] || "unversioned")} ${r.status} ${cc}`;
	tally[kind] = (tally[kind] || 0) + 1;
	if (immutable !== should) {
		bad++;
		console.log(`WRONG ${r.status} ${path}  ${cc}`);
	}
}
for (const [k, n] of Object.entries(tally).sort()) console.log(String(n).padStart(5), k);
console.log(`${files.length + extra.length} paths checked, ${bad} wrong`);
