// The daily Missing Piece generator (brief 1.4). No writing: every clue, option and explanation is
// text that already exists in a pack's site.json (its story, evidence and restorations).
//
//   node tools/play/daily/generate.mjs                 every live site in lib/play/sites.js
//   node tools/play/daily/generate.mjs --site <path>   one site.json (for example a staged pack)
//   options: --start YYYY-MM-DD (first date it may add; default today, India time)
//            --min-gap N (default 30, the brief's rule; a smaller gap is the owner's call only)
//            --dry (report only, write nothing)        --out <dir> (default content/play/daily)
//            --pack <dir> (where the pack's images are, when --site points at a copy of site.json)
//
// Reads the pack (site.json and the image files it names) and never writes to it. Writes
// content/play/daily/<slug>.json and content/play/daily/index.js, which the server imports.
//
// A puzzle is one lost element (a restoration, or an evidence item found in a chapter), three
// clues linked to it, then up to two questions:
//   where    restoration: which viewpoint sees it (its own mask decides, from the 512 px NOW faces);
//            evidence item, or a restoration every viewpoint sees: which chapter it belongs to
//   version  the restoration's rendered options (options/<id>/a|b|c.webp) when the pack has them
//            and says which is correct; otherwise the chapter's own choice beat, whose options and
//            accepted flags are already written and verified; otherwise no second question
// Wrong options are only: viewpoints whose mask is empty, other chapters of the story, and the
// rejected options the story or the pack already wrote. Nothing is invented.
//
// Calendar (brief 1.4: an element never repeats inside 30 days): a date gets the least recently
// used element that is at least --min-gap days clear (30 by default), with a puzzle never used
// before. The calendar stops at the first date with no element free: it never cycles and never
// has a hole, and the game shows no puzzle on a date past its end. Dates up to and including
// today (India time) are kept exactly as they are in the existing file, with their puzzles, and a
// date another site's file already has is skipped, so regenerating or adding a site never changes
// a puzzle someone has played. The report prints how far the calendar runs and, when the pack is
// too small for the rule, says so for the owner.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { SITES } from "../../../lib/play/sites.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const { gameDay, addDays, lastPuzzleDay } = await import("../../../lib/play/daily.js");
const SPREAD = 30; // the brief's rule: the same element never inside 30 days
const FORWARD = /\b(you will|you'll|keep (that|this) in mind|remember (that|this)|later on|next chapter)\b/i;

// ---------------------------------------------------------------- args

function args(argv) {
	const out = { sites: [], pack: null, start: gameDay(), minGap: SPREAD, dry: false, out: join(ROOT, "content", "play", "daily") };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--site") out.sites.push(resolve(argv[++i]));
		else if (a === "--start") out.start = argv[++i];
		else if (a === "--min-gap") out.minGap = Number(argv[++i]);
		else if (a === "--pack") out.pack = resolve(argv[++i]);
		else if (a === "--dry") out.dry = true;
		else if (a === "--out") out.out = resolve(argv[++i]);
		else throw new Error(`unknown argument ${a}`);
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(out.start)) throw new Error("--start must be YYYY-MM-DD");
	if (!Number.isInteger(out.minGap) || out.minGap < 1) throw new Error("--min-gap must be a whole number of days, 1 or more");
	if (!out.sites.length) {
		for (const s of SITES) if (s.status === "live" && s.version) out.sites.push(join(ROOT, "public", "play", "packs", s.slug, `v${s.version}`, "site.json"));
	}
	return out;
}

// ---------------------------------------------------------------- small helpers

function hash(text) {
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
	return h >>> 0;
}

