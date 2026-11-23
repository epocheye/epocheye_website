"use client";

// React shell around panoCore.js. Owns the canvas, the hotspot layer and the look controls.
// Everything it shows comes from site.json; the only text here is generic interface text.

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/play/ui";
import { FULL_REVEAL_MS, PanoCore } from "./panoCore";

const HOTSPOT_SHAPES = { move: "is-move", evidence: "is-evidence", restore: "is-restore" };
// What markers must not cover: the story panel's content, while it shows (Level.jsx, StoryPanel.jsx).
const COVER = ".play-panel:not(.is-clear) .play-panel-in";
const COVER_BOX = ".play-panel .play-panel-in";
const NO_HOTSPOTS = [];

export default function PanoViewer({
	site,            // site.json "site" block
	urls,            // lib/play/pack.js packUrls()
	node,            // current node object
	state = "now",   // base state of the chapter
	view,            // { look: [x,y,z] | null, n: number }: bump n to re-aim the camera
	restored = [],   // restoration ids that show THEN through their masks
	animateId = null, // the restoration to reveal with the long fade
	onRevealDone,
	revealAll = false, // THEN everywhere
	animateAll = false, // the full reveal: play it as the long fade, then call onAllDone
	onAllDone,
	proof = false,
	preloadThen = false,
	hotspots = [],   // [{ id, kind, dir, label, text, done }]
	onHotspot,
	onFirstView,
	onFrame,         // optional: called with the engine after each drawn frame
	debug = false,
}) {
	const holder = useRef(null);
	const layer = useRef(null);
	const readout = useRef(null);
	const coreRef = useRef(null);
	const applied = useRef(new Set());
	const allShown = useRef(null); // the last "THEN everywhere" value handed to the engine
	const allFading = useRef(false); // the full reveal is playing
	const frameHook = useRef(onFrame);
	useEffect(() => {
		frameHook.current = onFrame;
	});
	const [env, setEnv] = useState({ ready: false, failed: false, canGyro: false });
	const [status, setStatus] = useState({ loading: true, error: null, shown: null }); // shown: the node whose picture is up
	const [gyro, setGyro] = useState("off"); // off | asking | on | denied | unsupported

	// Create the engine once, on the client.
	useEffect(() => {
		let core = null;
		let cancelled = false;
		const el = holder.current;
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const place = (c) => {
			const box = layer.current;
			if (box) {
				// A marker never sits on the story panel's text or controls: one that would is hidden
				// until the view turns it clear. (Every move and every piece of evidence can also be
				// reached from the Chapters and List sheets.) All reads come before the writes.
				const panel = document.querySelector(COVER)?.getBoundingClientRect() || null;
				const origin = box.getBoundingClientRect();
				const items = [...box.children].map((btn) => ({ btn, raw: btn.dataset.dir, w: btn.offsetWidth, h: btn.offsetHeight }));
				for (const { btn, raw, w, h } of items) {
					if (!raw) continue;
					const p = c.project(raw.split(",").map(Number));
					const x = p ? origin.left + p.x : 0;
					const y = p ? origin.top + p.y : 0;
					const covered = !!p && !!panel && panel.height > 0 && y + h / 2 > panel.top - 6 && x + w / 2 > panel.left && x - w / 2 < panel.right;
					if (!p || covered) {
						btn.style.visibility = "hidden";
						continue;
					}
					btn.style.visibility = "visible";
					btn.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
				}
			}
			if (readout.current) {
				const v = c.view();
				readout.current.textContent = `yaw ${v.yaw.toFixed(0)}  pitch ${v.pitch.toFixed(0)}  fov ${v.fov.toFixed(0)}  faces ${v.size}${v.thenSize ? ` / then ${v.thenSize}` : ""}  all ${v.all.toFixed(2)}  proof ${v.proof.toFixed(2)}${v.tier ? " tier" : ""}`;
			}
			frameHook.current?.(c);
		};
		// A browser with no WebGL throws here; the level then plays from the lists.
		Promise.resolve()
			.then(() => {
				if (cancelled || !el) return;
				core = new PanoCore(el, {
					site,
					urls,
					reducedMotion,
					onFrame: place,
					onStatus: (s) => {
						if (cancelled) return;
						setStatus({ loading: !!s.loading, error: s.error || null, shown: s.shown || null });
						if (s.first) {
							// A mark for performance checks: the first picture is on screen.
							try {
								performance.mark("play:first-view");
							} catch {
								// Not supported: nothing depends on it.
							}
							onFirstView?.();
						}
					},
				});
				coreRef.current = core;
				const canGyro = typeof window.DeviceOrientationEvent !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
				setEnv({ ready: true, failed: false, canGyro });
			})
			.catch(() => {
				if (!cancelled) setEnv({ ready: false, failed: true, canGyro: false });
			});
		return () => {
			cancelled = true;
			applied.current = new Set();
			allShown.current = null;
			allFading.current = false;
			coreRef.current = null;
			core?.dispose();
		};
		// The engine is built once per pack. onFirstView is only read when the first picture lands.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [site, urls]);

	// THEN everywhere. Set before the first node loads, so a level reopened after its reveal
	// arrives complete. The full reveal plays as one long fade and reports when it has settled;
	// a level that was already revealed is simply shown that way.
	useEffect(() => {
		const core = coreRef.current;
		if (env.failed) {
			if (revealAll && animateAll) onAllDone?.();
			return;
		}
		if (!env.ready || !core) return;
		if (revealAll && animateAll) {
			if (allFading.current) return; // this fade is already running
			allFading.current = true;
			allShown.current = true;
			// Already complete (the debug view can do that): the engine settles at once.
			core.setAll(true, { animate: true, ms: FULL_REVEAL_MS }).then(() => {
				allFading.current = false;
				onAllDone?.();
			});
			return;
		}
		const first = allShown.current === null;
		if (allShown.current === revealAll) return;
		allShown.current = revealAll;
		core.setAll(revealAll, { animate: !first });
	}, [env.ready, env.failed, revealAll, animateAll, onAllDone]);

	// Move to a node, or re-aim on the same node.
	useEffect(() => {
		const core = coreRef.current;
		if (!env.ready || !core || !node) return;
		const sameNode = core.node && core.node.id === node.id && (core.primary === state || !(node.states || []).includes(state));
		if (sameNode) {
			// Back on the node that is showing: a move that was still loading must not land.
			core.stay();
			if (view?.look) core.lookAlong(view.look);
		} else {
			core.setNode(node, { state, look: view?.look || null });
		}
	}, [env.ready, node, state, view]);

	// Restorations: the one just set in place fades in slowly, the rest are simply there.
	useEffect(() => {
		const core = coreRef.current;
		if (env.failed) {
			if (animateId) onRevealDone?.(animateId);
			return;
		}
		if (!env.ready || !core) return;
		const seen = applied.current;
		for (const id of [...seen]) {
			if (!restored.includes(id)) {
				seen.delete(id);
				core.dropReveal(id);
			}
		}
		for (const id of restored) {
			if (seen.has(id)) continue;
			seen.add(id);
			const animate = id === animateId;
			core.revealTo(id, 1, { animate }).then(() => {
				if (animate) onRevealDone?.(id);
			});
		}
	}, [env.ready, env.failed, restored, animateId, onRevealDone]);

	useEffect(() => {
		if (env.ready) coreRef.current?.setProof(proof);
	}, [env.ready, proof]);

	useEffect(() => {
		if (env.ready) coreRef.current?.setPreloadThen(preloadThen);
	}, [env.ready, preloadThen]);

	// Markers belong to one viewpoint. While another picture is still up (loading, or a load
	// that failed), none are drawn: they would point at nothing in it.
	const shownHere = !!node && status.shown === node.id;
	const live = shownHere ? hotspots : NO_HOTSPOTS;

	// Hotspots changed without the camera moving: place them again.
	useEffect(() => {
		if (env.ready) coreRef.current?.invalidate();
	}, [env.ready, hotspots, shownHere, debug]);

	// The story panel grows and shrinks on its own (a card opens, the piece loads): place the
	// markers again whenever it does, so none is left sitting on it.
	const watched = useRef({ el: null, ro: null });
	useEffect(() => {
		const w = watched.current;
		const el = env.ready ? document.querySelector(COVER_BOX) : null;
		if (el === w.el) return;
		w.ro?.disconnect();
		w.el = el;
		w.ro = el && typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => coreRef.current?.invalidate()) : null;
		w.ro?.observe(el);
	});
	useEffect(() => () => watched.current.ro?.disconnect(), []);

	const nudge = (dyaw, dpitch) => coreRef.current?.nudge(dyaw, dpitch);
	const zoom = (d) => coreRef.current?.zoomBy(d);

	const onKeyDown = (e) => {
		if (e.target !== e.currentTarget) return;
		const k = e.key;
		if (k === "ArrowLeft") nudge(-15, 0);
		else if (k === "ArrowRight") nudge(15, 0);
		else if (k === "ArrowUp") nudge(0, 10);
		else if (k === "ArrowDown") nudge(0, -10);
		else if (k === "+" || k === "=") zoom(-8);
		else if (k === "-" || k === "_") zoom(8);
		else return;
		e.preventDefault();
	};

	const toggleGyro = async () => {
		const core = coreRef.current;
		if (!core || gyro === "asking") return;
		if (gyro === "on") {
			core.disableGyro();
			setGyro("off");
			return;
		}
		setGyro("asking");
		const result = await core.enableGyro();
		setGyro(result);
		// The refusal is said once, then cleared.
		if (result === "denied") setTimeout(() => setGyro((cur) => (cur === "denied" ? "off" : cur)), 6000);
	};

	const retry = () => coreRef.current?.setNode(node, { state, look: view?.look || null });

	// A marker in front of the camera can still be off the edge of the screen. When focus reaches
	// one (Tab, or a screen reader swipe), turn to it.
	const onHotspotFocus = (h) => {
		const core = coreRef.current;
		const p = core?.project(h.dir);
		if (core && (!p || !p.inView)) core.lookAlong(h.dir);
	};
	// Older browsers treat a hidden-overflow layer as scrollable by focus. Never let it stay scrolled.
	const onLayerScroll = (e) => {
		e.currentTarget.scrollLeft = 0;
		e.currentTarget.scrollTop = 0;
	};

	return (
		<div className="play-pano">
			<div
				ref={holder}
				className="play-pano-canvas"
				tabIndex={0}
				role="application"
				aria-label={`${node?.name || "View"}. A panorama. Use the arrow keys to look around, plus and minus to zoom.`}
				onKeyDown={onKeyDown}
			/>
			<div ref={layer} className="play-hotspots" onScroll={onLayerScroll}>
				{live.map((h) => (
					<button
						key={h.id}
						type="button"
						className={`play-hotspot ${HOTSPOT_SHAPES[h.kind] || ""}${h.done ? " is-done" : ""}`}
						data-dir={h.dir.join(",")}
						aria-label={h.label}
						onClick={() => onHotspot?.(h)}
						onFocus={() => onHotspotFocus(h)}
					>
						<span className="play-hotspot-mark" aria-hidden="true">
							{h.kind === "move" ? <Icon name="up" size={16} /> : h.done ? <Icon name="check" size={14} /> : null}
						</span>
						{h.text ? <span className="play-hotspot-text">{h.text}</span> : null}
					</button>
				))}
			</div>

			<div className="play-look" role="group" aria-label="Look around">
				<button type="button" className="play-icon-btn" onClick={() => nudge(0, 12)} aria-label="Look up"><Icon name="up" /></button>
				<button type="button" className="play-icon-btn" onClick={() => nudge(-20, 0)} aria-label="Look left"><Icon name="left" /></button>
				<button type="button" className="play-icon-btn" onClick={() => nudge(20, 0)} aria-label="Look right"><Icon name="right" /></button>
				<button type="button" className="play-icon-btn" onClick={() => nudge(0, -12)} aria-label="Look down"><Icon name="down" /></button>
				<button type="button" className="play-icon-btn play-look-zoom" onClick={() => zoom(-10)} aria-label="Zoom in"><Icon name="plus" /></button>
				<button type="button" className="play-icon-btn play-look-zoom" onClick={() => zoom(10)} aria-label="Zoom out"><Icon name="minus" /></button>
				{env.canGyro && gyro !== "unsupported" ? (
					<button
						type="button"
						className={`play-icon-btn play-look-motion${gyro === "on" ? " is-on" : ""}`}
						onClick={toggleGyro}
						aria-pressed={gyro === "on"}
						aria-label={gyro === "on" ? "Stop looking by moving the phone" : "Look by moving the phone"}
					>
						<span aria-hidden="true">{gyro === "on" ? "Motion on" : "Motion"}</span>
					</button>
				) : null}
			</div>

			<div className="play-pano-status">
				<div className="play-pano-status-text" role="status" aria-live="polite">
					{env.failed ? <p>This browser cannot show the panorama. The story still works from the lists.</p> : null}
					{!env.failed && status.error ? <p>This view did not load. Check the connection and try again.</p> : null}
					{!env.failed && !status.error && status.loading ? <p>Loading the view</p> : null}
					{gyro === "denied" ? <p>Motion access was not allowed. Drag or use the buttons to look.</p> : null}
				</div>
				{!env.failed && status.error ? (
					<button type="button" className="play-pill is-small" onClick={retry}>
						Try again
					</button>
				) : null}
			</div>
			{debug ? <div ref={readout} className="play-pano-readout" aria-hidden="true" /> : null}
		</div>
	);
}
