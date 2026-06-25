"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(useGSAP);

/**
 * Pointer-driven 3D tilt card. The frame holds the perspective; the inner layer
 * rotates toward the cursor with eased quickTo, lifts (scale) and shows a moving
 * glare. Desktop fine-pointer only — flat on touch / reduced-motion.
 */
export default function Tilt3D({
	children,
	className = "",
	max = 12,
	scale = 1.04,
	glare = true,
}) {
	const wrapRef = useRef(null);
	const innerRef = useRef(null);

	useGSAP(
		() => {
			const wrap = wrapRef.current;
			const inner = innerRef.current;
			if (!wrap || !inner) return;
			const fine = window.matchMedia?.("(pointer: fine)").matches;
			const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
			if (!fine || reduced) return;

			gsap.set(inner, { transformPerspective: 800, rotationX: 0, rotationY: 0 });
			const rotX = gsap.quickTo(inner, "rotationX", { duration: 0.5, ease: "power3" });
			const rotY = gsap.quickTo(inner, "rotationY", { duration: 0.5, ease: "power3" });

			const onMove = (e) => {
				const r = wrap.getBoundingClientRect();
				const px = (e.clientX - r.left) / r.width - 0.5;
				const py = (e.clientY - r.top) / r.height - 0.5;
				rotY(px * max * 2);
				rotX(-py * max * 2);
				wrap.style.setProperty("--gx", `${(px + 0.5) * 100}%`);
				wrap.style.setProperty("--gy", `${(py + 0.5) * 100}%`);
			};
			const onLeave = () => {
				rotX(0);
				rotY(0);
			};

			wrap.addEventListener("pointermove", onMove);
			wrap.addEventListener("pointerleave", onLeave);
			return () => {
				wrap.removeEventListener("pointermove", onMove);
				wrap.removeEventListener("pointerleave", onLeave);
			};
		},
		{ scope: wrapRef }
	);

	return (
		<div ref={wrapRef} className={`persp group/tilt ${className}`}>
			<div ref={innerRef} className="tw-3d bface-hidden relative h-full w-full">
				{children}
				{glare && <span className="tilt-glare" aria-hidden="true" />}
			</div>
		</div>
	);
}
