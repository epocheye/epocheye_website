"use client";

import { startTransition, useEffect, useState } from "react";
import { preload } from "react-dom";
import dynamic from "next/dynamic";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

const POSTER = "/journeys/posters/palace-pillar.webp";
const POSTER_SRCSET = "/journeys/posters/palace-pillar-800.webp 800w, /journeys/posters/palace-pillar.webp 1600w";
const POSTER_SIZES = "100vw";

function lowPower() {
	const n = navigator;
	if (n.connection?.saveData) return true;
	if (typeof n.deviceMemory === "number" && n.deviceMemory <= 2) return true;
	if (typeof n.hardwareConcurrency === "number" && n.hardwareConcurrency <= 2) return true;
	return false;
}

function hasWebGL() {
	try {
		const c = document.createElement("canvas");
		return !!(c.getContext("webgl2") || c.getContext("webgl"));
	} catch {
		return false;
	}
}

/**
 * The poster paints first. The three.js canvas mounts after first paint (idle callback),
 * never on low-power devices or under prefers-reduced-motion, fades in once the model is
 * ready, pauses when the tab is hidden, and switches off once the grid covers the screen.
 */
export default function Stage({ off }) {
	preload(POSTER, { as: "image", fetchPriority: "high", imageSrcSet: POSTER_SRCSET, imageSizes: POSTER_SIZES });
	const [mount, setMount] = useState(false);
	const [ready, setReady] = useState(false);
	const [visible, setVisible] = useState(true);
	const [mobile, setMobile] = useState(false);
	const [lost, setLost] = useState(false);

	useEffect(() => {
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reduce || lowPower() || !hasWebGL()) return undefined;
		const mq = window.matchMedia("(max-width: 767px)");
		const onMq = () => startTransition(() => setMobile(mq.matches));
		onMq();
		mq.addEventListener("change", onMq);
		// Desktop: mount once the page is idle after first paint. Phones: wait for the first
		// scroll or touch, so the poster carries the hero and the 3D bundle never competes with it.
		const idle = window.requestIdleCallback || ((fn) => window.setTimeout(fn, 300));
		const coarse = window.matchMedia("(pointer: coarse)").matches;
		let id = 0;
		const go = () => {
			window.removeEventListener("scroll", go);
			window.removeEventListener("touchstart", go);
			window.removeEventListener("pointerdown", go);
			startTransition(() => setMount(true));
		};
		if (coarse || mq.matches) {
			window.addEventListener("scroll", go, { passive: true, once: true });
			window.addEventListener("touchstart", go, { passive: true, once: true });
			window.addEventListener("pointerdown", go, { passive: true, once: true });
		} else {
			id = idle(() => go(), { timeout: 2000 });
		}
		const onVis = () => startTransition(() => setVisible(document.visibilityState === "visible"));
		document.addEventListener("visibilitychange", onVis);
		return () => {
			if (id) (window.cancelIdleCallback || window.clearTimeout)(id);
			window.removeEventListener("scroll", go);
			window.removeEventListener("touchstart", go);
			window.removeEventListener("pointerdown", go);
			mq.removeEventListener("change", onMq);
			document.removeEventListener("visibilitychange", onVis);
		};
	}, []);

	const showCanvas = mount && !lost;

	return (
		<div className="jr-stage" data-ready={ready && !lost ? "true" : "false"} data-off={off ? "true" : "false"} aria-hidden="true">
			{/* Poster: first paint, low-power and reduced-motion fallback. */}
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={POSTER}
				srcSet={POSTER_SRCSET}
				sizes={POSTER_SIZES}
				width={1600}
				height={1600}
				alt=""
				className="jr-stage__poster"
				fetchPriority="high"
				decoding="async"
			/>
			{showCanvas ? (
				<div className="jr-stage__canvas">
					<Scene
						active={visible && !off}
						mobile={mobile}
						onReady={() => startTransition(() => setReady(true))}
						onLost={() => startTransition(() => setLost(true))}
					/>
				</div>
			) : null}
		</div>
	);
}
