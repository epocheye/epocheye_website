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
//   - the player is always told what to do and why: a premise, a job per mission, a plain action
//     and a reason per objective, a marker for every place, a card for each era shift and restoration
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DASH = /[–—]/;
const PRICE = /[₹$€£]|\b(rupees?|price|cost[s]?|fanams?|pagodas?)\b/i;
const THEIR_WORDS = /\b(gta|grand theft|rockstar|vice city|wasted|busted|mission passed|respect \+)\b/i;
const NUMBERISH = /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|year|years|century)\b/i;
const REAL_PEOPLE = /\b(tipu|tippoo|hyder|haidar|hunter|buchanan|cornwallis|bowring|purnaiah|bahadur|mackenzie|kempe|wadiyar|rice)\b/i;
const OBJECTIVES = new Set(["goto", "story", "talk", "record", "ride", "choice", "restore", "era", "sketch_compare", "look_at", "climb", "order", "reveal", "proof", "vote", "ending"]);
// Objectives that name a story beat of a given type.
const BEAT_KINDS = { choice: "choice", order: "order", reveal: "reveal", proof: "proof", vote: "vote" };
const TIERS = new Set(["record", "reconstruction", "legend", "unknown", "reading"]);
const RIDES = new Set(["cart", "horse", "elephant"]);
// An objective must say what to do. These words alone do not.
const VAGUE = /^(listen|look|watch|wait|continue|next|go|go on|proceed|explore|read|talk)\b[.!]?$|^listen\b/i;
const MAX_ACTION = 60;
const MAX_WHY = 90;

function beatTypes(story) {
	const types = new Map();
	for (const ch of story.chapters) for (const b of ch.beats) types.set(b.id, b.type || "line");
	return types;
}

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

// New on-screen copy: an instruction needs no fact id, but a number, a date or a real person does.
function checkStated(where, text, ids, errors) {
	if (typeof text !== "string" || !text.trim()) return errors.push(`${where}: required`);
	checkCopy(where, text, errors);
	if (!ids?.length && NUMBERISH.test(text)) errors.push(`${where}: states a number or date with no fact id`);
	if (!ids?.length && REAL_PEOPLE.test(text)) errors.push(`${where}: names a real person with no fact id`);
}

// Where an objective sends the player, or null if it is done where they stand.
function placeOf(o, npcs, records, rides) {
	if (o.kind === "goto" || o.kind === "sketch_compare" || o.kind === "climb") return o.at ?? null;
	if (o.kind === "look_at") return o.from ?? null;
	if (o.kind === "talk") return npcs.get(o.npc)?.at ?? null;
	if (o.kind === "record") return records.get(o.record)?.at ?? null;
	if (o.kind === "ride") return o.at && rides.get(o.ride)?.at ? o.at : null;
	return undefined;
}

