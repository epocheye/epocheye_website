#!/usr/bin/env node
// Guards the rules in docs/seo/monument-content-spec.md for every monument page
// (lib/monuments/*.js) and WHAT'S GONE episode (lib/whats-gone/index.js).
// Runs as part of `npm run lint`. Exits 1 on any error.
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// lib/monuments/live.js mirrors docs/canonical_public_claims.md ("Where it works").
const { LIVE_MONUMENTS } = await import(pathToFileURL(path.join(root, "lib", "monuments", "live.js")).href);
const CANONICAL_LIVE = new Set(LIVE_MONUMENTS.map((m) => m.slug));

const TIERS = new Set(["confirmed", "source", "estimate", "disputed", "unrecorded"]);

// No price, currency, counts, ratings or parent-company framing on these pages.
const BANNED = [
	[/₹|\$|£|€/, "currency symbol"],
	[/\b(rupees?|dollars?|pounds sterling|INR|USD)\b/i, "currency word"],
	[/\bprice[sd]?\b|\bpricing\b/i, "price"],
	[/\bfree\b(?!-)/i, '"free"'],
	[/\bsubscri(be|ption)\b/i, "subscription"],
	[/\b\d[\d,.]*\s*\+?\s*(users|downloads|visitors|signups|sign-ups|reviews|explorers|testers)\b/i, "count claim"],
	[/\b(rating|rated|stars?)\b\s*\d|\d(\.\d)?\s*(★|stars?)/i, "rating"],
	[/\b(parent company|subsidiary of|a unit of)\b/i, "parent-company framing"],
	[/\bKonark\b|\bUdayagiri\b/i, "non-live monument"],
];

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

function checkSources(where, sources) {
	if (!sources || typeof sources !== "object") return err(where, "missing sources");
	for (const [id, s] of Object.entries(sources)) {
		if (!s.name) err(`${where} source "${id}"`, "missing name");
		if (!s.url && !s.onSite && !s.internal) err(`${where} source "${id}"`, "needs url, onSite or internal");
		if (s.url && !/^https:\/\/[^\s]+$/.test(s.url)) err(`${where} source "${id}"`, `url must be https: ${s.url}`);
		if (s.url && /google\.[a-z.]+\/url\?/.test(s.url)) err(`${where} source "${id}"`, "Google redirect link");
	}
}

function checkParagraph(where, p, sources, { citeRequired = true } = {}) {
	if (!p || typeof p.text !== "string" || !p.text.trim()) return err(where, "empty text");
	if (!TIERS.has(p.tier)) err(where, `tier must be one of ${[...TIERS].join("/")}, got ${p.tier}`);
	if (!Array.isArray(p.cite) || (citeRequired && p.cite.length === 0)) err(where, "no cite: every claim needs a source");
	for (const id of p.cite ?? []) if (!sources?.[id]) err(where, `cites unknown source "${id}"`);
}

function checkBanned(where, value, key = "") {
	if (typeof value === "string") {
		if (key === "url") return;
		for (const [re, label] of BANNED) if (re.test(value)) err(where, `${label} in "${value.slice(0, 90)}…"`);
	} else if (Array.isArray(value)) {
		value.forEach((v, i) => checkBanned(`${where}[${i}]`, v));
	} else if (value && typeof value === "object") {
		for (const [k, v] of Object.entries(value)) checkBanned(`${where}.${k}`, v, k);
	}
}

