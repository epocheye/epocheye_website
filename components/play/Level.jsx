"use client";

// One level of Epocheye Play. Owns the story state (lib/play/story/engine.js), the local save,
// narration timing, and the layout: panorama behind, story panel at the bottom.
// No site-specific code: everything shown comes from site.json.

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import {
	currentStep, initialState, reduce, restore as restoreSave, restoredBefore, saveKey, serialise, spokenFor, textFor,
} from "@/lib/play/story/engine";
import { createNarrator, discoverVoices } from "@/lib/play/audio";
import { directionFrom, nodeById } from "@/lib/play/pack";
import { Icon, Pill } from "@/components/play/ui";
import StoryPanel from "@/components/play/StoryPanel";
import { ChaptersSheet, CreditsSheet, DebugSheet, EvidenceSheet, NoteSheet, SourcesSheet } from "@/components/play/LevelSheets";

const PanoViewer = dynamic(() => import("./engine/PanoViewer"), { ssr: false });

function startView(site, chapter, n) {
	const want = chapter?.start_node || site.site.start_node;
	const node = nodeById(site, want) || site.nodes[0];
	return { node: node.id, look: null, n };
}

function init({ slug, site, chapters, startChapter }) {
	let game = initialState();
	let screen = "play";
	try {
		const saved = restoreSave(window.localStorage.getItem(saveKey(slug)), chapters);
		if (saved) {
			game = saved;
			if (saved.complete) screen = "done";
		}
	} catch {
		// Private mode or storage disabled: play without a save.
	}
	if (startChapter != null && chapters[startChapter]) {
		game = reduce(game, { type: "jump", chapter: startChapter }, chapters);
		screen = "play";
	}
	game = { ...game, restored: restoredBefore(chapters, game.chapter) };
	return {
		ctx: { site, chapters },
		game,
		screen,
		view: startView(site, chapters[game.chapter], 0),
		open: null,      // evidence beat whose card is open in a Look step
		tried: {},       // choice beat id -> option ids already tried
		noteSeen: false, // the chapter's side note has been opened
		revealing: null, // restoration whose reveal is playing
		revealAll: false,
	};
}

