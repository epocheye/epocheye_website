"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * 3D scroll-in reveal: the element swings up out of depth (rotateX + push back
 * on Z) and settles flat as it enters the viewport. Gives content a tactile,
 * card-flip-into-place feel. Flat fade-free no-op under reduced-motion.
 */
export default function Scroll3D({
	children,
	as: Tag = "div",
	className = "",
	rotate = 36,
	y = 70,
	z = 220,
	duration = 1.1,
	start = "top 84%",
	delay = 0,
}) {
	const ref = useRef(null);

	useGSAP(
		() => {
			const el = ref.current;
			if (!el) return;
			if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

			gsap.set(el, { transformPerspective: 1000, transformOrigin: "center top" });
			gsap.from(el, {
				rotationX: -rotate,
				y,
				z: -z,
				opacity: 0,
				duration,
				delay,
				ease: "power3.out",
				scrollTrigger: { trigger: el, start },
			});
		},
		{ scope: ref }
	);

	return (
		<Tag ref={ref} className={`depth ${className}`}>
			{children}
		</Tag>
	);
}
