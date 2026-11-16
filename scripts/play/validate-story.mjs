// Validates Play story files. Run by `npm run lint` and by the pack exporter.
//   node scripts/play/validate-story.mjs [path/to/story.json ...]
// With no arguments it checks every content/play/*/story.json.
//
// Hard rules from docs/play/PLAY_BRIEF.md 3.2 and 5.6:
//   - a beat with text and no fact id fails the build
//   - a fact with status "check" cannot ship
//   - no em or en dashes anywhere in copy
//   - every fact, witness, evidence and restoration reference resolves
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BEAT_TYPES = new Set(["line", "lens", "evidence", "choice", "restore", "order", "answer", "know", "hook", "reveal", "proof", "vote"]);
const PACES = new Set(["steady", "slow", "brisk"]);
const TIERS = new Set(["record", "reconstruction", "legend", "unknown", "reading"]);
const DASH = /[–—]/;

function texts(value) {
	if (!value) return [];
	if (typeof value === "string") return [value];
	return Object.values(value).filter((v) => typeof v === "string");
}

export function validateStory(story, file = "story.json") {
	const errors = [];
	const warn = [];
	const placeholders = [];
	const err = (m) => errors.push(`${file}: ${m}`);
	const facts = new Map((story.facts || []).map((f) => [f.id, f]));
	const witnesses = new Set((story.witnesses || []).map((w) => w.id));
	const evidence = new Set((story.evidence || []).map((e) => e.id));
	const beatIds = new Set();
	const clipIds = new Set();

	for (const f of story.facts || []) {
		if (!f.id || !f.claim) err(`fact ${f.id || "?"} needs an id and a claim`);
		if (!TIERS.has(f.tier)) err(`fact ${f.id} has unknown tier "${f.tier}"`);
		if (f.status !== "verified") err(`fact ${f.id} has status "${f.status}". Only "verified" facts can ship.`);
		if (f.tier !== "unknown" && !f.source) err(`fact ${f.id} has no source`);
		if (/\[SAMBIT/.test(f.source || "")) placeholders.push(`fact ${f.id}: ${f.source}`);
	}

	const checkFacts = (ids, where) => {
		if (!Array.isArray(ids) || ids.length === 0) return err(`${where} has text but no fact id`);
		for (const id of ids) if (!facts.has(id)) err(`${where} cites unknown fact ${id}`);
	};

	const checkSay = (say, where, fallbackPace) => {
		const segs = Array.isArray(say) ? say : say ? [{ text: say }] : [];
		for (const s of segs) {
			if (!s.text) err(`${where} has an empty say segment`);
			if (/[\[\]()&%$#@0-9]/.test(s.text || "")) err(`${where} say is not written for the ear: "${s.text}"`);
			const pace = s.pace || fallbackPace;
			if (pace && !PACES.has(pace)) err(`${where} has unknown pace "${pace}"`);
			if (s.clip) {
				if (clipIds.has(s.clip)) err(`${where} reuses clip id ${s.clip}`);
				clipIds.add(s.clip);
			}
		}
		return segs;
	};

	const checkCopy = (value, where) => {
		for (const t of texts(value)) if (DASH.test(t)) err(`${where} contains an em or en dash: "${t}"`);
	};

	const checkBeat = (b, where) => {
		if (!b.id) return err(`${where} has a beat with no id`);
		const at = `${where} beat ${b.id}`;
		if (beatIds.has(b.id)) err(`${at}: duplicate beat id`);
		if (b.placeholder) placeholders.push(`${at}: "${texts(b.text)[0]}"`);
		beatIds.add(b.id);
		if (!BEAT_TYPES.has(b.type)) err(`${at}: unknown type "${b.type}"`);
		checkCopy(b.text, at);
		// Lines that state nothing about the past (framing, questions, method) carry "frame": true
		// and still need a fact list, which may point at the method note M-facts.
		if (texts(b.text).length && !b.ui) checkFacts(b.facts, at);
		if (b.say) checkSay(b.say, at, b.pace);
		if (b.pace && !PACES.has(b.pace)) err(`${at}: unknown pace "${b.pace}"`);
		if (b.evidence && !evidence.has(b.evidence)) err(`${at}: unknown evidence ${b.evidence}`);
		if (b.type === "choice") {
			const opts = b.options || [];
			if (opts.length < 2) err(`${at}: a choice needs at least two options`);
			if (!opts.some((o) => o.accepted)) err(`${at}: no accepted option`);
			for (const o of opts) {
				checkCopy(o.text, `${at} option ${o.id}`);
				checkCopy(o.record, `${at} option ${o.id}`);
				for (const l of o.after || []) checkBeat({ ...l, type: l.type || "line" }, `${at} option ${o.id}`);
			}
		}
		if (b.type === "order") for (const c of b.cards || []) {
			checkCopy(c.text, `${at} card`);
			checkFacts(c.facts, `${at} card "${c.label}"`);
		}
	};

	for (const ch of story.chapters || []) {
		const where = `chapter ${ch.id}`;
		if (ch.witness && !witnesses.has(ch.witness)) err(`${where}: unknown witness ${ch.witness}`);
		checkCopy(ch.title, where);
		for (const b of ch.beats || []) checkBeat(b, where);
	}
	for (const e of story.evidence || []) {
		checkCopy(e.title, `evidence ${e.id}`);
		checkCopy(e.caption, `evidence ${e.id}`);
		checkFacts(e.facts, `evidence ${e.id}`);
	}
	for (const k of ["title", "logline", "question"]) checkCopy(story[k], k);
	if (story.ending) {
		for (const item of story.ending.know || []) {
			checkCopy(item.text, "ending know");
			checkFacts(item.facts, `ending know "${texts(item.text)[0]}"`);
		}
		for (const item of story.ending.unknown || []) checkCopy(item.text, "ending unknown");
		for (const b of story.ending.beats || []) checkBeat(b, "ending");
	}
	return { errors, warn, placeholders, counts: { facts: facts.size, beats: beatIds.size, clips: clipIds.size } };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
	const ship = process.argv.includes("--ship");
	let files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
	if (files.length === 0) {
		const base = join(ROOT, "content", "play");
		files = existsSync(base)
			? readdirSync(base).map((d) => join(base, d, "story.json")).filter(existsSync)
			: [];
	}
	let bad = 0;
	for (const file of files) {
		const story = JSON.parse(readFileSync(file, "utf8"));
		const { errors, counts, placeholders } = validateStory(story, file.replace(ROOT, "").replace(/\\/g, "/"));
		for (const e of errors) console.error("  ✖ " + e);
		for (const p of placeholders) console.log("  [SAMBIT] " + p);
		if (ship && placeholders.length) {
			console.error(`  ✖ ${placeholders.length} placeholder(s) cannot ship`);
			bad += placeholders.length;
		}
		bad += errors.length;
		console.log(`validate-story: ${file.replace(ROOT, "").replace(/\\/g, "/")}: ${counts.facts} facts, ${counts.beats} beats, ${counts.clips} clips, ${errors.length} error(s)`);
	}
	if (files.length === 0) console.log("validate-story: no story files yet");
	process.exit(bad ? 1 : 0);
}
