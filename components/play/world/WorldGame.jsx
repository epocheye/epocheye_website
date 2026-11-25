"use client";

// The open world: canvas, mission flow, dialogue and narration. Everything site-specific comes from
// world.json, missions.json and the pack's story. Saved after every objective.

import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics, useRapier } from "@react-three/rapier";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { castYearVote, chapterProgress, choicePick, finishRun, setQuiet } from "@/lib/play/api";
import { createNarrator, discoverVoices } from "@/lib/play/audio";
import { loadSite, packUrls } from "@/lib/play/pack";
import { orderSlots, pagedSentences, spokenFor, textFor } from "@/lib/play/story/engine";
import { createAmbience } from "@/lib/play/world/ambience";
import { createInput } from "@/lib/play/world/input";
import {
	allowsRoaming,
	initialWorldState,
	missionAt,
	objectiveAt,
	panoFor,
	reduceWorld,
	restoreCount,
	restoreWorld,
	saveKey,
	serialiseWorld,
	waypointFor,
} from "@/lib/play/world/missions";
import { detectPreset, isTouchDevice, PRESETS, savedPreset, savePreset, worldSupport } from "@/lib/play/world/quality";
import { WorldRuntime } from "@/lib/play/world/runtime";
import { createScriptOwner } from "@/lib/play/world/script";
import WorldHud from "@/components/play/world/WorldHud";
import "./world.css";

// Rooms and the end of the story load when the player reaches them, so they cost the first playable nothing.
const WorldPano = dynamic(() => import("@/components/play/world/WorldPano"), { ssr: false });

// After the whole building has come back, the silence holds this long before the story moves on.
const REVEAL_HOLD_MS = 1500;
// If a panorama never reports that a reveal has settled, the mission still moves on.
const REVEAL_SAFETY_MS = 20000;

const TIER_LABEL = { record: "From the record", reconstruction: "Our reconstruction", legend: "Legend", unknown: "Not known", reading: "Our reading" };

function GameHost({ rt, input, onReady, onProgress, onError }) {
	const { world, rapier } = useRapier();
	const gl = useThree((s) => s.gl);
	useEffect(() => {
		let live = true;
		rt.loadOnce(gl, onProgress)
			.then(() => {
				if (!live) return;
				rt.attachOnce(world, rapier);
				onReady();
			})
			.catch((e) => live && onError(e));
		return () => {
			live = false;
		};
	}, [rt, gl, world, rapier, onReady, onProgress, onError]);
	useFrame((state, dt) => rt.tick(dt, state.camera, input));
	return <primitive object={rt.root} />;
}

// Every beat by id, including the lines after a choice.
function indexBeats(story) {
	const out = new Map();
	const visit = (b) => {
		out.set(b.id, b);
		for (const o of b.options || []) for (const a of o.after || []) visit(a);
		for (const a of b.after || []) visit(a);
		for (const c of b.cards || []) visit(c);
	};
	for (const ch of story.chapters) for (const b of ch.beats) visit(b);
	return out;
}