// site is the pack's site.json when it is on disk: panorama nodes and restorations are checked against it.
export function validateMissions(data, story, site = null) {
	const errors = [];
	const beats = beatIds(story);
	const types = beatTypes(story);
	const panoNodes = site ? new Set(site.nodes.map((n) => n.id)) : null;
	const restorations = site ? new Set((site.restorations || []).map((r) => r.id)) : null;
	const needNode = (where, id) => {
		if (id && panoNodes && !panoNodes.has(id)) errors.push(`${where}: unknown panorama node ${id}`);
	};
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
	if (!Array.isArray(data.premise) || data.premise.length !== 3) errors.push("premise: needs three lines: who you are, what you carry, your job");
	for (const [i, l] of (Array.isArray(data.premise) ? data.premise : []).entries()) {
		checkStated(`premise[${i}].label`, l.label, ["label"], errors);
		checkStated(`premise[${i}]`, l.text, l.facts, errors);
		needFacts(`premise[${i}]`, l.facts);
	}
	const past = data.eras?.past;
	if (typeof past !== "string" || !past.trim()) errors.push("eras.past: required");
	else if (!(data.missions || []).some((m) => m.era === past)) errors.push(`eras.past: no mission is set in ${past}`);
	const eraIds = new Set([past, "today", ...Object.keys(data.eras?.stages || {})]);
	for (const [id, stage] of Object.entries(data.eras?.stages || {})) {
		if (id === past || id === "today") errors.push(`eras.stages.${id}: must be a different era`);
		if (stage.muted != null && !(stage.muted >= 0 && stage.muted <= 1)) errors.push(`eras.stages.${id}: muted must be 0 to 1`);
		for (const d of stage.dress || []) if (!["desk", "shelf", "chest"].includes(d.type)) errors.push(`eras.stages.${id}: unknown dress ${d.type}`);
	}
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
		needFacts(`npc ${n.id}`, n.note_facts);
		checkCopy(`npc ${n.id}`, n.placement_note, errors);
		if (n.era && !eraIds.has(n.era)) errors.push(`npc ${n.id}: unknown era ${n.era}`);
		for (const id of n.missions || []) if (!(data.missions || []).some((m) => m.id === id)) errors.push(`npc ${n.id}: unknown mission ${id}`);
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
		needNode(`record ${r.id}`, r.pano_node);
	}
	for (const r of rides.values()) {
		if (!RIDES.has(r.type)) errors.push(`ride ${r.id}: unknown type ${r.type}`);
		needFacts(`ride ${r.id}`, r.note_facts);
	}
	for (const p of data.places || []) {
		needFacts(`place ${p.id}`, p.facts);
		needNode(`place ${p.id}`, p.pano_node);
		checkCopy(`place ${p.id}`, p.name, errors);
	}
	for (const m of data.missions || []) {
		checkCopy(`mission ${m.id}`, m.title, errors);
		checkCopy(`mission ${m.id}`, m.place_line, errors);
		checkCopy(`mission ${m.id}`, m.place_note, errors);
		needFacts(`mission ${m.id}`, m.place_note_facts);
		if (m.place_note && !m.place_note_facts?.length) errors.push(`mission ${m.id}: a place note needs a fact id`);
		if (!eraIds.has(m.era)) errors.push(`mission ${m.id}: unknown era ${m.era}`);
		checkStated(`mission ${m.id} job`, m.job, m.job_facts, errors);
		needFacts(`mission ${m.id} job`, m.job_facts);
		if (m.where != null) checkStated(`mission ${m.id} where`, m.where, m.where_facts, errors);
		needFacts(`mission ${m.id} where`, m.where_facts);
		if (m.end) {
			for (const k of ["splash", "place", "year"]) {
				if (typeof m.end[k] !== "string" || !m.end[k].trim()) errors.push(`mission ${m.id}: end.${k} required`);
				checkCopy(`mission ${m.id} end`, m.end[k], errors);
			}
		}
		if (m.staging) {
			needFacts(`mission ${m.id} staging`, m.staging.facts);
			const r = m.staging.ruler;
			if (r) {
				// A real ruler may only ever be a distant, silent, unlabelled figure.
				if (!r.silent || !r.no_dialogue || !r.no_label) errors.push(`mission ${m.id}: a staged ruler must be silent, with no dialogue and no label`);
				if (!(r.min_view_distance_m >= 10)) errors.push(`mission ${m.id}: a staged ruler must be kept at a distance`);
				if (!r.figure || REAL_PEOPLE.test(r.figure)) errors.push(`mission ${m.id}: a staged ruler uses a licensed role figure`);
				if (r.label || r.role || r.dialogue) errors.push(`mission ${m.id}: a staged ruler has no label, role or dialogue`);
				for (const id of r.visible_during || []) if (!m.objectives.some((o) => o.id === id)) errors.push(`mission ${m.id}: ruler visible_during ${id} is not an objective`);
			}
		}
		for (const o of m.objectives || []) {
			const where = `objective ${o.id}`;
			if (!OBJECTIVES.has(o.kind)) errors.push(`${where}: unknown kind ${o.kind}`);
			checkStated(`${where} text`, o.text, o.why_facts, errors);
			checkStated(`${where} why`, o.why, o.why_facts, errors);
			needFacts(`${where} why`, o.why_facts);
			if (typeof o.text === "string" && VAGUE.test(o.text.trim())) errors.push(`${where}: "${o.text}" does not say what to do`);
			if (typeof o.text === "string" && o.text.length > MAX_ACTION) errors.push(`${where}: action is over ${MAX_ACTION} characters`);
			if (typeof o.why === "string" && o.why.length > MAX_WHY) errors.push(`${where}: why is over ${MAX_WHY} characters`);
			if (typeof o.why === "string" && typeof o.text === "string" && o.why.trim().toLowerCase() === o.text.trim().toLowerCase()) errors.push(`${where}: why only repeats the action`);
			const place = placeOf(o, npcs, records, rides);
			if (place !== undefined && !(Array.isArray(place) && place.length >= 2)) errors.push(`${where}: no marker position`);
			if (o.kind === "era") {
				const e = o.explain;
				if (!e?.title || !e.go || !e.lines?.length) errors.push(`${where}: an era shift needs an explain card with title, lines and go`);
				for (const [i, text] of [e?.title, e?.go, ...(e?.lines || [])].entries()) checkStated(`${where} explain[${i}]`, text, e?.facts, errors);
				needFacts(`${where} explain`, e?.facts);
				const last = m.objectives[m.objectives.length - 1] === o;
				const nextMission = data.missions[data.missions.indexOf(m) + 1];
				if (!o.arrive && !(last && nextMission?.where)) errors.push(`${where}: after the shift the player must be told where they are (arrive, or the next mission's where)`);
				if (o.arrive) {
					for (const [i, text] of [o.arrive.title, ...(o.arrive.lines || [])].entries()) checkStated(`${where} arrive[${i}]`, text, o.arrive.facts, errors);
					needFacts(`${where} arrive`, o.arrive.facts);
				}
			}
			if (o.kind === "restore") {
				if (!o.done?.title || !o.done?.why || !o.done?.facts?.length) errors.push(`${where}: a restoration needs a done card with title, why and fact ids`);
				checkStated(`${where} done title`, o.done?.title, o.done?.facts, errors);
				checkStated(`${where} done why`, o.done?.why, o.done?.facts, errors);
				needFacts(`${where} done`, o.done?.facts);
			}
			for (const b of o.beats || []) needBeat(where, b);
			if (o.beat) needBeat(where, o.beat);
			if (o.kind === "talk" && !npcs.has(o.npc)) errors.push(`${where}: unknown npc ${o.npc}`);
			if (o.kind === "record" && !records.has(o.record)) errors.push(`${where}: unknown record ${o.record}`);
			if (o.kind === "ride" && !rides.has(o.ride)) errors.push(`${where}: unknown ride ${o.ride}`);
			needFacts(where, o.facts);
			needNode(where, o.pano_node);
			checkCopy(where, o.caption, errors);
			checkCopy(where, o.label, errors);
			if (o.tier && !TIERS.has(o.tier)) errors.push(`${where}: unknown tier ${o.tier}`);
			if (BEAT_KINDS[o.kind] && types.get(o.beat) !== BEAT_KINDS[o.kind]) errors.push(`${where}: beat ${o.beat} is not a ${BEAT_KINDS[o.kind]} beat`);
			if (o.kind === "era" && !eraIds.has(o.to)) errors.push(`${where}: unknown era ${o.to}`);
			if (o.kind === "restore" && !o.classes?.length && !o.restoration) errors.push(`${where}: restores nothing`);
			if (o.restoration) {
				if (restorations && !restorations.has(o.restoration)) errors.push(`${where}: unknown restoration ${o.restoration}`);
				if (!o.pano_node) errors.push(`${where}: a restoration needs a pano_node`);
				if (!o.label || !o.facts?.length || !o.tier) errors.push(`${where}: a restoration needs a label, fact ids and a tier`);
			}
			if (o.kind === "sketch_compare") {
				if (!evidence.has(o.evidence)) errors.push(`${where}: unknown evidence ${o.evidence}`);
				if (!Array.isArray(o.at)) errors.push(`${where}: needs at`);
				if (!o.caption || !o.facts?.length || !o.tier) errors.push(`${where}: needs a caption, fact ids and a tier`);
			}
			if (o.kind === "look_at" && (!Array.isArray(o.target) || !Array.isArray(o.from) || !(o.hold_ms > 0))) errors.push(`${where}: needs target, from and hold_ms`);
			if (o.kind === "climb" && (!Array.isArray(o.at) || !o.pano_node)) errors.push(`${where}: needs at and pano_node`);
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
		const sitePath = join(ROOT, "public", "play", "packs", data.slug, `v${data.version}`, "site.json");
		const site = existsSync(sitePath) ? JSON.parse(readFileSync(sitePath, "utf8")) : null;
		const errors = validateMissions(data, story, site);
		const lines = Object.values(data.dialogue || {}).flat().filter((l) => !l.beat).length;
		console.log(`${data.slug}: ${data.missions.length} missions, ${lines} dialogue lines, ${errors.length} errors`);
		for (const e of errors) console.log("  " + e);
		failed += errors.length;
	}
	process.exit(failed ? 1 : 0);
}
