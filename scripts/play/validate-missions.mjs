// Validates the open-world layer. Run by `npm run lint`.
//   node scripts/play/validate-missions.mjs [path/to/missions.json ...]
// With no arguments it checks every content/play/*/missions.json.
//
// Hard rules from docs/play/OPEN_WORLD_BRIEF.md 2.5, 2.7, 3.2 and 7:
//   - a line that states a fact carries a fact id from story.json or world_facts
//   - a line with no fact id holds no number, year or date
//   - only role figures speak: no real person is ever a speaker or an NPC
//   - every beat, NPC, record, ride, voice and evidence reference resolves
//   - the game's title, tagline, past era and credit lines are present
//   - no em or en dashes, no prices, none of the other game's name or on-screen phrases
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DASH = /[–—]/;
const PRICE = /[₹$€£]|\b(rupees?|price|cost[s]?|fanams?|pagodas?)\b/i;
const THEIR_WORDS = /\b(gta|grand theft|rockstar|vice city|wasted|busted|mission passed|respect \+)\b/i;
const NUMBERISH = /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|year|years|century)\b/i;
const REAL_PEOPLE = /\b(tipu|tippoo|hyder|haidar|hunter|buchanan|cornwallis|bowring|purnaiah|bahadur|mackenzie|kempe|wadiyar|rice)\b/i;
const OBJECTIVES = new Set(["goto", "story", "talk", "record", "ride", "choice", "restore", "era"]);
const RIDES = new Set(["cart", "horse", "elephant"]);

function beatIds(story) {
	const ids = new Set();
	const visit = (b) => {
		if (!b || typeof b !== "object") return;
		if (b.id) ids.add(b.id);
		for (const o of b.options || []) for (const a of o.after || []) visit(a);
		for (const a of b.after || []) visit(a);
		for (const c of b.cards || []) visit(c);
	};
	for (const ch of story.chapters) for (const b of ch.beats) visit(b);
	return ids;
}

function checkCopy(where, text, errors) {
	if (typeof text !== "string") return;
	if (DASH.test(text)) errors.push(`${where}: em or en dash`);
	if (PRICE.test(text)) errors.push(`${where}: price or money word`);
	if (THEIR_WORDS.test(text)) errors.push(`${where}: another game's name or phrase`);
}

