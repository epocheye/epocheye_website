"use client";

import { useEffect, useRef } from "react";

/**
 * Global cursor-following spotlight — a soft lime/violet radial light fixed over
 * all content that tracks the pointer, adding ambient depth. Desktop fine-pointer
 * only; hidden on touch / reduced-motion (CSS).
 */
export default function Spotlight() {
	const ref = useRef(null);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const el = ref.current;
		if (!el) return;
		const fine = window.matchMedia?.("(pointer: fine)").matches;
		const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		if (!fine || reduced) return;

		let on = false;
		const onMove = (e) => {
			el.style.setProperty("--sx", e.clientX + "px");
			el.style.setProperty("--sy", e.clientY + "px");
			if (!on) {
				on = true;
				el.classList.add("on");
			}
		};
		window.addEventListener("mousemove", onMove, { passive: true });
		return () => window.removeEventListener("mousemove", onMove);
	}, []);

	return <div ref={ref} className="spotlight" aria-hidden="true" />;
}
