// Validates Play story files. Run by `npm run lint` and by the pack exporter.
//   node scripts/play/validate-story.mjs [path/to/story.json ...]
// With no arguments it checks every content/play/*/story.json.
//
// Hard rules from docs/play/PLAY_BRIEF.md 3.2 and 5.6:
//   - a beat with text and no fact id fails the build
//   - a fact with status "check" cannot ship
//   - no em or en dashes anywhere in copy
//   - every fact, witness, evidence and restoration reference resolves
// Beat shapes the engine plays (lib/play/story/engine.js):
//   - order: cards with ids and facts, listed in the right order; a gap card needs facts too
//   - reveal: no text and nothing spoken
//   - proof: a line, a toggle_label, and `after` lines that are beats
//   - vote: options with text, none marked right
//   - ending: know (facts), unknown, share_line, quiz (four options, answer index in range)
//   - ids are unique across beats, after lines and cards; so are the clip ids they speak under
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BEAT_TYPES = new Set(["line", "lens", "evidence", "choice", "restore", "order", "answer", "know", "hook", "reveal", "proof", "vote"]);
const PACES = new Set(["steady", "slow", "brisk"]);
const TIERS = new Set(["record", "reconstruction", "legend", "unknown", "reading"]);
const DASH = /[–—]/;
const TWO_LINES = 92; // characters that fit on two lines of a 375 px wide phone

function texts(value) {
	if (!value) return [];
	if (typeof value === "string") return [value];
	return Object.values(value).filter((v) => typeof v === "string");
}

function textEntries(value) {
	if (!value) return [];
	if (typeof value === "string") return [["", value]];
	return Object.entries(value).filter(([, v]) => typeof v === "string");
}

