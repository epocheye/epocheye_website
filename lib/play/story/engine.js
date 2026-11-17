// Story engine for Epocheye Play. Pure functions, no React, no site-specific code.
// A level is site.json's `story`: chapters of beats, played in order.
//
// The beats of a chapter are compiled into STEPS. Most beats are one step. A run of
// consecutive "evidence" beats becomes one "look" step: the player finds them in any order.
//
// Beat types: line, lens, evidence, choice, restore, answer, know, hook, and
//   order   dated cards to put in order. A card speaks when it lands in its right place.
//   reveal  the full reveal: every viewpoint goes from NOW to THEN. Nothing is said.
//   proof   the switch that shows only what the record proves. Its `after` lines wait for it.
//   vote    a question with no right answer. The pick is kept as the player's vote.

export const LENSES = ["traveller", "builder", "scribe", "child"];

export function textFor(value, lens, fallback = "traveller") {
	if (value == null) return "";
	if (typeof value === "string") return value;
	return value[lens] ?? value[fallback] ?? Object.values(value)[0] ?? "";
}

// Spoken segments of a beat: [{ text, pace, pause_after_ms, clip }]
export function sayFor(beat) {
	if (!beat) return [];
	const base = { pace: beat.pace || "steady", pause_after_ms: beat.pause_after_ms ?? 600 };
	if (Array.isArray(beat.say)) return beat.say.map((s, i) => ({ ...base, clip: i === 0 ? beat.id : `${beat.id}-${i + 1}`, ...s }));
	if (typeof beat.say === "string") return [{ ...base, text: beat.say, clip: beat.clip || beat.id }];
	if (beat.silent || !beat.text) return [];
	return [{ ...base, text: textFor(beat.text, "traveller"), clip: beat.clip || beat.id }];
}

// What the voice actually says for a beat. Interface beats ("ui": true) are never spoken
// (brief 8.11 rule 8). Mirrors say_for() in tools/play/voice/common.py.
export function spokenFor(beat) {
	if (!beat || beat.ui) return [];
	return sayFor(beat);
}

