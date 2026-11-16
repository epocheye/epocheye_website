// Story engine for Epocheye Play. Pure functions, no React, no site-specific code.
// A level is site.json's `story`: chapters of beats, played in order.
//
// The beats of a chapter are compiled into STEPS. Most beats are one step. A run of
// consecutive "evidence" beats becomes one "look" step: the player finds them in any order.

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

// Every spoken segment in play order, including the `after` lines of choice options.
// Mirrors expand_story() in tools/play/voice/common.py. Used by the voice review page.
export function expandSpoken(story) {
	const out = [];
	const push = (chapter, beat, parent, kind) => {
		for (const seg of spokenFor(beat)) {
			out.push({
				id: seg.clip, chapter, beat: beat.id, type: kind || beat.type || "line", role: beat.role || null, parent,
				text: seg.text, pace: seg.pace || "steady", pause_after_ms: seg.pause_after_ms ?? 600,
			});
		}
		for (const o of beat.options || []) for (const l of o.after || []) push(chapter, l, `${beat.id}/${o.id}`, "after");
	};
	for (const ch of story?.chapters || []) for (const b of ch.beats || []) push(ch.id, b, null);
	for (const b of story?.ending?.beats || []) push("ending", b, null);
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
		if (last) last.steps = last.steps.concat(compileChapter({ id: "ending", beats: story.ending.beats }));
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
		afterIndex: 0,      // which explanation line of the picked option is showing
		choices: {},        // choice beat id -> first option picked (shown on the card)
		restored: [],       // restoration ids restored so far
		revealed: false,    // the full reveal has played
		proof: false,
		chaptersDone: [],
		complete: false,
	};
}

function nextStep(state, chapters) {
	const ch = chapters[state.chapter];
	if (!ch) return state;
	if (state.step + 1 < ch.steps.length) {
		return { ...state, step: state.step + 1, found: [], picked: null, afterIndex: 0 };
	}
	const chaptersDone = state.chaptersDone.includes(ch.id) ? state.chaptersDone : [...state.chaptersDone, ch.id];
	if (state.chapter + 1 < chapters.length) {
		return { ...state, chaptersDone, chapter: state.chapter + 1, step: 0, found: [], picked: null, afterIndex: 0 };
	}
	return { ...state, chaptersDone, complete: true };
}

export function currentStep(state, chapters) {
	return chapters[state.chapter]?.steps[state.step] || null;
}

// Deterministic reducer. Every action is something the player did.
export function reduce(state, action, chapters) {
	const step = currentStep(state, chapters);
	switch (action.type) {
		case "lens":
			return { ...state, lens: action.lens };
		case "jump": // chapter list or deep link
			return { ...state, chapter: action.chapter, step: 0, found: [], picked: null, afterIndex: 0, complete: false };
		case "advance": {
			if (!step) return state;
			if (step.kind === "look" && state.found.length < step.beats.length) return state;
			if (step.kind === "lens" && !state.lens) return state;
			if (step.kind === "restore" && !state.restored.includes(step.beat.restoration)) return state;
			if (step.kind === "order" && !action.solved) return state;
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
		case "restore": {
			if (state.restored.includes(action.id)) return state;
			return { ...state, restored: [...state.restored, action.id] };
		}
		case "reveal":
			return { ...state, revealed: true };
		case "proof":
			return { ...state, proof: !!action.on };
		default:
			return state;
	}
}

// Which restorations should already be visible when a chapter starts (replay, deep link).
export function restoredBefore(chapters, chapterIndex) {
	const ids = [];
	for (const ch of chapters.slice(0, chapterIndex)) {
		for (const s of ch.steps) if (s.kind === "restore" && s.beat.restoration) ids.push(s.beat.restoration);
	}
	return ids;
}

// Flat list for the debug view: every beat with its fact ids.
export function debugBeats(story) {
	const rows = [];
	const push = (chapter, b, parent) => {
		rows.push({ chapter, id: b.id, type: b.type || "line", parent, text: textFor(b.text, "traveller"), facts: b.facts || [], say: spokenFor(b) });
		for (const o of b.options || []) for (const l of o.after || []) push(chapter, { ...l, type: "after" }, `${b.id}/${o.id}`);
	};
	for (const ch of story?.chapters || []) for (const b of ch.beats || []) push(ch.id, b, null);
	for (const b of story?.ending?.beats || []) push("ending", b, null);
	return rows;
}

const SAVE_VERSION = 1;
export function saveKey(slug) {
	return `play:${slug}:v${SAVE_VERSION}`;
}

export function serialise(state) {
	const { lens, chapter, choices, restored, chaptersDone, complete, revealed } = state;
	return JSON.stringify({ lens, chapter, choices, restored, chaptersDone, complete, revealed });
}

export function restore(json, chapters) {
	try {
		const s = JSON.parse(json);
		if (typeof s.chapter !== "number" || s.chapter < 0 || s.chapter >= chapters.length) return null;
		return { ...initialState(), ...s, step: 0 };
	} catch {
		return null;
	}
}