// Same input, same order, on every machine.
function shuffled(list, seed) {
	const out = [...list];
	let s = hash(seed) || 1;
	for (let i = out.length - 1; i > 0; i--) {
		s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0;
		s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0;
		const j = s % (i + 1);
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

// Copy rules (brief 5.6): no em or en dash, no unresolved placeholder.
function clean(text) {
	return typeof text === "string" && text.trim().length > 0 && !/[\u2013\u2014]/.test(text) && !/\[SAMBIT/i.test(text);
}

// A clue is read in a few seconds on a phone. Longer facts stay in the story, not in the daily.
const MAX_CLUE = 260;
const short = (text) => clean(text) && text.trim().length <= MAX_CLUE;

const FACE_ORDER_FALLBACK = ["px", "nx", "py", "ny", "pz", "nz"];

// ---------------------------------------------------------------- one site

async function buildSite(sitePath, opts) {
	const raw = readFileSync(sitePath, "utf8");
	const site = JSON.parse(raw);
	const packDir = opts.pack || dirname(sitePath);
	const { slug, name, place, version } = site.site;
	const base = `/play/packs/${slug}/v${version}`;
	const story = site.story;
	if (!story) throw new Error(`${slug}: site.json has no story`);
	const lens = story.default_lens || "traveller";
	const textOf = (t) => (typeof t === "string" ? t : t ? (t[lens] ?? t.traveller ?? Object.values(t)[0]) : null);
	const faces = site.site.faces || FACE_ORDER_FALLBACK;
	const onDisk = (p) => existsSync(join(packDir, ...p.split("/")));
	const notes = [];

	const facts = new Map((story.facts || []).map((f) => [f.id, f]));
	const witnesses = new Map((story.witnesses || []).map((w) => [w.id, w]));
	const evidence = new Map((story.evidence || []).map((e) => [e.id, e]));
	// Chapters a piece can belong to (1 and up), and every chapter of the story a wrong option may
	// name (the prologue too). Preview chapters are not part of the story order.
	const storyChapters = (story.chapters || []).filter((c) => !c.preview && Number.isInteger(c.n) && c.n >= 0);
	const chapters = storyChapters.filter((c) => c.n >= 1);
	const chapterById = new Map(chapters.map((c) => [c.id, c]));

	// Every beat of a chapter, with the lines shown after each choice option.
	const beatsOf = (c) => {
		const out = [];
		for (const b of c.beats || []) {
			out.push(b);
			for (const o of b.options || []) for (const a of o.after || []) out.push({ ...a, type: a.type || "line" });
		}
		return out;
	};

	// ---- clues

	const factClue = (id) => {
		const f = facts.get(id);
		if (!f) return null;
		if (f.status !== "verified" || f.tier === "unknown" || !short(f.claim) || !clean(f.source)) return null;
		return { key: `fact:${id}`, kind: "fact", text: f.claim.trim(), source: f.source, tier: f.tier, facts: [id] };
	};
	const tierOfFacts = (ids) => ids.map((id) => facts.get(id)?.tier).find(Boolean) || null;
	const sourceOfFacts = (ids) => ids.map((id) => facts.get(id)?.source).filter(clean).join("; ") || null;
	// A caption that talks about the card's own picture ("no picture here", "the same photograph")
	// makes no sense as a clue on its own, so it is left out.
	const captionUsable = (text) => short(text) && !/\b(picture|pictures|photograph|shown|show|shows)\b/i.test(text);
	const evidenceClues = (e) => {
		const ids = (e.facts || []).filter((id) => facts.has(id));
		const tier = tierOfFacts(ids);
		const source = clean(e.credit) ? e.credit : sourceOfFacts(ids);
		const witness = e.witness ? witnesses.get(e.witness)?.name || null : null;
		const out = [];
		if (short(e.quote) && source && tier) out.push({ key: `quote:${e.id}`, kind: "quote", text: e.quote.trim(), source, tier, witness, facts: ids });
		if (captionUsable(e.caption) && source && tier) out.push({ key: `caption:${e.id}`, kind: "caption", text: e.caption.trim(), source, tier, witness: null, facts: ids });
		return out;
	};
	// Facts a chapter's beats cite, in order. Hooks point at the next chapter, so they are left out.
	const chapterFactIds = (c) => {
		const ids = [];
		for (const b of beatsOf(c)) {
			if (b.type === "hook" || b.type === "lens") continue;
			for (const id of b.facts || []) if (!ids.includes(id)) ids.push(id);
		}
		return ids;
	};
	const dedupe = (list, taken = new Set()) => {
		const out = [];
		for (const c of list) {
			if (!c || taken.has(c.key) || taken.has(`text:${c.text}`)) continue;
			taken.add(c.key);
			taken.add(`text:${c.text}`);
			out.push(c);
		}
		return out;
	};

	// Disjoint sets of three clues: no clue appears in two puzzles of the same element.
	// direct clues are the element's own; with requireDirect every set carries one.
	// Within a set the chapter clues come first and the element's own clue last.
	function clueSets(direct, chapter, requireDirect) {
		let n = Math.floor((direct.length + chapter.length) / 3);
		if (requireDirect) n = Math.min(n, direct.length);
		if (n <= 0) return [];
		const sets = Array.from({ length: n }, (_, k) => (direct[k] ? [direct[k]] : []));
		const rest = [...direct.slice(n), ...chapter];
		for (const s of sets) while (s.length < 3 && rest.length) s.push(rest.shift());
		const isDirect = new Set(direct.map((c) => c.key));
		return sets
			.filter((s) => s.length === 3)
			.map((s) => [...s.filter((c) => !isDirect.has(c.key)), ...s.filter((c) => isDirect.has(c.key))]);
	}

	// ---- viewpoints

	const faceExists = (node, state, f) => onDisk(`pano/${node}/${state}/512/${f}.webp`);
	const usableNodes = site.nodes.filter((n) => (n.states || []).includes("now") && faces.every((f) => faceExists(n.id, "now", f)));
	const lookFace = (n) => {
		const axes = site.site.face_axes || {};
		let best = faces[0];
		let bestDot = -Infinity;
		for (const f of faces) {
			const v = axes[f]?.f;
			if (!v || !n.look) continue;
			const d = v[0] * n.look[0] + v[1] * n.look[1] + v[2] * n.look[2];
			if (d > bestDot) [best, bestDot] = [f, d];
		}
		return best;
	};
	// A face that looks up or down rather than at the horizon (site.axes says which axis is up).
	const vertical = (f) => {
		const v = site.site.face_axes?.[f]?.f;
		return !!v && Math.abs(v[site.site.axes === "y-up" ? 1 : 2]) > 0.9;
	};
	// The face of a node that shows most of a restoration's mask.
	const maskFaceCache = new Map();
	async function maskFace(nodeId, restorationId) {
		const key = `${nodeId}/${restorationId}`;
		if (maskFaceCache.has(key)) return maskFaceCache.get(key);
		const file = join(packDir, "mask", nodeId, `${restorationId}.webp`);
		let result = null;
		if (existsSync(file)) {
			const img = sharp(file).greyscale();
			const meta = await img.metadata();
			const w = meta.width;
			const h = meta.height;
			const facePx = Math.round(w / faces.length);
			const { data } = await img.raw().toBuffer({ resolveWithObject: true });
			let best = -1;
			let bestSum = 0;
			for (let i = 0; i < faces.length; i++) {
				let sum = 0;
				for (let y = 0; y < h; y += 2) {
					const row = y * w;
					for (let x = i * facePx; x < (i + 1) * facePx; x += 2) sum += data[row + x];
				}
				if (sum > bestSum) [best, bestSum] = [i, sum];
			}
			if (best >= 0) result = { face: faces[best], index: best };
		}
		maskFaceCache.set(key, result);
		return result;
	}

	// ---- the second question

	function choiceQuestion(c) {
		const beat = beatsOf(c).find((b) => b.type === "choice" && Array.isArray(b.options) && b.options.length >= 2);
		if (!beat) return { q: null, why: "the chapter has no choice beat" };
		const prompt = textOf(beat.text);
		// The lines shown after a pick become the explanations. A line with no fact behind it, a hook,
		// or a line that points ahead in the story ("You will need it") is left out: the daily has no
		// "later" for it to point to.
		const explains = (a) => (a.type || "line") !== "hook" && (a.facts || []).length > 0 && !FORWARD.test(textOf(a.text) || "");
		const options = beat.options.map((o) => ({ id: o.id, label: textOf(o.text), accepted: !!o.accepted, after: (o.after || []).filter(explains).map((a) => textOf(a.text)) }));
		const bad = [prompt, ...options.map((o) => o.label), ...options.flatMap((o) => o.after)].filter((t) => !clean(t));
		if (bad.length) return { q: null, why: `choice ${beat.id} has text that breaks the copy rules` };
		if (!options.some((o) => o.accepted) || options.every((o) => o.accepted)) return { q: null, why: `choice ${beat.id} has no wrong option` };
		return {
			q: {
				id: "version",
				kind: "choice",
				prompt,
				hint: null,
				from: beat.id,
				options: options.map((o) => ({ id: o.id, label: o.label })),
				answer: options.filter((o) => o.accepted).map((o) => o.id),
				explain: Object.fromEntries(options.map((o) => [o.id, o.after])),
			},
		};
	}

	// Rendered Match options, only when the pack says which one is correct. Accepted shapes:
	// restoration.options = [{ id, image?, correct|accepted, why? }], or files options/<id>/a|b|c.webp
	// with restoration.correct_option (or correct) naming the right letter.
	function imageQuestion(r) {
		let list = null;
		if (Array.isArray(r.options) && r.options.length >= 2) {
			list = r.options.map((o) => ({ id: String(o.id), image: o.image || o.file || `options/${r.id}/${o.id}.webp`, correct: !!(o.correct ?? o.accepted), why: o.why || null }));
		} else {
			const letters = ["a", "b", "c", "d"].filter((l) => onDisk(`options/${r.id}/${l}.webp`));
			const right = r.correct_option ?? r.correct ?? null;
			if (letters.length >= 2 && typeof right === "string" && letters.includes(right)) {
				list = letters.map((l) => ({ id: l, image: `options/${r.id}/${l}.webp`, correct: l === right, why: r.why?.[l] || null }));
			} else if (letters.length) {
				notes.push(`${r.id}: options/${r.id}/ has ${letters.join(",")} but no correct option is named; not used`);
			}
		}
		if (!list) return null;
		if (!list.every((o) => onDisk(o.image)) || list.filter((o) => o.correct).length !== 1) {
			notes.push(`${r.id}: rendered options incomplete or without exactly one correct; not used`);
			return null;
		}
		if (list.some((o) => o.why && !clean(o.why))) return null;
		return {
			id: "version",
			kind: "image",
			prompt: "Which version is right?",
			hint: null,
			options: list.map((o) => ({ id: o.id, label: `Version ${o.id.toUpperCase()}`, thumb: `${base}/${o.image}` })),
			answer: list.filter((o) => o.correct).map((o) => o.id),
			explain: Object.fromEntries(list.map((o) => [o.id, o.why ? [o.why] : []])),
		};
	}

	// ---- elements

	const elements = [];
	const skipped = [];
	const chapterRef = (c) => ({ id: c.id, n: c.n, title: textOf(c.title), years: textOf(c.years) || null });

	for (const r of site.restorations || []) {
		const c = chapterById.get(r.chapter);
		if (!c) {
			skipped.push(`restoration ${r.id}: chapter "${r.chapter}" is not a playable chapter of this pack's story`);
			continue;
		}
		if (!clean(r.name)) {
			skipped.push(`restoration ${r.id}: name breaks the copy rules`);
			continue;
		}
		// The restoration's own clues: the facts of its chapter that carry its tier (for a
		// reconstruction, the lines that say what we rebuilt and on what evidence). Its evidence list
		// in the pack names sources, it makes no claim, so it is not used as a clue.
		const direct = dedupe(chapterFactIds(c).filter((id) => r.tier && facts.get(id)?.tier === r.tier).map(factClue));
		const evIds = beatsOf(c).filter((b) => b.type === "evidence" && evidence.has(b.evidence)).map((b) => b.evidence);
		const taken = new Set(direct.flatMap((d) => [d.key, `text:${d.text}`]));
		const chapterClues = dedupe([...evIds.flatMap((id) => evidenceClues(evidence.get(id))), ...chapterFactIds(c).map(factClue)], taken);
		const seen = usableNodes.filter((n) => (r.nodes || []).includes(n.id) && (n.masks || []).includes(r.id) && faces.every((f) => faceExists(n.id, "then", f)));
		const unseen = usableNodes.filter((n) => !(r.nodes || []).includes(n.id) && !(n.masks || []).includes(r.id));
		// A chapter that also restores it is a right answer too, so it is never offered as a wrong one.
		const home = storyChapters.filter((x) => beatsOf(x).some((b) => b.type === "restore" && b.restoration === r.id)).map((x) => x.id);
		elements.push({ kind: "restoration", id: r.id, key: `r:${r.id}`, home, name: r.name, chapter: c, restoration: r, sets: clueSets(direct, chapterClues, false), seen, unseen, image: null });
	}

	for (const c of chapters) {
		for (const b of beatsOf(c)) {
			if (b.type !== "evidence") continue;
			const e = evidence.get(b.evidence);
			if (!e) continue;
			if (elements.some((x) => x.kind === "evidence" && x.id === e.id)) continue; // first chapter that shows it
			if (!clean(e.title)) {
				skipped.push(`evidence ${e.id}: title breaks the copy rules`);
				continue;
			}
			const ownFacts = [...new Set([...(e.facts || []), ...(b.facts || [])])];
			const direct = dedupe([...evidenceClues(e), ...ownFacts.map(factClue)]);
			const taken = new Set(direct.flatMap((d) => [d.key, `text:${d.text}`]));
			const chapterClues = dedupe(chapterFactIds(c).map(factClue), taken);
			const image = e.image && onDisk(e.image) ? { src: `${base}/${e.image}`, w: e.image_width || null, h: e.image_height || null, credit: clean(e.credit) ? e.credit : null } : null;
			// Every chapter that shows this evidence is a right place for it, so none is a wrong answer.
			const home = storyChapters.filter((x) => beatsOf(x).some((y) => y.type === "evidence" && y.evidence === e.id)).map((x) => x.id);
			elements.push({ kind: "evidence", id: e.id, key: `e:${e.id}`, home, name: e.title, chapter: c, sets: clueSets(direct, chapterClues, true), image });
		}
	}

	// ---- puzzles

	const puzzles = {};
	for (const el of elements) {
		const c = el.chapter;
		const others = storyChapters.filter((x) => x.id !== c.id && !el.home.includes(x.id));
		const forms = [];
		if (el.kind === "restoration" && el.seen.length && el.unseen.length) forms.push("v");
		else if (el.kind === "restoration") notes.push(`${el.id}: ${el.seen.length ? "every viewpoint in the pack sees it" : "no viewpoint carries its mask"}, so no viewpoint question`);
		if (others.length >= 1) forms.push("c");
		let version = null;
		if (el.kind === "restoration") version = imageQuestion(el.restoration);
		if (!version) {
			const { q, why } = choiceQuestion(c);
			version = q;
			if (!q) notes.push(`${el.key}: no second question (${why})`);
		}
		if (!el.sets.length) {
			skipped.push(`${el.key}: fewer than three usable clues`);
			el.variants = [];
			continue;
		}
		if (!forms.length) {
			skipped.push(`${el.key}: no "where" question is possible`);
			el.variants = [];
			continue;
		}
		// Order: first every clue set once, alternating the question form, then the other forms.
		const pairs = [];
		for (let i = 0; i < forms.length; i++) for (let k = 0; k < el.sets.length; k++) pairs.push({ k, form: forms[(k + i) % forms.length] });
		el.variants = [];
		for (const { k, form } of pairs) {
			const id = `${el.key}.${k}.${form}`;
			const questions = [];
			let reveal = null;
			if (form === "v") {
				const answerNode = el.seen[k % el.seen.length];
				const mf = await maskFace(answerNode.id, el.id);
				if (!mf) continue;
				const wrong = [];
				for (let j = 0; wrong.length < Math.min(2, el.unseen.length); j++) {
					const n = el.unseen[(k * 2 + j) % el.unseen.length];
					if (!wrong.includes(n)) wrong.push(n);
				}
				const opt = (n, f) => ({ id: n.id, label: n.name, thumb: `${base}/pano/${n.id}/now/512/${f}.webp` });
				questions.push({
					id: "where",
					kind: "viewpoint",
					prompt: "Where does it belong?",
					hint: "Pick the viewpoint that sees it.",
					// All thumbs look the same kind of way: when the answer's face looks up or down (a
					// ceiling, a floor), the wrong viewpoints show that same face too, so the direction of
					// the picture gives nothing away; otherwise each shows its own main view.
					options: shuffled([opt(answerNode, mf.face), ...wrong.map((n) => opt(n, vertical(mf.face) ? mf.face : lookFace(n)))], `${slug}/${id}/where`),
					answer: [answerNode.id],
					explain: {},
				});
				reveal = {
					node: answerNode.id,
					name: answerNode.name,
					face: mf.face,
					faceIndex: mf.index,
					faces: faces.length,
					now: `${base}/pano/${answerNode.id}/now/512/${mf.face}.webp`,
					then: `${base}/pano/${answerNode.id}/then/512/${mf.face}.webp`,
					mask: `${base}/mask/${answerNode.id}/${el.id}.webp`,
				};
			} else {
				// Two other chapters, picked per puzzle so the same pair does not come back every day.
				// Numbered chapters first: a piece is never placed in the prologue, so it is the
				// weakest wrong answer and is offered only when the story has too few chapters.
				const pool = [...shuffled(others.filter((x) => x.n >= 1), `${slug}/${id}/decoys`), ...others.filter((x) => x.n < 1)];
				const wrong = pool.slice(0, 2);
				const opt = (x) => ({ id: x.id, label: `${x.n === 0 ? "Prologue" : `Chapter ${x.n}`}: ${textOf(x.title)}`, sub: textOf(x.years) || null });
				questions.push({
					id: "where",
					kind: "chapter",
					prompt: "Where does it belong?",
					hint: "Pick the chapter of the story it belongs to.",
					options: shuffled([opt(c), ...wrong.map(opt)], `${slug}/${id}/where`),
					answer: [c.id],
					explain: {},
				});
			}
			if (version) questions.push({ ...version, options: shuffled(version.options, `${slug}/${id}/version`) });
			const labels = questions.flatMap((q) => [q.prompt, q.hint, ...q.options.flatMap((o) => [o.label, o.sub])]).filter(Boolean);
			if (!labels.every(clean)) {
				skipped.push(`${id}: an option breaks the copy rules`);
				continue;
			}
			puzzles[id] = {
				id,
				element: { key: el.key, kind: el.kind, id: el.id, name: el.name, image: el.image },
				chapter: chapterRef(c),
				clues: el.sets[k].map(({ kind, text, source, tier, witness, facts: f }) => ({ kind, text, source, tier, witness, facts: f })),
				questions,
				reveal,
			};
			el.variants.push(id);
		}
	}

	const live = elements.filter((e) => e.variants.length);
	// Chapters take turns in the element order, so two days in a row rarely share a chapter.
	const queues = new Map();
	for (const e of live) {
		if (!queues.has(e.chapter.id)) queues.set(e.chapter.id, []);
		queues.get(e.chapter.id).push(e);
	}
	const order = [];
	while ([...queues.values()].some((q) => q.length)) for (const q of queues.values()) if (q.length) order.push(q.shift());

	const E = order.length;
	// What each spacing would give, counted from an empty calendar: how many days in a row before
	// no element is free. For the owner's report only.
	const table = [];
	for (let g = SPREAD; g >= 1; g--) table.push({ min_gap: g, days: calendarRun(order, g, new Map(), new Set()).length });

	return {
		file: {
			format: 2,
			site: { slug, name, place: place || null, version },
			source: { site_json: relative(ROOT, sitePath).split("\\").join("/"), sha256: createHash("sha256").update(raw).digest("hex") },
			lens,
			tiers: story.tiers || {},
			elements: order.map((e) => ({ key: e.key, kind: e.kind, name: e.name, chapter: e.chapter.id, puzzles: e.variants.length })),
			puzzles,
		},
		order,
		report: { slug, elements: order, all: elements, skipped, notes, table, E, puzzles: Object.keys(puzzles).length, usableNodes: usableNodes.map((n) => n.id) },
	};
}

// The element a puzzle belongs to: its stored key, or the part of its id before the first dot.
function elementKeyOf(puzzle) {
	return puzzle?.element?.key || String(puzzle?.id || "").split(".")[0];
}

// Consecutive days from day 0 on: each day the least recently used element that is at least
// minGap days clear (lastUsed holds day numbers relative to day 0, negative for days already in the
// calendar) and still has a puzzle never used (usedPuzzles). Stops at the first day with no element
// free: the calendar never has a hole and never cycles. Returns the picked puzzle ids, in order.
function calendarRun(order, minGap, lastUsed, usedPuzzles) {
	const last = new Map(lastUsed);
	const used = new Set(usedPuzzles);
	const out = [];
	for (let d = 0; ; d++) {
		let pick = null;
		for (const e of order) {
			const next = e.variants.find((v) => !used.has(v));
			if (!next) continue;
			const l = last.get(e.key);
			if (l != null && d - l < minGap) continue;
			if (!pick || (last.get(pick.e.key) ?? -Infinity) > (l ?? -Infinity)) pick = { e, next };
		}
		if (!pick) break;
		out.push(pick.next);
		used.add(pick.next);
		last.set(pick.e.key, d);
	}
	return out;
}

// ---------------------------------------------------------------- main

const opts = args(process.argv.slice(2));
const today = gameDay();
const outFile = (slug) => join(opts.out, `${slug}.json`);
const readJson = (p) => {
	try {
		return JSON.parse(readFileSync(p, "utf8"));
	} catch {
		return null;
	}
};
// Every daily file already written, by slug.
const existing = new Map();
if (existsSync(opts.out)) {
	for (const name of readdirSync(opts.out)) {
		if (!name.endsWith(".json")) continue;
		const f = readJson(join(opts.out, name));
		if (f?.site?.slug) existing.set(f.site.slug, f);
	}
}

const files = [];
for (const p of opts.sites) {
	if (!existsSync(p)) {
		console.error(`missing ${p}`);
		process.exitCode = 1;
		continue;
	}
	const { file, order, report } = await buildSite(p, opts);
	const old = existing.get(file.site.slug);

	// Kept: every date up to and including today, with the puzzle it had (copied over if this pack
	// no longer makes it). A file in the old format (a cycling schedule) has no dates to keep.
	const days = {};
	const keptPuzzles = {};
	for (const [d, id] of Object.entries(old?.days || {}).sort()) {
		if (d > today) continue;
		const puzzle = file.puzzles[id] || old.puzzles?.[id];
		if (!puzzle) continue;
		days[d] = id;
		if (!file.puzzles[id]) keptPuzzles[id] = puzzle;
	}
	const puzzles = { ...keptPuzzles, ...file.puzzles };

	// Dates any other site already has are taken.
	const taken = new Set();
	for (const [slug, f] of existing) if (slug !== file.site.slug) for (const d of Object.keys(f.days || {})) taken.add(d);
	for (const f of files) for (const d of Object.keys(f.days)) taken.add(d);

	// New dates start after the last kept one, and not before --start.
	const lastKept = lastPuzzleDay([{ days }]);
	const from = lastKept && addDays(lastKept, 1) > opts.start ? addDays(lastKept, 1) : opts.start;
	const dayNo = (d) => Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
	// Element history (day numbers relative to "from") and the puzzles already used.
	const lastUsed = new Map();
	const usedPuzzles = new Set();
	for (const [d, id] of Object.entries(days).sort()) {
		lastUsed.set(elementKeyOf(puzzles[id]), dayNo(d));
		usedPuzzles.add(id);
	}
	// One date at a time, skipping dates another site has, until no element is free.
	let d = from;
	for (let guard = 0; guard < 3660; guard++) {
		if (taken.has(d)) {
			d = addDays(d, 1);
			continue;
		}
		const here = dayNo(d);
		const [pick] = calendarRun(order, opts.minGap, new Map([...lastUsed].map(([k, v]) => [k, v - here])), usedPuzzles);
		if (!pick) break;
		days[d] = pick;
		lastUsed.set(elementKeyOf(puzzles[pick]), here);
		usedPuzzles.add(pick);
		d = addDays(d, 1);
	}
	const dates = Object.keys(days).sort();
	const added = dates.filter((x) => x >= from);
	const last = dates[dates.length - 1] || null;
	const out = {
		...file,
		puzzles,
		min_gap: opts.minGap,
		coverage: {
			elements: report.E,
			puzzles: Object.keys(file.puzzles).length,
			kept_days: dates.length - added.length,
			added_days: added.length,
			first_day: dates[0] || null,
			last_day: last,
			by_min_gap: report.table,
		},
		days,
	};
	files.push(out);

	console.log(`\n== ${report.slug} (v${file.site.version})  from ${file.source.site_json}`);
	console.log(`viewpoints with 512 px NOW faces: ${report.usableNodes.join(", ") || "none"}`);
	console.log(`elements: ${report.E}   puzzles: ${report.puzzles}`);
	for (const e of report.elements) console.log(`  ${e.key.padEnd(28)} ${e.chapter.id.padEnd(6)} ${String(e.variants.length).padStart(3)} puzzle(s)  ${e.name}`);
	for (const s of report.skipped) console.log(`  skipped: ${s}`);
	for (const n of report.notes) console.log(`  note: ${n}`);
	console.log(`calendar, no element twice within ${opts.minGap} days: kept ${out.coverage.kept_days} date(s) up to today (${today}), added ${added.length} from ${from}`);
	console.log(`  the daily has a puzzle on every date from ${dates[0] || "none"} to ${last || "none"}, and none after.`);
	if (opts.minGap < SPREAD) console.log(`  NOTE: --min-gap ${opts.minGap} is below the brief's ${SPREAD} days. That is the owner's call; record it in docs/play/DECISIONS.md.`);
	if (report.E < SPREAD) {
		console.log(`COVERAGE: this pack has ${report.E} elements, fewer than ${SPREAD}, so it cannot keep an element out for ${SPREAD} days.`);
		console.log(`  [SAMBIT: the daily runs out after ${last || "(no date)"}. Publish a pack with more elements and run this again, or choose a shorter --min-gap (your call).]`);
	}
	console.log(`  min gap -> days in a row from an empty calendar:`);
	let prev = null;
	for (const t of report.table) {
		if (prev && prev.days === t.days && t.min_gap !== opts.minGap) continue;
		console.log(`    ${String(t.min_gap).padStart(2)} -> ${String(t.days).padStart(4)} days${t.min_gap === opts.minGap ? "  <- used" : ""}`);
		prev = t;
	}
}

if (!opts.dry && files.length) {
	mkdirSync(opts.out, { recursive: true });
	for (const f of files) writeFileSync(outFile(f.site.slug), JSON.stringify(f, null, 1) + "\n");
	// The server imports this index, so a new file is picked up by the build with no code change.
	const known = new Set(files.map((f) => f.site.slug));
	for (const slug of existing.keys()) if (existsSync(outFile(slug))) known.add(slug);
	const slugs = [...known].sort();
	const index = [
		"// Generated by tools/play/daily/generate.mjs. Do not edit by hand.",
		...slugs.map((s, i) => `import d${i} from "./${s}.json";`),
		"",
		`const DAILY = [${slugs.map((_, i) => `d${i}`).join(", ")}];`,
		"",
		"export default DAILY;",
		"",
	].join("\n");
	writeFileSync(join(opts.out, "index.js"), index);
	console.log(`\nwrote ${files.map((f) => relative(ROOT, outFile(f.site.slug))).join(", ")} and index.js`);
}