function checkBody(where, doc) {
	checkSources(where, doc.sources);
	if (!doc.answer?.length) err(where, "missing opening answer");
	doc.answer?.forEach((p, i) => checkParagraph(`${where} answer[${i}]`, p, doc.sources));
	doc.sections?.forEach((s) => {
		if (!s.id || !s.heading) err(`${where} section`, "needs id and heading");
		s.paragraphs?.forEach((p, i) => checkParagraph(`${where} ${s.id}[${i}]`, p, doc.sources));
	});
	if (!doc.seo?.title || !doc.seo?.description) err(where, "missing seo.title or seo.description");
	if (doc.seo?.title?.length > 65) warnings.push(`${where}: seo.title is ${doc.seo.title.length} chars (aim ≤ 60)`);
	if (doc.seo?.description?.length > 160) err(where, `seo.description is ${doc.seo.description.length} chars (max 160)`);
	checkBanned(where, { ...doc, sources: undefined });
	for (const [id, s] of Object.entries(doc.sources ?? {})) checkBanned(`${where} source "${id}"`, s);

	const used = new Set();
	const visit = (p) => p?.cite?.forEach((id) => used.add(id));
	doc.answer?.forEach(visit);
	doc.sections?.forEach((s) => s.paragraphs?.forEach(visit));
	doc.unknowns?.forEach(visit);
	visit(doc.experience);
	doc.faq?.forEach((f) => visit(f.a));
	for (const id of Object.keys(doc.sources ?? {})) if (!used.has(id)) warnings.push(`${where}: source "${id}" is never cited`);
}

async function load(file) {
	return (await import(pathToFileURL(file).href)).default;
}

const monumentDir = path.join(root, "lib", "monuments");
const monumentFiles = readdirSync(monumentDir).filter((f) => f.endsWith(".js") && !["index.js", "live.js"].includes(f));
const slugs = new Set();

for (const f of monumentFiles) {
	const m = await load(path.join(monumentDir, f));
	const where = `lib/monuments/${f}`;
	if (!m) {
		err(where, "no default export");
		continue;
	}
	slugs.add(m.slug);
	if (`${m.slug}.js` !== f) err(where, `slug "${m.slug}" does not match file name`);
	if (m.live && !CANONICAL_LIVE.has(m.slug)) err(where, "marked live but not in the canonical live list");
	if (!CANONICAL_LIVE.has(m.slug)) err(where, "monument pages are only for canonical live monuments");
	const listed = LIVE_MONUMENTS.find((l) => l.slug === m.slug);
	if (listed && (listed.name !== m.name || listed.city !== m.city)) err(where, "name/city differ from lib/monuments/live.js");
	if (typeof m.geo?.lat !== "number" || typeof m.geo?.lng !== "number") err(where, "geo.lat/geo.lng must be numbers");
	if (!m.city || !m.region || !m.country) err(where, "city, region and country are required");
	if (!m.unknowns?.length) err(where, "every page names at least one thing no source records");
	m.unknowns?.forEach((u, i) =>
		checkParagraph(`${where} unknowns[${i}]`, { tier: "unrecorded", ...u }, m.sources),
	);
	m.faq?.forEach((f, i) => {
		if (!f.q?.trim()) err(`${where} faq[${i}]`, "empty question");
		checkParagraph(`${where} faq[${i}]`, f.a, m.sources);
	});
	if (m.experience && !m.experience.summary) err(where, "experience.summary is empty");
	checkBody(where, m);
}

for (const l of LIVE_MONUMENTS) if (!slugs.has(l.slug)) err("lib/monuments/live.js", `no page file for "${l.slug}"`);

const { EPISODES = [], EPISODE_SECTION_IDS = [] } = await import(
	pathToFileURL(path.join(root, "lib", "whats-gone", "index.js")).href
);
for (const e of EPISODES) {
	const where = `lib/whats-gone (${e.slug ?? "?"})`;
	if (!slugs.has(e.monument)) err(where, `monument "${e.monument}" has no page`);
	const ids = (e.sections ?? []).map((s) => s.id).join(",");
	if (ids !== EPISODE_SECTION_IDS.join(",")) err(where, `sections must be ${EPISODE_SECTION_IDS.join(", ")} in order`);
	if (!e.published || !e.updated || !e.episode || !e.title) err(where, "needs episode, title, published, updated");
	checkBody(where, e);
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`error ${e}`);
console.log(
	`check-monument-claims: ${monumentFiles.length} monument page(s), ${EPISODES.length} episode(s), ${errors.length} error(s), ${warnings.length} warning(s)`,
);
process.exit(errors.length ? 1 : 0);