// An owner's open note, written as a bracketed name and colon, is never shown to a player.
const isOwnerNote = (text) => /\[[A-Z][A-Z _-]*:/.test(text || "");

function chipFor(ids, facts, placeholder = false) {
	const f = (ids || []).map((id) => facts.get(id)).find(Boolean);
	if (!f) return null;
	return { tier: f.tier, label: TIER_LABEL[f.tier] || f.tier, source: placeholder || isOwnerNote(f.source) ? null : f.source };
}

// A card can cite a record and a reconstruction together. It carries the least certain tier it cites,
// so a reconstruction is never labelled as coming from the record.
const LEAST_CERTAIN = ["reconstruction", "reading", "legend", "unknown", "record"];
function cardChip(ids, facts) {
	const cited = (ids || []).map((id) => facts.get(id)).filter(Boolean);
	const f = LEAST_CERTAIN.map((tier) => cited.find((c) => c.tier === tier)).find(Boolean);
	return f ? chipFor([f.id], facts) : null;
}

export default function WorldGame({ slug, packVersion, worldVersion }) {
	const base = `/play/worlds/${slug}/v${worldVersion}`;
	const [boot, setBoot] = useState({ status: "loading" });
	useEffect(() => {
		let live = true;
		const support = worldSupport();
		if (!support.ok) {
			// Too weak for the open world: the panorama level is the fallback.
			window.location.replace(`/play/${slug}?view=story`);
			return undefined;
		}
		const json = (u) => fetch(u, { cache: "no-cache" }).then((r) => {
			if (!r.ok) throw new Error(`${u} ${r.status}`);
			return r.json();
		});
		Promise.all([json(`${base}/world.json`), json(`${base}/missions.json`), loadSite(slug, packVersion)])
			.then(([world, missions, site]) => {
				if (!live) return;
				const presetId = savedPreset() || detectPreset(support.gpu);
				setBoot({ status: "ready", world, missions, site, story: site.story, presetId, touch: isTouchDevice() });
			})
			.catch((e) => live && setBoot({ status: "error", message: e?.message || "The world did not load." }));
		return () => {
			live = false;
		};
	}, [base, slug, packVersion]);

	if (boot.status === "error") {
		return (
			<main className="w-root w-fallback">
				<p role="alert">The open world did not load.</p>
				<Link className="w-btn" href={`/play/${slug}?view=story`}>Open Story view</Link>
			</main>
		);
	}
	if (boot.status !== "ready") {
		return (
			<main className="w-root w-fallback">
				<p role="status">Loading the world</p>
			</main>
		);
	}
	return <Game key={boot.presetId} slug={slug} packVersion={packVersion} base={base} {...boot} />;
}

function Game({ slug, packVersion, base, world, missions, site, story, presetId, touch }) {
	const preset = PRESETS[presetId];
	const beats = useMemo(() => indexBeats(story), [story]);
	const facts = useMemo(() => new Map([...story.facts, ...(missions.world_facts || [])].map((f) => [f.id, f])), [story, missions]);
	const evidence = useMemo(() => new Map((story.evidence || []).map((e) => [e.id, e])), [story]);
	const [state, dispatch] = useReducer((s, a) => reduceWorld(s, a, missions), missions, (m) => {
		try {
			const raw = localStorage.getItem(saveKey(slug));
			return (raw && restoreWorld(raw, m)) || initialWorldState();
		} catch {
			return initialWorldState();
		}
	});
	const [phase, setPhase] = useState("title"); // title | loading | world
	const [progress, setProgress] = useState(0);
	const [loaded, setLoaded] = useState(false);
	const [error, setError] = useState(null);
	const [input, setInput] = useState(null);
	const [prompt, setPrompt] = useState(null);
	const [riding, setRiding] = useState(null);
	const [line, setLine] = useState(null);
	const [card, setCard] = useState(null);
	const [choice, setChoice] = useState(null);
	const [shifting, setShifting] = useState(false);
	const [restoring, setRestoring] = useState(false);
	const [sound, setSound] = useState(false);
	const [talking, setTalking] = useState(false);
	const [note, setNote] = useState(null); // a silent world fact, with its tier
	const [sketch, setSketch] = useState(null); // { objective, read }: a record held up against the view
	const [lookHeld, setLookHeld] = useState(0); // how far through a look objective's hold, 0 to 1
	const [revealing, setRevealing] = useState(null); // the restoration whose reveal is playing
	const [fadingAll, setFadingAll] = useState(false); // the full reveal is playing
	const [order, setOrder] = useState(null); // { beat, placed, miss }
	const [panel, setPanel] = useState(null); // a card the player reads and closes: arrived, or restored

	// Latest handlers for callbacks the runtime holds from its first frame.
	const handlers = useRef({});
	const [rt] = useState(
		() =>
			new WorldRuntime({
				world,
				missions,
				base,
				preset,
				callbacks: {
					onPrompt: (p) => handlers.current.prompt?.(p),
					onInteract: (p) => handlers.current.interact?.(p),
					onArrive: (o, r) => handlers.current.arrive?.(o, r),
					onRide: (id) => handlers.current.ride?.(id),
					onRideStep: (kind, strength, gait) => handlers.current.rideStep?.(kind, strength, gait),
					onPlace: (place) => handlers.current.place?.(place),
					onLook: (k) => handlers.current.look?.(k),
					onLooked: (o) => handlers.current.looked?.(o.id),
					onSkipStory: () => handlers.current.skipStory?.(),
				},
			}),
	);
	const [voices] = useState(() => {
		const urls = packUrls(slug, packVersion);
		const narrator = createNarrator(urls);
		const roles = new Map();
		for (const [role, id] of Object.entries(missions.voices || {})) {
			if (role === "narrator") continue;
			const n = createNarrator({
				audio: (voice, clip) => `${base}/audio/${voice}/${clip}.m4a`,
				file: (p) => `${base}/${p}`,
			});
			n.setVoice(id, new Map(), false);
			roles.set(role, n);
		}
		return { urls, narrator, roles, ambience: createAmbience() };
	});

	useEffect(() => {
		let live = true;
		discoverVoices(voices.urls).then((found) => {
			if (!live) return;
			const id = missions.voices?.narrator;
			const v = found.voices.find((x) => x.id === id) || found.voices.find((x) => x.id === found.default);
			if (v) voices.narrator.setVoice(v.id, v.clips, !!v.manifest);
		});
		return () => {
			live = false;
			voices.narrator.dispose();
			for (const n of voices.roles.values()) n.dispose();
			voices.ambience.dispose();
		};
	}, [voices, missions]);

	useEffect(() => () => input?.dispose(), [input]);
	useEffect(() => () => rt.dispose(), [rt]);
	// For automated play-throughs. Never on in production without ?debug=1.
	useEffect(() => {
		if (process.env.NODE_ENV !== "production" || new URLSearchParams(window.location.search).get("debug") === "1") window.__playWorld = rt;
	}, [rt]);

	useEffect(() => {
		try {
			localStorage.setItem(saveKey(slug), serialiseWorld(state));
		} catch {
			// Private windows can refuse storage. The game still plays.
		}
	}, [state, slug]);

	// ---- playing lines

	const [scripts] = useState(() => createScriptOwner({ voices, setLine, setCard }));

	const beatItem = useCallback(
		(id) => {
			const b = beats.get(id);
			if (!b) return null;
			const text = textFor(b.text, "traveller");
			const paged = pagedSentences(b, "traveller");
			// A beat can carry its own tier, which outranks the tier of the first fact it cites.
			const cited = chipFor(b.facts, facts, !!b.placeholder);
			const chip = b.tier ? { source: null, ...cited, tier: b.tier, label: TIER_LABEL[b.tier] || b.tier } : cited;
			return {
				key: id,
				speaker: null,
				text,
				paged,
				segments: spokenFor(b),
				chip,
				evidence: b.evidence ? evidence.get(b.evidence) : null,
			};
		},
		[beats, facts, evidence],
	);

	const lineItem = useCallback(
		(l) => {
			if (l.beat) return beatItem(l.beat);
			const npc = missions.npcs.find((n) => n.id === l.speaker);
			return {
				key: l.id,
				speaker: l.speaker,
				role: npc?.role,
				text: l.text,
				segments: [{ text: l.say || l.text, clip: l.id, pace: l.pace || "steady", pause_after_ms: l.pause_after_ms ?? 500 }],
				chip: chipFor(l.facts, facts),
				evidence: null,
			};
		},
		[beatItem, facts, missions],
	);

	// World facts for a ride or a place: shown once, silently, with their tier.
	const noted = useRef(new Set());
	const showFacts = useCallback(
		(ids) => {
			const fresh = (ids || []).filter((id) => facts.has(id) && !noted.current.has(id) && !isOwnerNote(facts.get(id).claim));
			if (!fresh.length) return;
			for (const id of fresh) noted.current.add(id);
			setNote({ key: fresh.join(":"), items: fresh.map((id) => ({ id, text: facts.get(id).claim, chip: chipFor([id], facts) })) });
		},
		[facts],
	);
	useEffect(() => {
		if (!note) return undefined;
		const t = setTimeout(() => setNote(null), 10000);
		return () => clearTimeout(t);
	}, [note]);

	// A line that is being spoken holds the player, and turns a person to face them if one is named.
	const holdFor = useCallback(
		(npcId) => ({
			setup: () => {
				if (npcId) rt.faceNpc(npcId, true);
				rt.hold("script", true);
				setTalking(true);
			},
			cleanup: () => {
				if (npcId) rt.faceNpc(npcId, false);
				rt.hold("script", false);
				setTalking(false);
			},
		}),
		[rt],
	);

	// ---- the live objective

	const mission = missionAt(state, missions);
	const objective = objectiveAt(state, missions);
	const objectiveId = objective?.id ?? null;

	useEffect(() => {
		if (!loaded) return undefined;
		const o = objectiveAt(state, missions);
		rt.setObjective(o, waypointFor(state, missions, riding, (id) => rt.ridePosition(id)));
		return undefined;
	}, [loaded, state, missions, riding, rt]);

	const missionId = mission?.id ?? null;
	useEffect(() => {
		if (loaded) rt.setMission(missionId);
	}, [loaded, missionId, rt]);

	// The room the player is standing in, if any. It follows from the save, so a reload lands there.
	const pano = phase === "world" ? panoFor(state, missions, !!revealing) : null;
	const panoNode = pano?.node ?? null;
	useEffect(() => {
		if (loaded) rt.setCovered(!!panoNode);
	}, [loaded, panoNode, rt]);

	// A mission's reconstruction note is shown once, as it starts.
	const startNote = state.phase === "play" ? mission?.place_note_facts : null;
	useEffect(() => {
		if (!startNote?.length) return undefined;
		const t = setTimeout(() => showFacts(startNote), 600);
		return () => clearTimeout(t);
	}, [startNote, showFacts]);

	// As in Story view, the debug view records nothing, so a test run never writes a player's row.
	useEffect(() => {
		setQuiet(new URLSearchParams(window.location.search).get("debug") === "1");
		return () => setQuiet(false);
	}, []);

	// The existing run records, so the year vote counts. Each call fails softly with no server.
	const reported = useRef(state);
	useEffect(() => {
		const prev = reported.current;
		reported.current = state;
		if (prev === state) return;
		const list = missions.missions;
		if (prev.phase === "intro" && state.phase === "play") chapterProgress(slug, list[state.mission]?.chapter, "start");
		if (state.mission !== prev.mission || (state.phase === "done" && prev.phase !== "done")) chapterProgress(slug, list[prev.mission]?.chapter, "finish");
	}, [state, missions, slug]);

	// A new mission: set the era, restore what is done, and on a fresh load place the player.
	const placed = useRef(false);
	useEffect(() => {
		if (!loaded) return;
		const m = missionAt(state, missions);
		if (!m) return;
		if (!placed.current) {
			placed.current = true;
			rt.setEra(state.era || m.era);
			voices.ambience.setEra(rt.isPast(rt.era) ? 1 : 0, 0.1);
			rt.setResolved(state.resolved);
			rt.markVisited(state.visited);
			rt.teleport(m.start, m.start_face_deg ?? 0);
		}
	}, [loaded, state, missions, rt, voices]);

	// A card on screen holds the player and is read first. What the objective does next waits for it.
	const panelUp = !!panel;
	const explaining = objective?.kind === "era" && !!objective.explain && !shifting;
	useEffect(() => {
		rt.hold("panel", panelUp || explaining);
	}, [rt, panelUp, explaining]);
	useEffect(() => {
		rt.hold("intro", phase === "world" && state.phase === "intro");
	}, [rt, phase, state.phase]);
	useEffect(() => {
		rt.setPlayerHidden(!!sketch);
	}, [rt, sketch]);

	// A press that closed one card must not also close the card that follows it.
	const readyAt = useRef(0);
	useEffect(() => {
		readyAt.current = performance.now();
	}, [state.phase, objectiveId, panelUp]);

	useEffect(() => {
		if (!loaded || phase !== "world" || !objectiveId || panelUp) return undefined;
		const o = objectiveAt(state, missions);
		if (o?.kind === "choice") {
			const t = setTimeout(() => {
				rt.hold("choice", true);
				const b = beats.get(o.beat);
				setChoice({ beat: b, picked: null, wrong: [] });
				scripts.play([beatItem(o.beat)]);
			}, 400);
			return () => clearTimeout(t);
		}
		if (o?.kind === "order") {
			const t = setTimeout(() => {
				rt.hold("order", true);
				setOrder({ beat: beats.get(o.beat), placed: [], miss: null });
			}, 400);
			return () => clearTimeout(t);
		}
		if (o?.kind === "reveal") {
			const t = setTimeout(() => setFadingAll(true), 400);
			return () => clearTimeout(t);
		}
		if (o?.kind === "proof" || o?.kind === "vote") {
			const t = setTimeout(() => scripts.play([beatItem(o.beat)]), 400);
			return () => clearTimeout(t);
		}
		if (o?.kind === "ending") {
			// The story is finished here, whether or not the player presses on past the card.
			chapterProgress(slug, mission?.chapter, "finish");
			finishRun(slug, { lens: story.default_lens || "traveller", vote: state.vote });
		}
		return undefined;
		// Runs once per objective, once any card in front of it has been closed.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loaded, phase, objectiveId, panelUp]);

	// A story never starts by itself: the player asks for it.
	const playStory = useCallback(() => {
		const o = objectiveAt(state, missions);
		if (o?.kind !== "story" || scripts.active) return;
		if (rt.riding && !rt.dismount()) return;
		scripts.play(o.beats.map(beatItem), { ...holdFor(null), label: "The story", done: () => dispatch({ type: "story-done", objective: o.id }) });
	}, [state, missions, scripts, rt, beatItem, holdFor]);

	const firstPicks = useRef(new Set());
	const pickOption = useCallback(
		(opt) => {
			const b = choice.beat;
			if (!firstPicks.current.has(b.id)) {
				firstPicks.current.add(b.id);
				choicePick(slug, missionAt(state, missions)?.chapter, b.id, opt.id);
			}
			scripts.play((opt.after || []).map((a) => beatItem(a.id)), {
				setup: () => setChoice((c) => ({ ...c, picked: opt.id })),
				cleanup: () => setChoice((c) => (c ? { ...c, picked: null } : c)),
				done: () => {
					if (opt.accepted) {
						setChoice(null);
						rt.hold("choice", false);
						dispatch({ type: "chose", beat: b.id, option: opt.id });
					} else {
						setChoice((c) => ({ ...c, wrong: [...c.wrong, opt.id] }));
					}
				},
			});
		},
		[choice, scripts, beatItem, rt, slug, state, missions],
	);

	// A card goes only in its own place. The last one is followed by what the record does not say.
	const placeCard = useCallback(
		(id, slot) => {
			if (!order) return;
			const slots = orderSlots(order.beat);
			if (order.placed.includes(id)) return;
			if (slots[slot]?.id !== id) {
				setOrder((v) => ({ ...v, miss: { id, slot, n: (v.miss?.n || 0) + 1 } }));
				return;
			}
			const placed = [...order.placed, id];
			setOrder((v) => ({ ...v, placed, miss: null }));
			const solved = placed.length === slots.length;
			const gaps = solved ? order.beat.cards.filter((c) => c.gap).map((c) => beatItem(c.id)) : [];
			const beatId = order.beat.id;
			scripts.play([beatItem(id), ...gaps], {
				done: () => {
					if (!solved) return;
					setOrder(null);
					rt.hold("order", false);
					dispatch({ type: "ordered", beat: beatId });
				},
			});
		},
		[order, beatItem, scripts, rt],
	);
	const showSources = useCallback(
		(card) => setNote({ key: `src:${card.id}`, items: (card.facts || []).filter((id) => facts.has(id)).map((id) => ({ id, text: facts.get(id).claim, chip: chipFor([id], facts) })) }),
		[facts],
	);

	const voteFor = useCallback(
		(option) => {
			scripts.stop();
			castYearVote(slug, option);
			dispatch({ type: "voted", option });
		},
		[scripts, slug],
	);

	const proofPlayed = useRef(false);
	const setProof = useCallback(
		(on) => {
			dispatch({ type: "proof", on });
			const o = objectiveAt(state, missions);
			if (o?.kind !== "proof" || !on || proofPlayed.current) return;
			proofPlayed.current = true;
			scripts.play((beats.get(o.beat)?.after || []).map((a) => beatItem(a.id)), { done: () => dispatch({ type: "proved" }) });
		},
		[state, missions, beats, beatItem, scripts],
	);

	const openSketch = useCallback(
		(o) => {
			if (rt.riding && !rt.dismount()) return;
			rt.hold("sketch", true);
			setSketch({ objective: o, read: false, chip: chipFor(o.facts, facts) });
			// The picture on screen is the evidence, so the line's own card stays out of its way.
			scripts.play((o.beats || []).map(beatItem).filter(Boolean).map((item) => ({ ...item, evidence: null })), {
				done: () => setSketch((v) => (v ? { ...v, read: true } : v)),
			});
		},
		[rt, facts, scripts, beatItem],
	);
	const closeSketch = useCallback(() => {
		scripts.stop();
		rt.hold("sketch", false);
		setSketch(null);
		dispatch({ type: "sketched" });
	}, [rt, scripts]);

	const climb = useCallback(() => {
		if (rt.riding && !rt.dismount()) return;
		dispatch({ type: "climbed" });
	}, [rt]);

	const onLook = useCallback((k) => setLookHeld(k), []);
	const onLooked = useCallback((id) => {
		setLookHeld(0);
		dispatch({ type: "looked", objective: id });
	}, []);

	// Read and written only from handlers, so a late or repeated report cannot finish it twice.
	const revealingId = useRef(null);
	const restoringObjective = useRef(null);
	// What was just put back, why it matters, and how many are done. The next step is read from the
	// live objective when the card is drawn.
	const finishRestore = useCallback(
		(o) => {
			dispatch({ type: "restored" });
			if (!o?.done) return;
			const { n, of } = restoreCount(missions, o);
			setPanel({ kind: "restored", kicker: `Restoration ${n} of ${of} done`, title: o.done.title, lines: [o.done.why], chip: cardChip(o.done.facts, facts) });
		},
		[missions, facts],
	);
	const revealDone = useCallback(
		(id) => {
			if (revealingId.current !== id) return;
			revealingId.current = null;
			setRevealing(null);
			setRestoring(false);
			rt.hold("restore", false);
			finishRestore(restoringObjective.current);
		},
		[rt, finishRestore],
	);
	useEffect(() => {
		if (!revealing) return undefined;
		const t = setTimeout(() => revealDone(revealing), REVEAL_SAFETY_MS);
		return () => clearTimeout(t);
	}, [revealing, revealDone]);

	const allDone = useCallback(() => {
		setFadingAll(false);
		setTimeout(() => dispatch({ type: "revealed" }), REVEAL_HOLD_MS);
	}, []);
	useEffect(() => {
		if (!fadingAll) return undefined;
		const t = setTimeout(allDone, REVEAL_SAFETY_MS);
		return () => clearTimeout(t);
	}, [fadingAll, allDone]);

	const wakeEra = useCallback(() => {
		const o = objectiveAt(state, missions);
		if (o?.kind !== "era" || rt.eraAnim || scripts.active) return;
		if (rt.riding && !rt.dismount()) return;
		setShifting(true);
		rt.hold("shift", true);
		voices.ambience.setEra(rt.isPast(o.to) ? 1 : 0, 2.2);
		rt.shiftEra(o.to, () => {
			rt.hold("shift", false);
			setShifting(false);
			dispatch({ type: "era-shifted" });
			if (o.arrive) setPanel({ kind: "arrived", kicker: "Where you are now", title: o.arrive.title, lines: o.arrive.lines, chip: cardChip(o.arrive.facts, facts) });
		});
	}, [state, missions, rt, voices, scripts, facts]);

	const doRestore = useCallback(() => {
		const o = objectiveAt(state, missions);
		if (o?.kind !== "restore" || rt.restoreAnim || scripts.active) return;
		if (rt.riding && !rt.dismount()) return;
		setRestoring(true);
		rt.hold("restore", true);
		if (o.restoration) {
			// A painted surface comes back in the panorama, which holds the real restored picture.
			if (o.label) {
				const base = chipFor(o.facts, facts);
				const chip = o.tier ? { ...base, tier: o.tier, label: TIER_LABEL[o.tier] || o.tier, source: base?.source ?? null } : base;
				setNote({ key: `restore:${o.id}`, items: [{ id: o.id, text: o.label, chip }] });
			}
			revealingId.current = o.restoration;
			restoringObjective.current = o;
			setRevealing(o.restoration);
			return;
		}
		rt.restore(o.classes, () => {
			rt.hold("restore", false);
			setRestoring(false);
			finishRestore(o);
		});
	}, [state, missions, rt, scripts, facts, finishRestore]);

	// Anything the mouse must click frees the pointer. E and gamepad A work for the same things.
	const needsCursor = phase === "world" && (!!pano || !!sketch || panelUp || state.phase === "intro" || state.phase === "end" || state.phase === "done" || ["story", "era", "restore", "choice", "order", "proof", "vote", "ending"].includes(objective?.kind));
	useEffect(() => {
		input?.setCursorFree(needsCursor);
	}, [input, needsCursor]);

	// The splash stays up long enough to be seen before a key can dismiss it.
	const endAt = useRef(0);
	useEffect(() => {
		if (state.phase === "end") endAt.current = performance.now();
	}, [state.phase]);

	// The runtime calls these from its frame loop, so they are refreshed after every commit.
	useEffect(() => {
		handlers.current = {
			prompt: setPrompt,
			ride: (id) => {
				setRiding(id);
				if (id) showFacts(missions.rides?.find((r) => r.id === id)?.note_facts);
			},
			rideStep: (kind, strength, gait) => voices.ambience.rideStep(kind, strength, gait),
			place: (place) => {
				dispatch({ type: "visited", place: place.id });
				showFacts(place.facts);
			},
			look: onLook,
			looked: onLooked,
			arrive: (o, r) => {
				if (o.kind === "goto") dispatch({ type: "arrive" });
				if (o.kind === "ride") dispatch({ type: "arrive", riding: r });
			},
			skipStory: () => scripts.skipAll(),
			interact: (p) => {
				const now = performance.now();
				// A card is closed first, whatever is behind it.
				if (panel) {
					if (now - readyAt.current > 500) setPanel(null);
					return;
				}
				if (state.phase === "end") {
					if (now - endAt.current > 900) dispatch({ type: "end-dismissed" });
					return;
				}
				if (state.phase === "intro") {
					if (now - readyAt.current > 500) dispatch({ type: "begin" });
					return;
				}
				if (state.phase !== "play") return;
				// While a line is being spoken, the same key moves on to the next one.
				if (scripts.active) {
					if (now - scripts.startedAt > 350) scripts.skip();
					return;
				}
				const o = objectiveAt(state, missions);
				if (o?.kind === "era" && o.explain) {
					if (now - readyAt.current > 500) wakeEra();
					return;
				}
				if (!p) return;
				const readRecord = (id) => {
					const r = missions.records.find((x) => x.id === id);
					const items = r.beats.map(beatItem).filter(Boolean).map((item) => {
						const base = item.evidence || evidence.get(r.evidence) || (r.placement_note ? { title: r.title } : null);
						return { ...item, evidence: base && r.placement_note ? { ...base, placement: r.placement_note } : base };
					});
					scripts.play(items, { ...holdFor(null), label: r.title, done: () => dispatch({ type: "found", record: id }) });
				};
				if (p.kind === "action") {
					if (o?.kind === "story") playStory();
					if (o?.kind === "era") wakeEra();
					if (o?.kind === "restore") doRestore();
					if (o?.kind === "sketch_compare") openSketch(o);
					if (o?.kind === "climb") climb();
					if (o?.kind === "record") readRecord(o.record);
					return;
				}
				if (!allowsRoaming(o)) return;
				if (p.kind === "npc") {
					const npc = missions.npcs.find((n) => n.id === p.id);
					const lines = missions.dialogue[npc.dialogue];
					const live = o.kind === "talk" && o.npc === p.id;
					// Someone with something to say to anyone who stops says all of it.
					const items = (live || npc.ambient ? lines : lines.filter((l) => !l.beat && !l.facts?.length).slice(0, 1)).map(lineItem);
					showFacts(npc.note_facts);
					if (npc.placement_note) setNote({ key: `place:${npc.id}`, items: [{ id: npc.id, text: npc.placement_note, chip: { tier: "reconstruction", label: TIER_LABEL.reconstruction } }] });
					scripts.play(items, { ...holdFor(p.id), done: () => live && dispatch({ type: "talked", npc: p.id }) });
				}
				if (p.kind === "record" && o.kind === "record" && o.record === p.id) readRecord(p.id);
			},
		};
	}, [showFacts, missions, state, panel, wakeEra, doRestore, openSketch, climb, onLook, onLooked, rt, lineItem, scripts, beatItem, evidence, voices, holdFor, playStory]);

	const enter = useCallback(
		(withSound) => {
			if (withSound) {
				voices.narrator.unlock();
				for (const n of voices.roles.values()) n.unlock();
				voices.ambience.start();
				voices.ambience.setEnabled(true);
			}
			voices.narrator.setEnabled(withSound);
			for (const n of voices.roles.values()) n.setEnabled(withSound);
			setSound(withSound);
			setPhase("loading");
		},
		[voices],
	);

	const toggleSound = useCallback(() => {
		const on = !sound;
		if (on) {
			voices.narrator.unlock();
			for (const n of voices.roles.values()) n.unlock();
			voices.ambience.start();
		}
		voices.ambience.setEnabled(on);
		voices.narrator.setEnabled(on);
		for (const n of voices.roles.values()) n.setEnabled(on);
		setSound(on);
	}, [sound, voices]);

	const onReady = useCallback(() => {
		setLoaded(true);
		setPhase((p) => (p === "loading" ? "world" : p));
	}, []);
	const onError = useCallback((e) => setError(e?.message || "The world did not load."), []);

	useEffect(() => {
		if (loaded && phase === "loading") {
			const t = setTimeout(() => setPhase("world"), 0);
			return () => clearTimeout(t);
		}
		return undefined;
	}, [loaded, phase]);

	if (error) {
		return (
			<main className="w-root w-fallback">
				<p role="alert">The open world did not load on this device.</p>
				<Link className="w-btn" href={`/play/${slug}?view=story`}>Open Story view</Link>
			</main>
		);
	}

	return (
		<main className="w-root">
			{phase !== "title" ? (
				<Canvas
					className="w-canvas"
					flat
					shadows={preset.shadows}
					dpr={[1, preset.dpr]}
					gl={{ antialias: preset.antialias, powerPreference: "high-performance", stencil: false }}
					camera={{ fov: 58, near: 0.15, far: preset.far, position: [0, 2, 10] }}
					onCreated={({ gl }) => setInput(createInput(gl.domElement))}
				>
					<Suspense fallback={null}>
						<Physics gravity={[0, 0, 0]} timeStep="vary">
							{input ? <GameHost rt={rt} input={input} onReady={onReady} onProgress={setProgress} onError={onError} /> : null}
						</Physics>
					</Suspense>
					{preset.bloom ? (
						<EffectComposer multisampling={0} disableNormalPass>
							<Bloom intensity={0.55} luminanceThreshold={0.78} luminanceSmoothing={0.2} mipmapBlur />
							<Vignette eskil={false} offset={0.28} darkness={0.5} />
						</EffectComposer>
					) : null}
				</Canvas>
			) : null}
			{pano ? (
				<WorldPano
					site={site}
					urls={voices.urls}
					nodeId={pano.node}
					target={revealing ? site.restorations?.find((r) => r.id === revealing)?.target : pano.target}
					restored={revealing ? [...state.restored, revealing] : state.restored}
					animateId={revealing}
					onRevealDone={revealDone}
					revealAll={state.revealed || fadingAll}
					animateAll={fadingAll}
					onAllDone={allDone}
					proof={state.proof}
					lookGoal={objective?.kind === "look_at" && objective.pano_node ? objective : null}
					onLook={onLook}
					onLooked={onLooked}
					onCore={(c) => {
						rt.panoCore = c;
					}}
				/>
			) : null}
			<WorldHud
				slug={slug}
				rt={rt}
				world={world}
				missions={missions}
				site={site}
				packVersion={packVersion}
				packFile={voices.urls.file}
				input={input}
				touch={touch}
				phase={phase}
				progress={progress}
				state={state}
				mission={mission}
				objective={objective}
				prompt={prompt}
				riding={riding}
				line={line}
				card={card}
				note={note}
				pano={pano}
				sketch={sketch}
				lookHeld={lookHeld}
				order={order}
				missionChip={chipFor(mission?.place_note_facts, facts)}
				liveBeat={objective?.beat ? beats.get(objective.beat) : null}
				onSketchClose={closeSketch}
				onPlaceCard={placeCard}
				onSources={showSources}
				onVote={voteFor}
				onProof={setProof}
				onAction={() => handlers.current.interact?.({ kind: "action", id: objective?.id })}
				onEnding={() => dispatch({ type: "ended" })}
				choice={choice}
				shifting={shifting}
				restoring={restoring}
				talking={talking}
				sound={sound}
				presetId={presetId}
				onEnter={enter}
				onBegin={() => dispatch({ type: "begin" })}
				onSkip={scripts.skip}
				onSkipAll={scripts.skipAll}
				panel={panel}
				onPanelClose={() => setPanel(null)}
				onStory={playStory}
				onPick={pickOption}
				onWake={wakeEra}
				onRestore={doRestore}
				onEndDismiss={() => dispatch({ type: "end-dismissed" })}
				onToggleSound={toggleSound}
				onPreset={(id) => {
					savePreset(id);
					window.location.reload();
				}}
				onReplay={() => {
					try {
						localStorage.removeItem(saveKey(slug));
					} catch {
						// Nothing saved to clear.
					}
					window.location.reload();
				}}
			/>
		</main>
	);
}