// Mirrors sentencesOf() in lib/play/story/engine.js.
function sentencesOf(text) {
	const out = [];
	const re = /[^.!?]*[.!?]+["'”’)\]]*(?=\s|$)/g;
	const src = String(text || "").trim();
	let last = 0;
	while (re.exec(src)) {
		const s = src.slice(last, re.lastIndex).trim();
		if (s) out.push(s);
		last = re.lastIndex;
	}
	const tail = src.slice(last).trim();
	if (tail) out.push(tail);
	return out;
}

// The clip ids a beat is spoken under. Mirrors sayFor() and spokenFor() in the engine.
function clipsOf(b) {
	if (!b || b.ui) return [];
	if (Array.isArray(b.say)) return b.say.map((s, i) => s.clip || (i === 0 ? b.id : `${b.id}-${i + 1}`));
	if (typeof b.say === "string") return [b.clip || b.id];
	if (b.silent || texts(b.text).length === 0) return [];
	return [b.clip || b.id];
}

export function validateStory(story, file = "story.json") {
	const errors = [];
	const warn = [];
	const placeholders = [];
	const long = []; // lines that will not fit in two lines on a 375 px wide phone
	const err = (m) => errors.push(`${file}: ${m}`);
	const facts = new Map((story.facts || []).map((f) => [f.id, f]));
	const witnesses = new Set((story.witnesses || []).map((w) => w.id));
	const evidence = new Set((story.evidence || []).map((e) => e.id));
	const beatIds = new Set();
	const clipIds = new Map(); // clip id -> where it is spoken
	let spoken = 0;

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
		}
		return segs;
	};

	const checkCopy = (value, where) => {
		for (const t of texts(value)) if (DASH.test(t)) err(`${where} contains an em or en dash: "${t}"`);
	};

	// Two lines on a phone. A line that pages with its clips (as many sentences as spoken
	// segments) is shown a sentence at a time, so only its sentences are measured.
	const checkLength = (b, where) => {
		if (b.ui) return;
		const segments = clipsOf(b).length;
		for (const [lens, t] of textEntries(b.text)) {
			const sentences = segments >= 2 ? sentencesOf(t) : [];
			const tag = lens ? ` (${lens})` : "";
			if (sentences.length === segments && segments >= 2) {
				sentences.forEach((s, i) => {
					if (s.length > TWO_LINES) long.push(`${where}: sentence ${i + 1} is ${s.length} characters${tag}`);
				});
			} else if (t.length > TWO_LINES) long.push(`${where}: ${t.length} characters${tag}`);
		}
	};

	// Everything with an id that can be told: one id each, and clip ids that collide with nothing.
	const claim = (b, where) => {
		if (!b || typeof b !== "object" || !b.id) {
			err(`${where} has no id`);
			return false;
		}
		if (beatIds.has(b.id)) err(`${where} ${b.id}: duplicate id`);
		beatIds.add(b.id);
		for (const clip of clipsOf(b)) {
			spoken++;
			if (clipIds.has(clip)) err(`${where} ${b.id}: clip id ${clip} is already spoken by ${clipIds.get(clip)}`);
			else clipIds.set(clip, b.id);
		}
		return true;
	};

	const checkBeat = (b, where) => {
		if (!claim(b, `${where} beat`)) return;
		const at = `${where} beat ${b.id}`;
		if (b.placeholder) placeholders.push(`${at}: "${texts(b.text)[0]}"`);
		if (!BEAT_TYPES.has(b.type)) err(`${at}: unknown type "${b.type}"`);
		checkCopy(b.text, at);
		checkLength(b, at);
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

		if (b.type === "order") {
			const cards = Array.isArray(b.cards) ? b.cards : [];
			if (cards.filter((c) => c && !c.gap).length < 2) err(`${at}: an order beat needs at least two cards to place`);
			if (!texts(b.text).length) err(`${at}: an order beat needs its instruction as text`);
			for (const c of cards) {
				const kind = c?.gap ? "gap card" : "card";
				if (!claim(c, `${at} ${kind}`)) continue;
				const cat = `${at} ${kind} ${c.id}`;
				if (!c.label) err(`${cat}: needs a label`);
				if (!texts(c.text).length) err(`${cat}: needs text`);
				checkCopy(c.label, cat);
				checkCopy(c.text, cat);
				checkFacts(c.facts, cat);
				// A placed card is told as a line. A gap card is read where it stands, in the list.
				if (!c.gap) checkLength(c, cat);
				if (c.say) checkSay(c.say, cat, c.pace);
				if (c.pace && !PACES.has(c.pace)) err(`${cat}: unknown pace "${c.pace}"`);
			}
		}

		if (b.type === "reveal") {
			if (texts(b.text).length || b.say) err(`${at}: a reveal has no text. Nothing is said over it.`);
		}

		if (b.type === "proof") {
			if (!texts(b.text).length) err(`${at}: a proof beat needs the line that introduces the switch`);
			if (!texts(b.toggle_label).length) err(`${at}: a proof beat needs a toggle_label`);
			checkCopy(b.toggle_label, at);
			if (b.after != null && !Array.isArray(b.after)) err(`${at}: "after" must be a list of line beats`);
			for (const l of Array.isArray(b.after) ? b.after : []) {
				if (!l || typeof l !== "object") {
					err(`${at}: an "after" line is not a beat`);
					continue;
				}
				if (l.type && l.type !== "line") err(`${at}: "after" line ${l.id || "?"} must be a line, not "${l.type}"`);
				if (!texts(l.text).length) err(`${at}: "after" line ${l.id || "?"} has no text`);
				checkBeat({ ...l, type: "line" }, `${at} after`);
			}
		}

		if (b.type === "vote") {
			const opts = Array.isArray(b.options) ? b.options : [];
			if (!texts(b.text).length) err(`${at}: a vote needs its question as text`);
			if (opts.length < 2) err(`${at}: a vote needs at least two options`);
			const seen = new Set();
			for (const o of opts) {
				const oat = `${at} option ${o?.id || "?"}`;
				if (!o?.id) err(`${oat}: needs an id`);
				else if (seen.has(o.id)) err(`${oat}: duplicate option id`);
				seen.add(o?.id);
				if (!texts(o?.text).length) err(`${oat}: needs text`);
				checkCopy(o?.text, oat);
				if (o && "accepted" in o) err(`${oat}: a vote has no right answer, so no option is "accepted"`);
			}
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
		if (e.image != null) {
			// A path inside the pack, shown with its credit.
			if (typeof e.image !== "string" || !e.image || /^\/|\.\.|^[a-z]+:/i.test(e.image)) err(`evidence ${e.id}: image must be a path inside the pack`);
			if (!e.credit) err(`evidence ${e.id}: an image needs a credit`);
		}
	}
	for (const k of ["title", "logline", "question"]) checkCopy(story[k], k);
	if (story.ending) {
		const ending = story.ending;
		for (const item of ending.know || []) {
			checkCopy(item.text, "ending know");
			checkFacts(item.facts, `ending know "${texts(item.text)[0]}"`);
		}
		for (const item of ending.unknown || []) checkCopy(item.text, "ending unknown");
		checkCopy(ending.share_line, "ending share_line");
		for (const b of ending.beats || []) checkBeat(b, "ending");
		if (ending.quiz != null && !Array.isArray(ending.quiz)) err(`ending quiz must be a list`);
		const quizIds = new Set();
		for (const q of Array.isArray(ending.quiz) ? ending.quiz : []) {
			const qat = `ending quiz ${q?.id || "?"}`;
			if (!q?.id) err(`${qat}: needs an id`);
			else if (quizIds.has(q.id)) err(`${qat}: duplicate id`);
			quizIds.add(q?.id);
			if (!texts(q?.q).length) err(`${qat}: needs a question`);
			checkCopy(q?.q, qat);
			const options = Array.isArray(q?.options) ? q.options : [];
			if (options.length !== 4) err(`${qat}: needs exactly four options, has ${options.length}`);
			for (const o of options) {
				if (!texts(o).length) err(`${qat}: an option is empty`);
				checkCopy(o, qat);
			}
			if (!Number.isInteger(q?.answer) || q.answer < 0 || q.answer >= options.length) err(`${qat}: answer must be the index of one of its options`);
		}
	}
	return { errors, warn, placeholders, long, counts: { facts: facts.size, beats: beatIds.size, clips: spoken } };
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
		const { errors, counts, placeholders, long } = validateStory(story, file.replace(ROOT, "").replace(/\\/g, "/"));
		for (const e of errors) console.error("  ✖ " + e);
		for (const p of placeholders) console.log("  [SAMBIT] " + p);
		for (const l of long) console.log("  [long line] " + l);
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