function levelReducer(s, a) {
	const { site, chapters } = s.ctx;
	const story = (action) => {
		const prev = s.game;
		const game = reduce(prev, action, chapters);
		if (game === prev) return s;
		const next = { ...s, game };
		if (game.step !== prev.step || game.chapter !== prev.chapter) next.open = null;
		if (game.chapter !== prev.chapter) {
			next.view = startView(site, chapters[game.chapter], s.view.n + 1);
			next.tried = {};
			next.noteSeen = false;
			// The chapters that count are finished. Stop before any preview.
			if (chapters[game.chapter].preview && !chapters[prev.chapter].preview) next.screen = "done";
		}
		if (game.complete && !prev.complete) next.screen = "done";
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
		case "restore": {
			const next = story({ type: "restore", id: a.id });
			if (next === s) return s;
			return { ...next, revealing: a.id, view: a.look ? aimed(s.view.node, a) : next.view };
		}
		case "revealed":
			return s.revealing === a.id ? { ...s, revealing: null } : s;
		case "jump": {
			if (!chapters[a.chapter]) return s;
			const game = { ...reduce(s.game, { type: "jump", chapter: a.chapter }, chapters), restored: restoredBefore(chapters, a.chapter) };
			return { ...s, game, screen: "play", view: startView(site, chapters[a.chapter], s.view.n + 1), open: null, tried: {}, noteSeen: false, revealing: null };
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
			return { ...s, revealAll: !!a.on };
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
	return `${base}|beat`;
}

function segmentsFor(chapters, key) {
	if (!key) return [];
	const [c, st, kind, a, b] = key.split("|");
	const step = chapters[Number(c)]?.steps[Number(st)];
	if (!step) return [];
	let beat = step.beat;
	if (kind === "ev") beat = step.beats?.find((x) => x.id === a);
	else if (kind === "after") beat = step.beat?.options?.find((o) => o.id === a)?.after?.[Number(b)];
	else if (kind === "q" && Number(a) > 0) return []; // back at the options: the question is not asked twice
	if (!beat) return [];
	const spoken = spokenFor(beat);
	if (spoken.length) return spoken;
	// Unspoken story text still gets a reading-speed beat before "continue" stands out.
	if (!beat.ui && beat.text) return [{ text: textFor(beat.text, "traveller"), pause_after_ms: 0, clip: null }];
	return [];
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
	const ofStep = (s2) => (!s2 ? [] : s2.kind === "look" ? s2.beats.map(first) : [first(s2.beat)]);
	const next = chapters[ci].steps[si + 1] || chapters[ci + 1]?.steps[0];
	let ids = [];
	if (kind === "ev") ids = step.beats.filter((x) => x.id !== a).map(first);
	else if (kind === "q") ids = step.beat.options.map((o) => first(o.after?.[0]));
	else if (kind === "after") {
		const after = step.beat.options.find((o) => o.id === a)?.after || [];
		ids = [first(after[Number(b) + 1])];
	}
	return [...new Set([...ids, ...ofStep(next)].filter(Boolean))].slice(0, 6);
}

function chapterLine(c) {
	if (!c) return "";
	if (c.preview) return c.title;
	return `${c.n === 0 ? "Prologue" : `Chapter ${c.n ?? c.index}`} · ${c.title}`;
}

export default function Level({ slug, site, chapters, urls, startChapter = null, debug = false }) {
	const [s, dispatch] = useReducer(levelReducer, { slug, site, chapters, startChapter }, init);
	const [narrator] = useState(() => createNarrator(urls));
	const [soundOn, setSoundOn] = useState(false);
	const [voice, setVoice] = useState({ checked: false, id: null });
	const [readyKey, setReadyKey] = useState("");
	const [sheet, setSheet] = useState(null); // null | "chapters" | "credits" | "note" | "evidence" | "debug" | { beat }

	const story = site.story;
	const g = s.game;
	const chapter = chapters[g.chapter];
	const step = currentStep(g, chapters);
	const lens = g.lens || story.default_lens || "traveller";
	const node = nodeById(site, s.view.node) || site.nodes[0];
	const key = unitKey(s);
	// A line is "ready" once its telling has finished under the current sound setting.
	const tellKey = `${key}#${soundOn ? voice.id || "silent" : "off"}`;
	const ready = key === "" || readyKey === tellKey;

	// Save after every chapter (and whenever the story state changes: resume starts the chapter again).
	useEffect(() => {
		try {
			window.localStorage.setItem(saveKey(slug), serialise(g));
		} catch {
			// No storage: nothing to do.
		}
	}, [slug, g]);

	// Tell the current line: its clips with the directed pauses, or the same pauses on reading time.
	useEffect(() => {
		if (!key) return undefined;
		const cancel = narrator.play(segmentsFor(chapters, key), { onDone: () => setReadyKey(tellKey) });
		narrator.preload(upcomingClips(chapters, key));
		return cancel;
	}, [narrator, chapters, key, tellKey]);

	useEffect(() => () => narrator.dispose(), [narrator]);

	const advance = () => {
		if (s.screen !== "play" || !step) return;
		if (step.kind === "look" && s.open) dispatch({ type: "close" });
		else if (step.kind === "restore" && s.revealing) return;
		else dispatch({ type: "advance" });
	};

	// Space or Enter continues, unless a control or a sheet has the key.
	useEffect(() => {
		const onKey = (e) => {
			if ((e.key !== " " && e.key !== "Enter") || e.repeat || e.defaultPrevented || sheet) return;
			const t = e.target;
			if (t instanceof Element && t.closest("button, a, input, select, textarea, summary, .play-piece-canvas")) return;
			const cur = currentStep(s.game, chapters);
			if (s.screen !== "play" || !cur) return;
			e.preventDefault();
			if (cur.kind === "look" && s.open) dispatch({ type: "close" });
			else if (cur.kind === "restore" && s.revealing) return;
			else dispatch({ type: "advance" });
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [s, chapters, sheet]);

	const toggleSound = () => {
		const on = !soundOn;
		narrator.setEnabled(on);
		if (on) {
			narrator.unlock();
			if (!voice.checked) {
				discoverVoices(urls).then((found) => {
					const v = found.voices.find((x) => x.id === found.default && x.manifest) || null;
					if (v) narrator.setVoice(v.id, v.clips, true);
					setVoice({ checked: true, id: v ? v.id : null });
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

	const closeSheet = () => {
		if (sheet === "note") dispatch({ type: "note" });
		setSheet(null);
	};

	return (
		<div className="play-level">
			<PanoViewer
				site={site.site}
				urls={urls}
				node={node}
				state={chapter?.state || "now"}
				view={s.view}
				restored={g.restored}
				animateId={s.revealing}
				onRevealDone={(id) => dispatch({ type: "revealed", id })}
				revealAll={s.revealAll}
				proof={g.proof}
				preloadThen={step?.kind === "restore"}
				hotspots={hotspots}
				onHotspot={onHotspot}
				debug={debug}
			/>

			<header className="play-top">
				<div className="play-top-row">
					<Link href="/play" className="play-back" aria-label="Back to all sites">
						<Icon name="left" size={16} />
						<span>Sites</span>
					</Link>
					<div className="play-top-actions">
						<Pill small aria-pressed={soundOn} onClick={toggleSound} aria-label={soundOn ? "Sound is on. Turn sound off" : "Sound is off. Turn sound on"}>
							{soundOn ? "Sound on" : "Sound off"}
						</Pill>
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
				<p className="play-note" role="status" aria-live="polite">
					{soundOn && voice.checked && !voice.id ? "There is no narration in this pack yet. The pauses still run." : ""}
				</p>
			</header>

			<StoryPanel
				slug={slug}
				site={site}
				urls={urls}
				chapters={chapters}
				state={s}
				lens={lens}
				ready={ready}
				advance={advance}
				dispatch={dispatch}
				onSources={(beat) => setSheet({ beat })}
				onSheet={setSheet}
			/>

			{sheet === "chapters" ? <ChaptersSheet site={site} chapters={chapters} state={s} dispatch={dispatch} onClose={closeSheet} /> : null}
			{sheet === "credits" ? <CreditsSheet site={site} onClose={closeSheet} /> : null}
			{sheet === "note" ? <NoteSheet site={site} chapter={chapter} lens={lens} onClose={closeSheet} /> : null}
			{sheet === "evidence" ? <EvidenceSheet site={site} chapters={chapters} state={s} dispatch={dispatch} onClose={closeSheet} /> : null}
			{sheet === "debug" ? <DebugSheet site={site} chapters={chapters} state={s} dispatch={dispatch} onClose={closeSheet} /> : null}
			{sheet && typeof sheet === "object" ? <SourcesSheet site={site} beat={sheet.beat} onClose={closeSheet} /> : null}
		</div>
	);
}
