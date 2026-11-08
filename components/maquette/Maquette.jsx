"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

const Stage = dynamic(() => import("./Stage"), { ssr: false, loading: () => null });

const noop = () => () => {};
function hasWebGL() {
	try {
		const c = document.createElement("canvas");
		return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
	} catch {
		return false;
	}
}
const subscribeWidth = (cb) => {
	const mq = window.matchMedia("(max-width: 767px)");
	mq.addEventListener("change", cb);
	return () => mq.removeEventListener("change", cb);
};

/**
 * A 3D model in a box. The canvas only exists while the box is near the
 * screen (so a long page never holds more than a couple of WebGL contexts)
 * and only draws while the box is on it.
 */
export default function Maquette({ className = "", models, progress, intro, invert, zoom, children }) {
	const box = useRef(null);
	const [near, setNear] = useState(false);
	const [onScreen, setOnScreen] = useState(false);
	const webgl = useSyncExternalStore(noop, hasWebGL, () => false);
	const count = useSyncExternalStore(subscribeWidth, () => (window.matchMedia("(max-width: 767px)").matches ? 5200 : 9000), () => 9000);

	useEffect(() => {
		const el = box.current;
		if (!el) return;
		const nearby = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "80% 0px" });
		const visible = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: "0px" });
		nearby.observe(el);
		visible.observe(el);
		return () => {
			nearby.disconnect();
			visible.disconnect();
		};
	}, []);

	return (
		<div ref={box} className={`relative ${className}`} aria-hidden="true">
			{webgl && near && (
				<Stage models={models} progress={progress} intro={intro} invert={invert} zoom={zoom} count={count} active={onScreen} eventSource={box} />
			)}
			{children}
		</div>
	);
}
