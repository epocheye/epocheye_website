"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

/**
 * Pointer-magnetic button/link. On fine pointers it eases toward the cursor and
 * springs back on leave; on touch it's an ordinary element. Pairs with the
 * custom cursor (data-cursor) for the swell effect.
 */
export default function MagneticButton({
	as: Tag = "a",
	children,
	className = "",
	strength = 0.4,
	...rest
}) {
	const ref = useRef(null);

	useGSAP(
		() => {
			const el = ref.current;
			if (!el) return;
			if (!window.matchMedia?.("(pointer: fine)").matches) return;

			const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3" });
			const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3" });
			const onMove = (e) => {
				const r = el.getBoundingClientRect();
				xTo((e.clientX - (r.left + r.width / 2)) * strength);
				yTo((e.clientY - (r.top + r.height / 2)) * strength);
			};
			const onLeave = () => {
				xTo(0);
				yTo(0);
			};
			el.addEventListener("mousemove", onMove);
			el.addEventListener("mouseleave", onLeave);
			return () => {
				el.removeEventListener("mousemove", onMove);
				el.removeEventListener("mouseleave", onLeave);
			};
		},
		{ scope: ref }
	);

	return (
		<Tag ref={ref} className={`inline-block will-change-transform ${className}`} data-cursor {...rest}>
			{children}
		</Tag>
	);
}