export function validateMissions(data, story) {
	const errors = [];
	const beats = beatIds(story);
	const facts = new Set([...story.facts.map((f) => f.id), ...(data.world_facts || []).map((f) => f.id)]);
	const evidence = new Set((story.evidence || []).map((e) => e.id));
	const npcs = new Map((data.npcs || []).map((n) => [n.id, n]));
	const records = new Map((data.records || []).map((r) => [r.id, r]));
	const rides = new Map((data.rides || []).map((r) => [r.id, r]));
	const needFacts = (where, ids) => {
		for (const id of ids || []) if (!facts.has(id)) errors.push(`${where}: unknown fact ${id}`);
	};
	const needBeat = (where, id) => {
		if (!beats.has(id)) errors.push(`${where}: unknown story beat ${id}`);
	};

	for (const field of ["title", "tagline"]) {
		if (typeof data[field] !== "string" || !data[field].trim()) errors.push(`${field}: required`);
		checkCopy(field, data[field], errors);
	}
	const past = data.eras?.past;
	if (typeof past !== "string" || !past.trim()) errors.push("eras.past: required");
	else if (!(data.missions || []).some((m) => m.era === past)) errors.push(`eras.past: no mission is set in ${past}`);
	if (!Array.isArray(data.credits) || !data.credits.length) errors.push("credits: needs at least one line");
	for (const [i, line] of (Array.isArray(data.credits) ? data.credits : []).entries()) {
		if (typeof line !== "string" || !line.trim()) errors.push(`credits[${i}]: must be a line of text`);
		checkCopy(`credits[${i}]`, line, errors);
	}
	for (const f of data.world_facts || []) {
		if (!f.claim || !f.source || !f.tier) errors.push(`world fact ${f.id}: needs claim, source and tier`);
		checkCopy(`world fact ${f.id}`, f.claim, errors);
	}
	for (const n of npcs.values()) {
		if (REAL_PEOPLE.test(n.role) || REAL_PEOPLE.test(n.id)) errors.push(`npc ${n.id}: a real person cannot be a talking figure`);
		if (!data.dialogue?.[n.dialogue]) errors.push(`npc ${n.id}: no dialogue ${n.dialogue}`);
		if (!data.voices?.[n.id]) errors.push(`npc ${n.id}: no voice`);
	}
	const lineIds = new Set();
	for (const [key, lines] of Object.entries(data.dialogue || {})) {
		for (const l of lines) {
			if (l.beat) {
				needBeat(`dialogue ${key}`, l.beat);
				continue;
			}
			const where = `line ${l.id || key}`;
			if (!l.id) errors.push(`${where}: no id`);
			if (lineIds.has(l.id)) errors.push(`${where}: duplicate id`);
			lineIds.add(l.id);
			if (!npcs.has(l.speaker)) errors.push(`${where}: speaker ${l.speaker} is not a role figure`);
			checkCopy(where, l.text, errors);
			checkCopy(where, l.say, errors);
			needFacts(where, l.facts);
			if (!l.facts?.length && NUMBERISH.test(l.text)) errors.push(`${where}: states a number or date with no fact id`);
			if (!l.facts?.length && REAL_PEOPLE.test(l.text)) errors.push(`${where}: names a real person with no fact id`);
		}
	}
	for (const r of records.values()) {
		for (const b of r.beats || []) needBeat(`record ${r.id}`, b);
		if (r.evidence && !evidence.has(r.evidence)) errors.push(`record ${r.id}: unknown evidence ${r.evidence}`);
		checkCopy(`record ${r.id}`, r.title, errors);
		checkCopy(`record ${r.id}`, r.placement_note, errors);
	}
	for (const r of rides.values()) {
		if (!RIDES.has(r.type)) errors.push(`ride ${r.id}: unknown type ${r.type}`);
		needFacts(`ride ${r.id}`, r.note_facts);
	}
	for (const p of data.places || []) needFacts(`place ${p.id}`, p.facts);
	for (const m of data.missions || []) {
		checkCopy(`mission ${m.id}`, m.title, errors);
		checkCopy(`mission ${m.id}`, m.place_line, errors);
		for (const o of m.objectives || []) {
			const where = `objective ${o.id}`;
			if (!OBJECTIVES.has(o.kind)) errors.push(`${where}: unknown kind ${o.kind}`);
			checkCopy(where, o.text, errors);
			for (const b of o.beats || []) needBeat(where, b);
			if (o.beat) needBeat(where, o.beat);
			if (o.kind === "talk" && !npcs.has(o.npc)) errors.push(`${where}: unknown npc ${o.npc}`);
			if (o.kind === "record" && !records.has(o.record)) errors.push(`${where}: unknown record ${o.record}`);
			if (o.kind === "ride" && !rides.has(o.ride)) errors.push(`${where}: unknown ride ${o.ride}`);
		}
	}
	return errors;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
	const base = join(ROOT, "content", "play");
	const paths = process.argv.slice(2).length
		? process.argv.slice(2)
		: readdirSync(base, { withFileTypes: true })
				.filter((d) => d.isDirectory() && existsSync(join(base, d.name, "missions.json")))
				.map((d) => join(base, d.name, "missions.json"));
	let failed = 0;
	for (const p of paths) {
		const data = JSON.parse(readFileSync(p, "utf8"));
		const story = JSON.parse(readFileSync(join(dirname(p), "story.json"), "utf8"));
		const errors = validateMissions(data, story);
		const lines = Object.values(data.dialogue || {}).flat().filter((l) => !l.beat).length;
		console.log(`${data.slug}: ${data.missions.length} missions, ${lines} dialogue lines, ${errors.length} errors`);
		for (const e of errors) console.log("  " + e);
		failed += errors.length;
	}
	process.exit(failed ? 1 : 0);
}
