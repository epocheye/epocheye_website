"use client";

// One level of Epocheye Play. Owns the story state (lib/play/story/engine.js), the local save,
// narration timing, and the layout: panorama behind, story panel at the bottom.
// No site-specific code: everything shown comes from site.json.

import Link from "next/link";
import { useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import {
	currentStep, initialState, orderSlots, pagedSentences, reduce, restore as restoreSave, restoredBefore, revealedBefore, saveKey, serialise,
	spokenFor, textFor,
} from "@/lib/play/story/engine";
import { clipUsable, createNarrator, discoverVoices } from "@/lib/play/audio";
import { ensurePlayer, reportGame, setQuiet } from "@/lib/play/api";
import { captureArrival } from "@/lib/play/player";
import { directionFrom, nodeById } from "@/lib/play/pack";
import { Icon, Pill, Switch } from "@/components/play/ui";
import { usePlayFeatures } from "@/components/play/PlayFeatures";
import StoryPanel from "@/components/play/StoryPanel";
import EndScreen, { endView } from "@/components/play/EndScreen";
import { voteOptionsOf } from "@/components/play/YearVoteShares";
import { ChaptersSheet, CreditsSheet, DebugSheet, EvidenceSheet, NoteSheet, SourcesSheet } from "@/components/play/LevelSheets";
import PanoViewer from "@/components/play/engine/PanoViewer";

// The panorama engine is part of the level's first scripts, not loaded on demand: the first view
// cannot happen without it, and fetching it after the page had started cost about a second on a
// slow phone (docs/play/QUALITY.md). The piece canvas stays on demand (StoryPanel.jsx).

// After the full reveal has settled the voice stays silent this long, then the next beat plays
// (brief 8.11). A reveal beat may set its own pause_after_ms.
const REVEAL_HOLD_MS = 1500;
// If the picture never reports that the reveal has settled, the story still moves on.
const REVEAL_SAFETY_MS = 12000;

// Where a chapter starts. A chapter whose viewpoint is not in this pack stays on the viewpoint
// the player is standing on; the debug view says so, the player is told nothing.
function startView(site, chapter, prev) {
	const want = chapter?.start_node || null;
	const found = want ? nodeById(site, want) : null;
	const n = prev ? prev.n + 1 : 0;
	if (found) return { view: { node: found.id, look: null, n }, missing: null };
	const missing = want ? { chapter: chapter.id, node: want } : null;
	const here = prev ? nodeById(site, prev.node) : null;
	if (missing && here) return { view: prev, missing };
	const node = nodeById(site, site.site.start_node) || site.nodes[0];
	return { view: { node: node.id, look: null, n }, missing };
}

const atReveal = (game, chapters) => currentStep(game, chapters)?.kind === "reveal";

function init({ slug, site, chapters, startChapter }) {
	let game = initialState();
	let screen = "play";
	let linked = false;
	try {
		const saved = restoreSave(window.localStorage.getItem(saveKey(slug)), chapters);
		if (saved) game = saved;
	} catch {
		// Private mode or storage disabled: play without a save.
	}
	if (startChapter != null && chapters[startChapter]) {
		// A ?ch link: start that chapter, with what came before it restored.
		game = reduce(game, { type: "jump", chapter: startChapter }, chapters);
		linked = true;
	} else if (game.complete) {
		// Finished: the end screen, with everything the level restored still in place.
		screen = "done";
		game = { ...game, restored: restoredBefore(chapters, chapters.length), revealed: revealedBefore(chapters, chapters.length) };
	} else {
		// The stop before a preview is kept across a reload: the same rule as in the reducer below.
		const before = chapters[game.chapter - 1];
		if (game.step === 0 && chapters[game.chapter].preview && before && !before.preview && game.chaptersDone.includes(before.id)) screen = "done";
		// Back on the step the player left, with what came before it in place.
		game = { ...game, restored: restoredBefore(chapters, game.chapter, game.step), revealed: revealedBefore(chapters, game.chapter, game.step) };
		if (screen === "play" && atReveal(game, chapters)) game = reduce(game, { type: "reveal" }, chapters);
	}
	const start = startView(site, chapters[game.chapter], null);
	return {
		ctx: { site, chapters },
		game,
		screen,
		held: linked ? game : null, // the state a ?ch link opened with: it is not saved until the player does something
		view: start.view,
		missing: start.missing, // { chapter, node }: a chapter whose start viewpoint this pack does not have
		open: null,      // evidence beat whose card is open in a Look step
		tried: {},       // choice beat id -> option ids already tried
		miss: null,      // { id, slot, n }: the last card put where it does not go, in an Order step
		noteSeen: false, // the chapter's side note has been opened
		revealing: null, // restoration whose reveal is playing
		full: screen === "play" && atReveal(game, chapters) ? "fading" : null, // the full reveal: "fading", then "settled"
		debugAll: false, // debug view: THEN everywhere
	};
}

function levelReducer(s, a) {
	const { site, chapters } = s.ctx;
	const moveTo = (next, game) => {
		const start = startView(site, chapters[game.chapter], s.view);
		next.view = start.view;
		next.missing = start.missing;
		next.tried = {};
		next.noteSeen = false;
	};
	const story = (action) => {
		const prev = s.game;
		const game = reduce(prev, action, chapters);
		if (game === prev) return s;
		const next = { ...s, game };
		if (game.step !== prev.step || game.chapter !== prev.chapter) {
			next.open = null;
			next.miss = null;
			next.full = !game.complete && atReveal(game, chapters) ? "fading" : null;
		}
		if (game.chapter !== prev.chapter) {
			moveTo(next, game);
			// The chapters that count are finished. Stop before any preview.
			if (chapters[game.chapter].preview && !chapters[prev.chapter].preview) next.screen = "done";
		}
		if (game.complete && !prev.complete) {
			next.screen = "done";
			next.full = null;
		}
		return next;
	};
	const aimed = (nodeId, a2) => {
		const node = nodeById(site, nodeId);
		const look = a2.look || (a2.target && node ? directionFrom(node, a2.target) : null);
		return { node: nodeId, look, n: s.view.n + 1 };
	};
	switch (a.type) {
		case "advance": {
			const step = currentStep(s.game, chapters);
			const next = story({ type: "advance" });
			// A pick the evidence rules out comes back to the options, marked as tried.
			if (step?.kind === "choice" && s.game.picked && next.game.chapter === s.game.chapter && next.game.step === s.game.step && !next.game.picked) {
				const id = step.beat.id;
				const list = s.tried[id] || [];
				return { ...next, tried: { ...s.tried, [id]: list.includes(s.game.picked) ? list : [...list, s.game.picked] } };
			}
			return next;
		}
		case "lens": {
			const next = story({ type: "lens", lens: a.lens });
			return a.advance && currentStep(next.game, chapters)?.kind === "lens" ? levelReducer(next, { type: "advance" }) : next;
		}
		case "find": {
			const step = currentStep(s.game, chapters);
			if (step?.kind !== "look" || !step.beats.some((b) => b.id === a.id)) return s;
			return { ...story({ type: "find", id: a.id }), open: a.id };
		}
		case "close":
			return s.open ? { ...s, open: null } : s;
		case "pick":
			return story({ type: "pick", option: a.option });
		case "place": {
			if (currentStep(s.game, chapters)?.kind !== "order") return s;
			const next = story({ type: "place", id: a.id, slot: a.slot });
			// Not its place: the card goes back, and the board says so.
			if (next === s) return { ...s, miss: { id: a.id, slot: a.slot, n: (s.miss?.n || 0) + 1 } };
			return { ...next, miss: null };
		}
		case "vote":
			return story({ type: "vote", option: a.option });
		case "restore": {
			const next = story({ type: "restore", id: a.id });
			if (next === s) return s;
			return { ...next, revealing: a.id, view: a.look ? aimed(s.view.node, a) : next.view };
		}
		case "revealed":
			return s.revealing === a.id ? { ...s, revealing: null } : s;
		case "fullDone":
			return s.full === "fading" ? { ...s, full: "settled" } : s;
		case "jump": {
			if (!chapters[a.chapter]) return s;
			const game = reduce(s.game, { type: "jump", chapter: a.chapter, step: a.step }, chapters);
			const next = { ...s, game, screen: "play", open: null, miss: null, revealing: null, full: atReveal(game, chapters) ? "fading" : null };
			moveTo(next, game);
			return next;
		}
		case "end": {
			// The end screen. From the chapter list it needs every chapter finished; the debug view may force it.
			const required = chapters.filter((c) => !c.preview);
			if (!a.force && !required.every((c) => s.game.chaptersDone.includes(c.id))) return s;
			return { ...s, game: reduce(s.game, { type: "end" }, chapters), screen: "done", open: null, miss: null, revealing: null, full: null };
		}
		case "go":
			return nodeById(site, a.node) ? { ...s, view: aimed(a.node, a) } : s;
		case "aim":
			return { ...s, view: aimed(s.view.node, a) };
		case "note":
			return { ...s, noteSeen: true };
		case "proof":
			return story({ type: "proof", on: a.on });
		case "revealAll":
			return { ...s, debugAll: !!a.on };
		default:
			return s;
	}
}

// What is being told right now, as a string. The narration effect keys on it, so a line is
// spoken once and unrelated state changes do not restart it.
function unitKey(s) {
	if (s.screen !== "play") return "";
	const g = s.game;
	const step = currentStep(g, s.ctx.chapters);
	if (!step) return "";
	const base = `${g.chapter}|${g.step}`;
	if (step.kind === "look") return s.open ? `${base}|ev|${s.open}` : "";
	if (step.kind === "choice") {
		return g.picked ? `${base}|after|${g.picked}|${g.afterIndex}` : `${base}|q|${(s.tried[step.beat.id] || []).length}`;
	}
	// Once the piece is set in place the picture changes, and nothing is said over that (brief 8.11
	// rule 1). The key goes empty, which also stops a line that was still being spoken.
	if (step.kind === "restore" && g.restored.includes(step.beat.restoration)) return "";
	// The full reveal: silence for the whole of it.
	if (step.kind === "reveal") return "";
	// A card speaks when it lands in its place. Before the first, there is only the instruction.
	if (step.kind === "order" && g.placed.length) return `${base}|card|${g.placed[g.placed.length - 1]}|${g.placed.length}`;
	// The lines after the proof switch wait for the switch.
	if (step.kind === "proof" && g.pressed) return `${base}|after|proof|${g.afterIndex}`;
	return `${base}|beat`;
}

// The beats told for a key, in order. Nearly always one. The last card of an Order step is
// followed by the step's gap cards: what the record does not say, between its neighbours.
function toldBeats(chapters, key) {
	if (!key) return [];
	const [c, st, kind, a, b] = key.split("|");
	const step = chapters[Number(c)]?.steps[Number(st)];
	if (!step) return [];
	if (kind === "ev") return [step.beats?.find((x) => x.id === a)].filter(Boolean);
	if (kind === "after") {
		const lines = step.kind === "proof" ? step.beat?.after : step.beat?.options?.find((o) => o.id === a)?.after;
		return [lines?.[Number(b)]].filter(Boolean);
	}
	if (kind === "card") {
		const cards = step.beat?.cards || [];
		const card = cards.find((x) => x.id === a && !x.gap);
		if (!card) return [];
		const solved = Number(b) >= orderSlots(step.beat).length;
		return solved ? [card, ...cards.filter((x) => x.gap)] : [card];
	}
	if (kind === "q" && Number(a) > 0) return []; // back at the options: the question is not asked twice
	return [step.beat].filter(Boolean);
}

function beatSegments(beat, lens, defaultLens) {
	const spoken = spokenFor(beat);
	if (lens !== defaultLens) {
		// Only the default telling is recorded (brief 5.8). Another lens shows other words, so the
		// voice stays out of it: the words on screen get reading time, then the pause the line was given.
		if (beat.ui || !beat.text) return [];
		const sentences = pagedSentences(beat, lens, defaultLens);
		if (sentences) return sentences.map((text, i) => ({ text, pause_after_ms: spoken[i].pause_after_ms ?? 0, clip: null }));
		const pause = spoken.length ? spoken[spoken.length - 1].pause_after_ms ?? 0 : 0;
		return [{ text: textFor(beat.text, lens, defaultLens), pause_after_ms: pause, clip: null }];
	}
	if (spoken.length) return spoken;
	// Unspoken story text still gets a reading-speed beat before "continue" stands out.
	if (!beat.ui && beat.text) return [{ text: textFor(beat.text, defaultLens), pause_after_ms: 0, clip: null }];
	return [];
}

// Everything the narration of one key needs: its segments, and for each told beat where its
// segments start and the sentences to page through when its line pages with its clips.
function telling(chapters, key, lens, defaultLens) {
	const segments = [];
	const parts = [];
	for (const beat of toldBeats(chapters, key)) {
		const own = beatSegments(beat, lens, defaultLens);
		const sentences = pagedSentences(beat, lens, defaultLens);
		parts.push({ beat, from: segments.length, count: own.length, sentences: sentences && sentences.length === own.length ? sentences : null });
		segments.push(...own);
	}
	return { segments, parts };
}

// First clips of the lines most likely to be told next, most likely first, so they can be
// fetched while the current line is still being read.
function upcomingClips(chapters, key) {
	if (!key) return [];
	const [c, st, kind, a, b] = key.split("|");
	const ci = Number(c);
	const si = Number(st);
	const step = chapters[ci]?.steps[si];
	if (!step) return [];
	const first = (beat) => spokenFor(beat)[0]?.clip;
	const ofStep = (s2) => {
		if (!s2) return [];
		if (s2.kind === "look") return s2.beats.map(first);
		if (s2.kind === "order") return orderSlots(s2.beat).map(first);
		return [first(s2.beat)];
	};
	const next = chapters[ci].steps[si + 1] || chapters[ci + 1]?.steps[0];
	let ids = [];
	if (kind === "ev") ids = step.beats.filter((x) => x.id !== a).map(first);
	else if (kind === "q") ids = (step.beat.options || []).map((o) => first(o.after?.[0]));
	else if (kind === "after") {
		const after = (step.kind === "proof" ? step.beat.after : step.beat.options?.find((o) => o.id === a)?.after) || [];
		ids = [first(after[Number(b) + 1])];
	} else if (kind === "card") ids = (step.beat.cards || []).filter((x) => x.id !== a).map(first);
	else if (step.kind === "order") ids = orderSlots(step.beat).map(first);
	else if (step.kind === "proof") ids = [first(step.beat.after?.[0])];
	return [...new Set([...ids, ...ofStep(next)].filter(Boolean))].slice(0, 6);
}

// Every clip a chapter can speak: the lines after a choice or the proof switch, and the cards.
function chapterClips(chapter) {
	const ids = [];
	const add = (beat) => {
		for (const sg of spokenFor(beat)) ids.push(sg.clip);
		for (const o of beat?.options || []) for (const l of o.after || []) add(l);
		for (const card of beat?.cards || []) add(card);
		if (beat?.type === "proof") for (const l of beat.after || []) add(l);
	};
	for (const st of chapter?.steps || []) for (const beat of st.beats || [st.beat]) add(beat);
	return ids;
}

function chapterLine(c) {
	if (!c) return "";
	if (c.preview) return c.title;
	return `${c.n === 0 ? "Prologue" : `Chapter ${c.n ?? c.index}`} · ${c.title}`;
}

export default function Level({ slug, version, site, chapters, urls, startChapter = null, debug = false }) {
	const [s, dispatch] = useReducer(levelReducer, { slug, site, chapters, startChapter }, init);
	const [narrator] = useState(() => createNarrator(urls));
	const [soundOn, setSoundOn] = useState(false);
	const [voice, setVoice] = useState({ checked: false, id: null, clips: null });
	const [readyKey, setReadyKey] = useState("");
	const [seg, setSeg] = useState({ key: "", i: 0 }); // which segment of the current telling has started
	const [sheet, setSheet] = useState(null); // null | "chapters" | "credits" | "note" | "evidence" | "debug" | { beat }
	// PLAY_NARRATION off (lib/play/features.js): no Sound button, so sound is never on and no clip
	// is fetched. The directed pauses still run on reading time.
	const { narration } = usePlayFeatures();

	const story = site.story;
	const g = s.game;
	const chapter = chapters[g.chapter];
	const step = currentStep(g, chapters);
	const defaultLens = story.default_lens || "traveller";
	const lens = g.lens || defaultLens;
	const node = nodeById(site, s.view.node) || site.nodes[0];
	const key = unitKey(s);
	// A line is "ready" once its telling has finished under the current sound setting and lens.
	const tellKey = `${key}#${soundOn ? voice.id || "silent" : "off"}#${lens}`;
	const ready = key === "" || readyKey === tellKey;

	// Text that pages with its clips: sentence i is shown as segment i starts. Once the telling is
	// over (or the player has tapped past it) the end of the text is on screen.
	const tell = telling(chapters, key, lens, defaultLens);
	const segAt = seg.key === tellKey ? seg.i : 0;
	const lastSeg = Math.max(0, tell.segments.length - 1);
	const shownSeg = ready ? lastSeg : Math.min(segAt, lastSeg);
	// The told beat the current segment belongs to. Nearly always the only one.
	const part = tell.parts.filter((p) => p.count > 0 && p.from <= shownSeg).pop() || tell.parts[0] || null;
	const paging = part?.sentences ? { id: part.beat.id, sentences: part.sentences, upto: shownSeg - part.from } : null;
	// More of this telling is still to come on screen: a tap shows the rest before it moves on.
	const moreText = !ready && shownSeg < lastSeg && (tell.parts.length > 1 || !!part?.sentences);

	// Save after every chapter (and whenever the story state changes: a reload comes back to the step).
	// A level opened from a ?ch link is not saved until the player does something in it, so
	// following a shared link does not move their own place in the story.
	const held = s.held;
	useEffect(() => {
		if (g === held) return;
		try {
			window.localStorage.setItem(saveKey(slug), serialise(g));
		} catch {
			// No storage: nothing to do.
		}
	}, [slug, g, held]);

	// Tell the current line: its clips with the directed pauses, or the same pauses on reading time.
	useEffect(() => {
		if (!key) return undefined;
		const cancel = narrator.play(telling(chapters, key, lens, defaultLens).segments, {
			onSegment: (_seg, i) => {
				if (i > 0) setSeg({ key: tellKey, i });
			},
			onDone: () => setReadyKey(tellKey),
		});
		narrator.preload(lens === defaultLens ? upcomingClips(chapters, key) : []);
		return () => {
			cancel();
			// This telling is over. If the same line comes round again (a replay), it is told afresh.
			setReadyKey((k) => (k === tellKey ? "" : k));
			setSeg((sg) => (sg.key === tellKey ? { key: "", i: 0 } : sg));
		};
	}, [narrator, chapters, key, tellKey, lens, defaultLens]);

	useEffect(() => () => narrator.dispose(), [narrator]);

	// The server side of the level (lib/play/api.js). Nothing is recorded in the debug view.
	useEffect(() => {
		setQuiet(debug);
		return () => setQuiet(false);
	}, [debug]);

	// Make sure the server knows this anonymous player, once the first view is up.
	useEffect(() => {
		captureArrival();
		const timer = setTimeout(() => ensurePlayer(), 1500);
		return () => clearTimeout(timer);
	}, []);

	// Report what changed in the story: chapters started and finished, choices, lens, proof switch,
	// the year vote and the end of the run. Only real changes: a re-render with the same state
	// reports nothing.
	const reported = useRef(null);
	const screen = s.screen;
	useEffect(() => {
		const prev = reported.current;
		reported.current = g;
		reportGame(prev, g, { slug, chapters, screen });
	}, [g, slug, chapters, screen]);

	// The full reveal. While the picture crossfades nothing is said. Once it has settled the
	// silence holds a little longer, then the story moves on by itself.
	const full = s.screen === "play" && step?.kind === "reveal" ? s.full : null;
	const revealHold = step?.kind === "reveal" ? step.beat.pause_after_ms ?? REVEAL_HOLD_MS : REVEAL_HOLD_MS;
	useEffect(() => {
		if (!full) return undefined;
		const settled = full === "settled";
		const timer = setTimeout(() => dispatch({ type: settled ? "advance" : "fullDone" }), settled ? revealHold : REVEAL_SAFETY_MS);
		return () => clearTimeout(timer);
	}, [full, revealHold]);

	// For the debug view and for checks: lets a test ask whether the voice is speaking.
	useEffect(() => {
		if (!debug) return undefined;
		window.__playNarrator = narrator;
		return () => {
			if (window.__playNarrator === narrator) delete window.__playNarrator;
		};
	}, [debug, narrator]);

	// Continue. A first tap on a line that is still paging shows the end of its text and stops the
	// voice; the next tap moves on.
	const advance = () => {
		if (s.screen !== "play" || !step) return;
		if (moreText) {
			narrator.stop();
			setReadyKey(tellKey);
			return;
		}
		if (step.kind === "look" && s.open) dispatch({ type: "close" });
		else if (step.kind === "restore" && s.revealing) return;
		else if (step.kind === "reveal") return; // the reveal is not skipped
		else dispatch({ type: "advance" });
	};

	// Space or Enter continues, unless a control or a sheet has the key.
	const onContinueKey = useEffectEvent((e) => {
		if ((e.key !== " " && e.key !== "Enter") || e.repeat || e.defaultPrevented || sheet) return;
		const t = e.target;
		if (t instanceof Element && t.closest("button, a, input, select, textarea, summary, .play-piece-canvas")) return;
		if (s.screen !== "play" || !step) return;
		e.preventDefault();
		advance();
	});
	useEffect(() => {
		const onKey = (e) => onContinueKey(e);
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const toggleSound = () => {
		const on = !soundOn;
		narrator.setEnabled(on);
		if (on) {
			narrator.unlock();
			if (!voice.checked) {
				discoverVoices(urls).then((found) => {
					const v = found.voices.find((x) => x.id === found.default && x.manifest) || null;
					if (v) narrator.setVoice(v.id, v.clips, true);
					setVoice({ checked: true, id: v ? v.id : null, clips: v ? v.clips : null });
				});
			}
		}
		setSoundOn(on);
	};

	// Hotspots: ways to move, evidence on this viewpoint, and where a restoration goes.
	const hotspots = [];
	if (s.screen === "play") {
		for (const id of node.links || []) {
			const to = nodeById(site, id);
			const dir = to && directionFrom(node, to.loc);
			if (dir) hotspots.push({ id: `move:${id}`, kind: "move", dir, node: id, label: `Go to ${to.name}`, text: to.name });
		}
		if (step?.kind === "look") {
			for (const b of step.beats) {
				if (b.at?.node !== node.id) continue;
				const dir = directionFrom(node, b.at.target);
				if (!dir) continue;
				const done = g.found.includes(b.id);
				const title = (story.evidence || []).find((e) => e.id === b.evidence)?.title;
				hotspots.push({ id: `ev:${b.id}`, kind: "evidence", dir, beat: b.id, done, label: done ? `${title || "Evidence"}. Found. Open again` : "Evidence to find", text: done ? title : null });
			}
		}
		if (step?.kind === "restore" && !g.restored.includes(step.beat.restoration)) {
			const r = (site.restorations || []).find((x) => x.id === step.beat.restoration);
			const dir = r?.target && directionFrom(node, r.target);
			if (dir) hotspots.push({ id: `re:${r.id}`, kind: "restore", dir, label: `Where it goes: ${r.name}`, text: null });
		}
	}
	const onHotspot = (h) => {
		if (h.kind === "move") dispatch({ type: "go", node: h.node });
		else if (h.kind === "evidence") dispatch({ type: "find", id: h.beat });
		else dispatch({ type: "aim", look: h.dir });
	};

	// Why the player may be hearing nothing although sound is on. One plain line, or none.
	let soundNote = "";
	if (soundOn && voice.checked && s.screen === "play") {
		if (!voice.id) soundNote = "There is no narration in this pack yet. The pauses still run.";
		else if (lens !== defaultLens) {
			const name = (story.lenses || []).find((l) => l.id === defaultLens)?.name;
			soundNote = name ? `Narration is in the ${name} telling only. The pauses still run.` : "This telling has no narration. The pauses still run.";
		} else {
			const ids = chapterClips(chapter);
			const silent = ids.filter((id) => !clipUsable(voice.clips?.get(id))).length;
			if (ids.length && silent === ids.length) soundNote = "This part of the story has no narration yet. The pauses still run.";
			else if (silent) soundNote = "Some lines in this part have no narration yet.";
		}
	}

	const closeSheet = () => {
		if (sheet === "note") dispatch({ type: "note" });
		setSheet(null);
	};

	// The end of the level: the card, when this pack's story has one.
	const card = s.screen === "done" ? endView(site, lens, g) : null;

	// Once the player has met the proof switch it stays within reach for the rest of the level,
	// under the place labels. Its wording is the pack's own.
	let proofBeat = null;
	for (const c of chapters) proofBeat = proofBeat || c.steps.find((st) => st.kind === "proof")?.beat || null;
	const proofInPanel = s.screen === "play" && step?.kind === "proof";
	const proofLabel = proofBeat ? textFor(proofBeat.toggle_label, lens, defaultLens) : "";
	const showProof = g.proofSeen && !!proofLabel && !proofInPanel;

	// An open evidence card, the Restore step and the Order step fill most of a short screen. The
	// look controls are not needed for any of them, so on short screens they step aside (see play.css).
	const tallPanel =
		s.screen === "play" &&
		((step?.kind === "look" && !!s.open) || (step?.kind === "restore" && !g.restored.includes(step.beat.restoration)) || step?.kind === "order");

	return (
		<div className={`play-level${tallPanel ? " is-panel-tall" : ""}${s.screen === "play" && step?.kind === "order" ? " is-ordering" : ""}${card ? " is-ended" : ""}`}>
			<PanoViewer
				site={site.site}
				urls={urls}
				node={node}
				state={chapter?.state || "now"}
				view={s.view}
				restored={g.restored}
				animateId={s.revealing}
				onRevealDone={(id) => dispatch({ type: "revealed", id })}
				revealAll={s.debugAll || g.revealed}
				animateAll={full === "fading"}
				onAllDone={() => dispatch({ type: "fullDone" })}
				proof={g.proof}
				preloadThen={step?.kind === "restore" || step?.kind === "reveal" || chapter?.steps[g.step + 1]?.kind === "reveal"}
				hotspots={hotspots}
				onHotspot={onHotspot}
				debug={debug}
			/>

			<header className="play-top">
				<div className="play-top-row">
					<Link href="/play" className="play-back" aria-label="Back to all sites" prefetch={false}>
						<Icon name="left" size={16} />
						<span>Sites</span>
					</Link>
					<div className="play-top-actions">
						{narration ? (
							<Pill small aria-pressed={soundOn} onClick={toggleSound} aria-label={soundOn ? "Sound is on. Turn sound off" : "Sound is off. Turn sound on"}>
								{soundOn ? "Sound on" : "Sound off"}
							</Pill>
						) : null}
						<Pill small onClick={() => setSheet("chapters")}>
							Chapters
						</Pill>
						<Pill small onClick={() => setSheet("credits")}>
							Credits
						</Pill>
						{debug ? (
							<Pill small onClick={() => setSheet("debug")}>
								Debug
							</Pill>
						) : null}
					</div>
				</div>
				<div className="play-where">
					<span className="play-where-site">{site.site.name}</span>
					<span className="play-where-chapter">{s.screen === "done" ? story.title : chapterLine(chapter)}</span>
					<span className="play-where-node">{(s.screen === "done" ? [node.name] : [chapter?.years, node.name]).filter(Boolean).join(" · ")}</span>
				</div>
				{showProof ? <Switch compact className="play-top-proof" label={proofLabel} on={g.proof} onChange={(on) => dispatch({ type: "proof", on })} /> : null}
				<p className="play-note" role="status" aria-live="polite">
					{soundNote}
				</p>
			</header>
			{debug ? (
				<p className="play-debug-line" aria-hidden="true" data-tell={key} data-seg={shownSeg} data-ready={ready ? "1" : "0"} data-full={s.full || ""}>
					{`tell ${key || "(silent)"}  seg ${tell.segments.length ? shownSeg + 1 : 0}/${tell.segments.length}  ${ready ? "ready" : "telling"}${s.full ? `  reveal ${s.full}` : ""}`}
					{s.missing ? `  start node "${s.missing.node}" of ${s.missing.chapter} is not in this pack: stayed on ${s.view.node}` : ""}
				</p>
			) : null}

			{card ? (
				<EndScreen slug={slug} version={version} view={card} game={g} voteOptions={card.vote ? voteOptionsOf(story, lens, defaultLens) : []} />
			) : (
				<StoryPanel
					slug={slug}
					site={site}
					urls={urls}
					chapters={chapters}
					state={s}
					lens={lens}
					ready={ready}
					paging={paging}
					telling={part?.beat?.id || null}
					advance={advance}
					dispatch={dispatch}
					onSources={(beat) => setSheet({ beat })}
					onSheet={setSheet}
				/>
			)}

			{sheet === "chapters" ? <ChaptersSheet site={site} chapters={chapters} state={s} dispatch={dispatch} onClose={closeSheet} /> : null}
			{sheet === "credits" ? <CreditsSheet site={site} onClose={closeSheet} /> : null}
			{sheet === "note" ? <NoteSheet site={site} chapter={chapter} lens={lens} onClose={closeSheet} /> : null}
			{sheet === "evidence" ? <EvidenceSheet site={site} chapters={chapters} state={s} dispatch={dispatch} onClose={closeSheet} /> : null}
			{sheet === "debug" ? <DebugSheet site={site} chapters={chapters} state={s} dispatch={dispatch} onClose={closeSheet} /> : null}
			{sheet && typeof sheet === "object" ? <SourcesSheet site={site} beat={sheet.beat} onClose={closeSheet} /> : null}
		</div>
	);
}
