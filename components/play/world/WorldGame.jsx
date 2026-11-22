"use client";

// The open world: canvas, mission flow, dialogue and narration. Everything site-specific comes from
// world.json, missions.json and the pack's story. Saved after every objective.

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics, useRapier } from "@react-three/rapier";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { createNarrator, discoverVoices } from "@/lib/play/audio";
import { loadSite, packUrls } from "@/lib/play/pack";
import { pagedSentences, spokenFor, textFor } from "@/lib/play/story/engine";
import { createAmbience } from "@/lib/play/world/ambience";
import { createInput } from "@/lib/play/world/input";
import {
	allowsRoaming,
	initialWorldState,
	missionAt,
	objectiveAt,
	reduceWorld,
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
				setBoot({ status: "ready", world, missions, story: site.story, presetId, touch: isTouchDevice() });
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

function Game({ slug, packVersion, base, world, missions, story, presetId, touch }) {
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
					onPlace: (place) => handlers.current.place?.(place),
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
			return {
				key: id,
				speaker: null,
				text,
				paged,
				segments: spokenFor(b),
				chip: chipFor(b.facts, facts, !!b.placeholder),
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

	useEffect(() => {
		if (!loaded || phase !== "world" || !objectiveId) return undefined;
		const o = objectiveAt(state, missions);
		if (o?.kind === "story") {
			const t = setTimeout(() => scripts.play(o.beats.map(beatItem), { done: () => dispatch({ type: "story-done", objective: o.id }) }), 500);
			return () => {
				clearTimeout(t);
				scripts.stop();
			};
		}
		if (o?.kind === "choice") {
			const t = setTimeout(() => {
				rt.hold("choice", true);
				const b = beats.get(o.beat);
				setChoice({ beat: b, picked: null, wrong: [] });
				scripts.play([beatItem(o.beat)]);
			}, 400);
			return () => clearTimeout(t);
		}
		return undefined;
		// Runs once per objective.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loaded, phase, objectiveId]);

	const pickOption = useCallback(
		(opt) => {
			const b = choice.beat;
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
		[choice, scripts, beatItem, rt],
	);

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
		});
	}, [state, missions, rt, voices, scripts]);

	const doRestore = useCallback(() => {
		const o = objectiveAt(state, missions);
		if (o?.kind !== "restore" || rt.restoreAnim || scripts.active) return;
		if (rt.riding && !rt.dismount()) return;
		setRestoring(true);
		rt.hold("restore", true);
		rt.restore(o.classes, () => {
			rt.hold("restore", false);
			setRestoring(false);
			dispatch({ type: "restored" });
		});
	}, [state, missions, rt, scripts]);

	// Anything the mouse must click frees the pointer. E and gamepad A work for the same things.
	const needsCursor = phase === "world" && (state.phase === "end" || state.phase === "done" || ["era", "restore", "choice"].includes(objective?.kind));
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
			place: (place) => {
				dispatch({ type: "visited", place: place.id });
				showFacts(place.facts);
			},
			arrive: (o, r) => {
				if (o.kind === "goto") dispatch({ type: "arrive" });
				if (o.kind === "ride") dispatch({ type: "arrive", riding: r });
			},
			interact: (p) => {
				if (state.phase === "end") {
					if (performance.now() - endAt.current > 900) dispatch({ type: "end-dismissed" });
					return;
				}
				if (!p || state.phase !== "play" || scripts.active) return;
				const o = objectiveAt(state, missions);
				if (p.kind === "action") {
					if (o?.kind === "era") wakeEra();
					if (o?.kind === "restore") doRestore();
					return;
				}
				if (!allowsRoaming(o)) return;
				const holdFor = (npcId) => ({
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
				});
				if (p.kind === "npc") {
					const npc = missions.npcs.find((n) => n.id === p.id);
					const lines = missions.dialogue[npc.dialogue];
					const live = o.kind === "talk" && o.npc === p.id;
					const items = (live ? lines : lines.filter((l) => !l.beat && !l.facts?.length).slice(0, 1)).map(lineItem);
					scripts.play(items, { ...holdFor(p.id), done: () => live && dispatch({ type: "talked", npc: p.id }) });
				}
				if (p.kind === "record" && o.kind === "record" && o.record === p.id) {
					const r = missions.records.find((x) => x.id === p.id);
					const items = r.beats.map(beatItem).filter(Boolean).map((item) => {
						const base = item.evidence || evidence.get(r.evidence) || (r.placement_note ? { title: r.title } : null);
						return { ...item, evidence: base && r.placement_note ? { ...base, placement: r.placement_note } : base };
					});
					scripts.play(items, { ...holdFor(null), done: () => dispatch({ type: "found", record: p.id }) });
				}
			},
		};
	}, [showFacts, missions, state, wakeEra, doRestore, rt, lineItem, scripts, beatItem, evidence]);

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
			<WorldHud
				slug={slug}
				rt={rt}
				world={world}
				missions={missions}
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
				choice={choice}
				shifting={shifting}
				restoring={restoring}
				talking={talking}
				sound={sound}
				presetId={presetId}
				onEnter={enter}
				onBegin={() => dispatch({ type: "begin" })}
				onSkip={scripts.skip}
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
