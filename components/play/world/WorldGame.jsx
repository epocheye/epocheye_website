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

function chipFor(ids, facts) {
	const f = (ids || []).map((id) => facts.get(id)).find(Boolean);
	return f ? { tier: f.tier, label: TIER_LABEL[f.tier] || f.tier, source: f.source } : null;
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

	useEffect(() => {
		try {
			localStorage.setItem(saveKey(slug), serialiseWorld(state));
		} catch {
			// Private windows can refuse storage. The game still plays.
		}
	}, [state, slug]);

	// ---- playing lines

	const script = useRef({ token: 0 });
	const stopScript = useCallback(() => {
		script.current.token++;
		voices.narrator.stop();
		for (const n of voices.roles.values()) n.stop();
		voices.ambience.duck(false);
	}, [voices]);

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
				chip: chipFor(b.facts, facts),
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

	const playItems = useCallback(
		(items, onDone) => {
			stopScript();
			const my = ++script.current.token;
			const list = items.filter(Boolean);
			const next = (i) => {
				if (my !== script.current.token) return;
				if (i >= list.length) {
					setLine(null);
					setCard(null);
					voices.ambience.duck(false);
					script.current.skip = null;
					onDone?.();
					return;
				}
				const item = list[i];
				const voice = item.speaker ? voices.roles.get(item.speaker) || voices.narrator : voices.narrator;
				script.current.skip = () => {
					voice.stop();
					next(i + 1);
				};
				setCard(item.evidence || null);
				voices.ambience.duck(true);
				voice.play(item.segments, {
					onSegment: (seg, k) => setLine({ key: `${item.key}:${k}`, text: item.paged ? item.paged[k] : item.text, role: item.role, chip: item.chip }),
					onDone: () => next(i + 1),
				});
			};
			next(0);
		},
		[stopScript, voices],
	);

	const skipLine = useCallback(() => script.current.skip?.(), []);

	// ---- the live objective

	const mission = missionAt(state, missions);
	const objective = objectiveAt(state, missions);
	const objectiveId = objective?.id ?? null;

	useEffect(() => {
		if (!loaded) return undefined;
		const o = objectiveAt(state, missions);
		rt.setObjective(o, waypointFor(state, missions, riding));
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
			voices.ambience.setEra(rt.era === "1791" ? 1 : 0, 0.1);
			rt.setResolved(state.resolved);
			rt.teleport(m.start, m.start_face_deg ?? 0);
		}
	}, [loaded, state, missions, rt, voices]);

	useEffect(() => {
		if (!loaded || phase !== "world" || !objectiveId) return undefined;
		const o = objectiveAt(state, missions);
		if (o?.kind === "story") {
			const t = setTimeout(() => playItems(o.beats.map(beatItem), () => dispatch({ type: "story-done", objective: o.id })), 500);
			return () => {
				clearTimeout(t);
				stopScript();
			};
		}
		if (o?.kind === "choice") {
			const t = setTimeout(() => {
				rt.hold(true);
				input?.releasePointer();
				const b = beats.get(o.beat);
				setChoice({ beat: b, picked: null, wrong: [] });
				playItems([beatItem(o.beat)]);
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
			setChoice((c) => ({ ...c, picked: opt.id }));
			playItems((opt.after || []).map((a) => beatItem(a.id)), () => {
				if (opt.accepted) {
					setChoice(null);
					rt.hold(false);
					dispatch({ type: "chose", beat: b.id, option: opt.id });
				} else {
					setChoice((c) => ({ ...c, picked: null, wrong: [...c.wrong, opt.id] }));
				}
			});
		},
		[choice, playItems, beatItem, rt],
	);

	handlers.current.prompt = setPrompt;
	handlers.current.ride = setRiding;
	handlers.current.arrive = (o, r) => {
		if (o.kind === "goto") dispatch({ type: "arrive" });
		if (o.kind === "ride") dispatch({ type: "arrive", riding: r });
	};
	handlers.current.interact = (p) => {
		const o = objectiveAt(state, missions);
		if (p.kind === "npc") {
			const npc = missions.npcs.find((n) => n.id === p.id);
			const lines = missions.dialogue[npc.dialogue];
			const live = o?.kind === "talk" && o.npc === p.id;
			const items = (live ? lines : lines.filter((l) => !l.beat && !l.facts?.length).slice(0, 1)).map(lineItem);
			rt.faceNpc(p.id, true);
			rt.hold(true);
			setTalking(true);
			playItems(items, () => {
				rt.faceNpc(p.id, false);
				rt.hold(false);
				setTalking(false);
				if (live) dispatch({ type: "talked", npc: p.id });
			});
		}
		if (p.kind === "record" && o?.kind === "record" && o.record === p.id) {
			const r = missions.records.find((x) => x.id === p.id);
			rt.hold(true);
			setTalking(true);
			playItems(r.beats.map(beatItem), () => {
				rt.hold(false);
				setTalking(false);
				dispatch({ type: "found", record: p.id });
			});
		}
	};

	const wakeEra = useCallback(() => {
		const o = objectiveAt(state, missions);
		if (o?.kind !== "era" || shifting) return;
		setShifting(true);
		rt.hold(true);
		voices.ambience.setEra(o.to === "1791" ? 1 : 0, 2.2);
		rt.shiftEra(o.to, () => {
			rt.hold(false);
			setShifting(false);
			dispatch({ type: "era-shifted" });
		});
	}, [state, missions, shifting, rt, voices]);

	const doRestore = useCallback(() => {
		const o = objectiveAt(state, missions);
		if (o?.kind !== "restore" || restoring) return;
		setRestoring(true);
		rt.hold(true);
		rt.restore(o.classes, () => {
			rt.hold(false);
			setRestoring(false);
			dispatch({ type: "restored" });
		});
	}, [state, missions, restoring, rt]);

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
				choice={choice}
				shifting={shifting}
				restoring={restoring}
				talking={talking}
				sound={sound}
				presetId={presetId}
				onEnter={enter}
				onBegin={() => dispatch({ type: "begin" })}
				onSkip={skipLine}
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
