"use client";

// React shell around panoCore.js. Owns the canvas, the hotspot layer and the look controls.
// Everything it shows comes from site.json; the only text here is generic interface text.

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/play/ui";

const HOTSPOT_SHAPES = { move: "is-move", evidence: "is-evidence", restore: "is-restore" };

export default function PanoViewer({
	site,            // site.json "site" block
	urls,            // lib/play/pack.js packUrls()
	node,            // current node object
	state = "now",   // base state of the chapter
	view,            // { look: [x,y,z] | null, n: number }: bump n to re-aim the camera
	restored = [],   // restoration ids that show THEN through their masks
	animateId = null, // the restoration to reveal with the long fade
	onRevealDone,
	revealAll = false,
	proof = false,
	preloadThen = false,
	hotspots = [],   // [{ id, kind, dir, label, text, done }]
	onHotspot,
	onFirstView,
	debug = false,
}) {
	const holder = useRef(null);
	const layer = useRef(null);
	const readout = useRef(null);
	const coreRef = useRef(null);
	const applied = useRef(new Set());
	const [env, setEnv] = useState({ ready: false, failed: false, canGyro: false });
	const [status, setStatus] = useState({ loading: true, error: null });
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
				for (const btn of box.children) {
					const raw = btn.dataset.dir;
					if (!raw) continue;
					const p = c.project(raw.split(",").map(Number));
					if (!p) {
						btn.style.visibility = "hidden";
						continue;
					}
					btn.style.visibility = "visible";
					btn.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
				}
			}
			if (readout.current) {
				const v = c.view();
				readout.current.textContent = `yaw ${v.yaw.toFixed(0)}  pitch ${v.pitch.toFixed(0)}  fov ${v.fov.toFixed(0)}  faces ${v.size}${v.thenSize ? ` / then ${v.thenSize}` : ""}`;
			}
		};
		import("./panoCore")
			.then(({ PanoCore }) => {
				if (cancelled || !el) return;
				core = new PanoCore(el, {
					site,
					urls,
					reducedMotion,
					onFrame: place,
					onStatus: (s) => {
						if (cancelled) return;
						setStatus({ loading: !!s.loading, error: s.error || null });
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
			coreRef.current = null;
			core?.dispose();
		};
		// The engine is built once per pack. onFirstView is only read when the first picture lands.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [site, urls]);

	// Move to a node, or re-aim on the same node.
	useEffect(() => {
		const core = coreRef.current;
		if (!env.ready || !core || !node) return;
		const sameNode = core.node && core.node.id === node.id && (core.primary === state || !(node.states || []).includes(state));
		if (sameNode) {
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
		if (env.ready) coreRef.current?.setAll(revealAll);
	}, [env.ready, revealAll]);

	useEffect(() => {
		if (env.ready) coreRef.current?.setProof(proof);
	}, [env.ready, proof]);

	useEffect(() => {
		if (env.ready) coreRef.current?.setPreloadThen(preloadThen);
	}, [env.ready, preloadThen]);

	// Hotspots changed without the camera moving: place them again.
	useEffect(() => {
		if (env.ready) coreRef.current?.invalidate();
	}, [env.ready, hotspots, debug]);

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
		if (!core) return;
		if (gyro === "on") {
			core.disableGyro();
			setGyro("off");
			return;
		}
		setGyro("asking");
		setGyro(await core.enableGyro());
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
			<div ref={layer} className="play-hotspots">
				{hotspots.map((h) => (
					<button
						key={h.id}
						type="button"
						className={`play-hotspot ${HOTSPOT_SHAPES[h.kind] || ""}${h.done ? " is-done" : ""}`}
						data-dir={h.dir.join(",")}
						aria-label={h.label}
						onClick={() => onHotspot?.(h)}
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

			<div className="play-pano-status" role="status" aria-live="polite">
				{env.failed ? "This browser cannot show the panorama. The story still works from the lists." : null}
				{!env.failed && status.error ? "This view did not load. Check the connection and try again." : null}
				{!env.failed && !status.error && status.loading ? "Loading the view" : null}
				{gyro === "denied" ? "Motion access was not allowed. Drag or use the buttons to look." : null}
			</div>
			{debug ? <div ref={readout} className="play-pano-readout" aria-hidden="true" /> : null}
		</div>
	);
}
