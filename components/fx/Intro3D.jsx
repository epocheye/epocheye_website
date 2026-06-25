"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(useGSAP);

/**
 * One-shot 3D camera-push entrance on mount: the block tips up out of depth
 * (rotateX + Z) and settles. Used for the first below-hero section so the page
 * "arrives" in 3D. No-op under reduced-motion.
 */
export default function Intro3D({
	children,
	className = "",
	rotate = 12,
	z = 320,
	y = 40,
	duration = 1.5,
	delay = 0.15,
}) {
	const ref = useRef(null);

	useGSAP(
		() => {
			const el = ref.current;
			if (!el) return;
			if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
			gsap.set(el, { transformPerspective: 1300, transformOrigin: "center 28%" });
			gsap.from(el, {
				rotationX: rotate,
				z: -z,
				y,
				opacity: 0,
				duration,
				delay,
				ease: "power3.out",
			});
		},
		{ scope: ref }
	);

	return (
		<div ref={ref} className={`depth ${className}`}>
			{children}
		</div>
	);
}
