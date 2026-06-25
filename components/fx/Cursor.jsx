"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Magnetic custom cursor: a hard dot that tracks instantly and a ring that
 * trails with easing and swells over interactive targets. Desktop fine-pointer
 * only; on touch / reduced-motion it stays invisible and the native cursor is
 * untouched. No setState in render — visibility is toggled imperatively.
 */
export default function Cursor() {
	const dotRef = useRef(null);
	const ringRef = useRef(null);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const dot = dotRef.current;
		const ring = ringRef.current;
		if (!dot || !ring) return;

		const fine = window.matchMedia?.("(pointer: fine)").matches;
		const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		if (!fine || reduced) return;

		document.documentElement.classList.add("cursor-hidden");
		gsap.set([dot, ring], { opacity: 1 });
		gsap.set(ring, { scale: 1 });

		const dotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3" });
		const dotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3" });
		const ringX = gsap.quickTo(ring, "x", { duration: 0.4, ease: "power3" });
		const ringY = gsap.quickTo(ring, "y", { duration: 0.4, ease: "power3" });

		const onMove = (e) => {
			dotX(e.clientX);
			dotY(e.clientY);
			ringX(e.clientX);
			ringY(e.clientY);
		};
		let hovered = false;
		const onOver = (e) => {
			const hit = !!e.target.closest?.("a, button, [data-cursor]");
			if (hit === hovered) return;
			hovered = hit;
			gsap.to(ring, { scale: hit ? 1.8 : 1, duration: 0.3, ease: "power3", overwrite: "auto" });
		};

		window.addEventListener("mousemove", onMove, { passive: true });
		window.addEventListener("mouseover", onOver, { passive: true });

		return () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseover", onOver);
			document.documentElement.classList.remove("cursor-hidden");
		};
	}, []);

	return (
		<>
			<div ref={dotRef} className="holo-cursor-dot" style={{ opacity: 0 }} aria-hidden="true" />
			<div ref={ringRef} className="holo-cursor-ring" style={{ opacity: 0 }} aria-hidden="true" />
		</>
	);
}