// The sentences of a line, in order, each with its closing punctuation.
export function sentencesOf(text) {
	const out = [];
	const re = /[^.!?]*[.!?]+["'”’)\]]*(?=\s|$)/g;
	const src = String(text || "").trim();
	let last = 0;
	while (re.exec(src)) {
		// From the end of the last sentence, so a full stop inside a number ("3.5") loses nothing.
		const s = src.slice(last, re.lastIndex).trim();
		if (s) out.push(s);
		last = re.lastIndex;
	}
	const tail = src.slice(last).trim();
	if (tail) out.push(tail);
	return out;
}

// A line pages with its clips when its shown text has as many sentences as the beat has spoken
// segments: sentence i is shown as segment i starts. Returns the sentences, or null.
export function pagedSentences(beat, lens, fallback = "traveller") {
	if (!beat || beat.ui) return null;
	const count = spokenFor(beat).length;
	if (count < 2) return null;
	const sentences = sentencesOf(textFor(beat.text, lens, fallback));
	return sentences.length === count ? sentences : null;
}

function hashString(str) {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
	return h >>> 0;
}

// The cards of an order beat that the player places, in the right order: slot i holds slots[i].
export function orderSlots(beat) {
	return (beat?.cards || []).filter((c) => !c.gap);
}

// The same cards as they are dealt: shuffled, the same way every time for the same beat.
export function orderDeck(beat) {
	const cards = orderSlots(beat);
	const deck = [...cards];
	let seed = hashString(`${beat?.id || ""}:${cards.map((c) => c.id).join(",")}`) || 1;
	const next = () => {
		// mulberry32
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	for (let i = deck.length - 1; i > 0; i--) {
		const j = Math.floor(next() * (i + 1));
		[deck[i], deck[j]] = [deck[j], deck[i]];
	}
	// Never dealt already in order.
	if (deck.length > 1 && deck.every((c, i) => c === cards[i])) deck.push(deck.shift());
	return deck;
}

// An order beat as it reads once solved: every card in place, the gap cards between their neighbours.
export function orderRows(beat, placed) {
	const cards = beat?.cards || [];
	const solved = orderSlots(beat).every((c) => placed.includes(c.id));
	const rows = [];
	let slot = 0;
	for (const card of cards) {
		if (card.gap) {
			if (solved) rows.push({ card, gap: true });
			continue;
		}
		rows.push({ card, slot, placed: placed.includes(card.id) });
		slot++;
	}
	return rows;
}

// Every beat that can be told, with where it sits: top-level beats, the lines after a choice
// option, the cards of an order beat, and the lines after the proof switch.
function walkBeats(story, visit) {
	const each = (chapter, b) => {
		visit(chapter, b, null, b.type || "line");
		for (const o of b.options || []) for (const l of o.after || []) visit(chapter, l, `${b.id}/${o.id}`, "after");
		for (const c of b.cards || []) visit(chapter, c, b.id, c.gap ? "gap" : "card");
		if (b.type === "proof") for (const l of b.after || []) visit(chapter, l, b.id, "after");
	};
	for (const ch of story?.chapters || []) for (const b of ch.beats || []) each(ch.id, b);
	for (const b of story?.ending?.beats || []) each("ending", b);
}

// Every spoken segment in play order, including the `after` lines of choice options.
// Mirrors expand_story() in tools/play/voice/common.py. Used by the voice review page.
export function expandSpoken(story) {
	const out = [];
	walkBeats(story, (chapter, beat, parent, kind) => {
		for (const seg of spokenFor(beat)) {
			out.push({
				id: seg.clip, chapter, beat: beat.id, type: kind, role: beat.role || null, parent,
				text: seg.text, pace: seg.pace || "steady", pause_after_ms: seg.pause_after_ms ?? 600,
			});
		}
	});
	return out;
}

// Reading time with sound off: same pauses, text shown for a reading-speed duration.
export function readingMs(text) {
	const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
	return Math.max(900, Math.round((words / 3.3) * 1000));
}

export function compileChapter(chapter) {
	const steps = [];
	let look = null;
	for (const beat of chapter.beats || []) {
		if (beat.type === "evidence") {
			if (!look) {
				look = { kind: "look", id: `${chapter.id}:look:${steps.length}`, beats: [] };
				steps.push(look);
			}
			look.beats.push(beat);
			continue;
		}
		look = null;
		steps.push({ kind: beat.type, id: beat.id, beat });
	}
	return steps;
}

export function compileStory(story) {
	const chapters = (story?.chapters || []).map((ch, index) => ({ ...ch, index, steps: compileChapter(ch) }));
	if (story?.ending?.beats?.length) {
		const last = chapters[chapters.length - 1];
		if (last) {
			last.endingAt = last.steps.length; // the first step that belongs to the ending
			last.steps = last.steps.concat(compileChapter({ id: "ending", beats: story.ending.beats }));
		}
	}
	return chapters;
}

export function initialState({ lens = null, chapter = 0 } = {}) {
	return {
		lens,
		chapter,
		step: 0,
		found: [],          // evidence beat ids found in the current look step
		picked: null,       // option id picked in the current choice step
		afterIndex: 0,      // which explanation line is showing (after a choice, after the proof switch)
		placed: [],         // card ids set in their right place in the current order step
		pressed: false,     // the proof switch has been pressed in the current proof step
		choices: {},        // choice beat id -> first option picked (shown on the card)
		vote: null,         // option id of the player's vote
		restored: [],       // restoration ids restored so far
		revealed: false,    // the full reveal has played
		proof: false,       // the proof switch is on
		proofSeen: false,   // the player has met the proof switch, so it stays within reach
		chaptersDone: [],
		complete: false,
	};
}

const STEP_RESET = { found: [], picked: null, afterIndex: 0, placed: [], pressed: false };

export function currentStep(state, chapters) {
	return chapters[state.chapter]?.steps[state.step] || null;
}

// Arriving on the full reveal is the reveal: from here on the building is complete.
function arrive(state, chapters) {
	return currentStep(state, chapters)?.kind === "reveal" && !state.revealed ? { ...state, revealed: true } : state;
}

function nextStep(state, chapters) {
	const ch = chapters[state.chapter];
	if (!ch) return state;
	if (state.step + 1 < ch.steps.length) {
		return arrive({ ...state, ...STEP_RESET, step: state.step + 1 }, chapters);
	}
	const chaptersDone = state.chaptersDone.includes(ch.id) ? state.chaptersDone : [...state.chaptersDone, ch.id];
	if (state.chapter + 1 < chapters.length) {
		return arrive({ ...state, ...STEP_RESET, chaptersDone, chapter: state.chapter + 1, step: 0 }, chapters);
	}
	return { ...state, chaptersDone, complete: true };
}

// Which restorations should already be visible when a chapter (or a step in it) starts.
export function restoredBefore(chapters, chapterIndex, stepIndex = 0) {
	const ids = [];
	const take = (steps) => {
		for (const s of steps) if (s.kind === "restore" && s.beat.restoration) ids.push(s.beat.restoration);
	};
	for (const ch of chapters.slice(0, chapterIndex)) take(ch.steps);
	if (stepIndex > 0 && chapters[chapterIndex]) take(chapters[chapterIndex].steps.slice(0, stepIndex));
	return ids;
}

// Has the full reveal already played when a chapter (or a step in it) starts?
export function revealedBefore(chapters, chapterIndex, stepIndex = 0) {
	const has = (steps) => steps.some((s) => s.kind === "reveal");
	if (chapters.slice(0, chapterIndex).some((ch) => has(ch.steps))) return true;
	return stepIndex > 0 && !!chapters[chapterIndex] && has(chapters[chapterIndex].steps.slice(0, stepIndex));
}

// Deterministic reducer. Every action is something the player did.
export function reduce(state, action, chapters) {
	const step = currentStep(state, chapters);
	switch (action.type) {
		case "lens":
			return { ...state, lens: action.lens };
		case "jump": {
			// chapter list, deep link, or the debug view (which may name a step)
			const ch = chapters[action.chapter];
			if (!ch) return state;
			const at = Number.isInteger(action.step) && action.step > 0 && action.step < ch.steps.length ? action.step : 0;
			return arrive({
				...state, ...STEP_RESET, chapter: action.chapter, step: at, complete: false,
				restored: restoredBefore(chapters, action.chapter, at), revealed: revealedBefore(chapters, action.chapter, at),
			}, chapters);
		}
		case "end": // straight to the end of the level: everything restored, the reveal done
			return {
				...state, ...STEP_RESET, complete: true,
				restored: restoredBefore(chapters, chapters.length), revealed: revealedBefore(chapters, chapters.length),
			};
		case "advance": {
			if (!step) return state;
			if (step.kind === "look" && state.found.length < step.beats.length) return state;
			if (step.kind === "lens" && !state.lens) return state;
			if (step.kind === "restore" && !state.restored.includes(step.beat.restoration)) return state;
			if (step.kind === "order" && orderSlots(step.beat).some((c) => !state.placed.includes(c.id))) return state;
			if (step.kind === "vote" && !(step.beat.options || []).some((o) => o.id === state.vote)) return state;
			if (step.kind === "proof") {
				if (!state.pressed) return state; // its lines wait for the switch
				const after = step.beat.after || [];
				if (state.afterIndex + 1 < after.length) return { ...state, afterIndex: state.afterIndex + 1 };
			}
			if (step.kind === "choice") {
				const opt = step.beat.options.find((o) => o.id === state.picked);
				if (!opt) return state;
				const after = opt.after || [];
				if (state.afterIndex + 1 < after.length) return { ...state, afterIndex: state.afterIndex + 1 };
				if (!opt.accepted) return { ...state, picked: null, afterIndex: 0 }; // pick again
			}
			return nextStep(state, chapters);
		}
		case "find": {
			if (step?.kind !== "look" || state.found.includes(action.id)) return state;
			if (!step.beats.some((b) => b.id === action.id)) return state;
			return { ...state, found: [...state.found, action.id] };
		}
		case "pick": {
			if (step?.kind !== "choice" || state.picked) return state;
			if (!step.beat.options.some((o) => o.id === action.option)) return state;
			const choices = state.choices[step.beat.id] ? state.choices : { ...state.choices, [step.beat.id]: action.option };
			return { ...state, picked: action.option, afterIndex: 0, choices };
		}
		case "place": {
			// A card stays only in its own place. Anywhere else, nothing changes.
			if (step?.kind !== "order" || state.placed.includes(action.id)) return state;
			if (orderSlots(step.beat)[action.slot]?.id !== action.id) return state;
			return { ...state, placed: [...state.placed, action.id] };
		}
		case "vote": {
			if (step?.kind !== "vote" || state.vote === action.option) return state;
			if (!(step.beat.options || []).some((o) => o.id === action.option)) return state;
			return { ...state, vote: action.option };
		}
		case "restore": {
			if (state.restored.includes(action.id)) return state;
			return { ...state, restored: [...state.restored, action.id] };
		}
		case "reveal":
			return state.revealed ? state : { ...state, revealed: true };
		case "proof": {
			const on = !!action.on;
			const atStep = step?.kind === "proof";
			const first = atStep && !state.pressed;
			if (state.proof === on && !first) return state;
			return {
				...state, proof: on,
				proofSeen: state.proofSeen || atStep,
				pressed: state.pressed || atStep,
				afterIndex: first ? 0 : state.afterIndex,
			};
		}
		default:
			return state;
	}
}

// Flat list for the debug view: every beat with its fact ids.
export function debugBeats(story) {
	const rows = [];
	walkBeats(story, (chapter, b, parent, kind) => {
		rows.push({ chapter, id: b.id, type: kind, parent, text: textFor(b.text, "traveller"), facts: b.facts || [], say: spokenFor(b) });
	});
	return rows;
}

const SAVE_VERSION = 1;
export function saveKey(slug) {
	return `play:${slug}:v${SAVE_VERSION}`;
}

export function serialise(state) {
	const { lens, chapter, step, choices, vote, restored, chaptersDone, complete, revealed, proofSeen } = state;
	return JSON.stringify({ lens, chapter, step, choices, vote, restored, chaptersDone, complete, revealed, proofSeen });
}

// Reads a save. The player comes back to the step they were on, at its start.
export function restore(json, chapters) {
	try {
		const s = JSON.parse(json);
		if (!s || typeof s.chapter !== "number" || s.chapter < 0 || s.chapter >= chapters.length) return null;
		const steps = chapters[s.chapter].steps;
		const step = Number.isInteger(s.step) && s.step > 0 && s.step < steps.length ? s.step : 0;
		const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
		const choices = {};
		if (s.choices && typeof s.choices === "object" && !Array.isArray(s.choices)) {
			for (const [k, v] of Object.entries(s.choices)) if (typeof v === "string") choices[k] = v;
		}
		return {
			...initialState(),
			lens: typeof s.lens === "string" ? s.lens : null,
			chapter: s.chapter,
			step,
			choices,
			vote: typeof s.vote === "string" ? s.vote : null,
			restored: list(s.restored),
			chaptersDone: list(s.chaptersDone),
			complete: !!s.complete,
			revealed: !!s.revealed,
			proofSeen: !!s.proofSeen,
		};
	} catch {
		return null;
	}
}
