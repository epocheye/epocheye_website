"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(useGSAP);

/**
 * 3D mouse-parallax diorama. Any descendant with `data-depth` translates with
 * the cursor (px amount = depth); optional `data-ry` / `data-rx` add 3D rotation
 * (deg). Layers drift at different depths → real parallax volume. The root holds
 * the perspective. Desktop fine-pointer only; static on touch / reduced-motion.
 */
export default function MouseParallax({ children, className = "" }) {
	const ref = useRef(null);

	useGSAP(
		() => {
			const root = ref.current;
			if (!root) return;
			const fine = window.matchMedia?.("(pointer: fine)").matches;
			const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
			if (!fine || reduced) return;

			const layers = Array.from(root.querySelectorAll("[data-depth]"));
			if (!layers.length) return;

			const q = layers.map((l) => ({
				x: gsap.quickTo(l, "x", { duration: 0.7, ease: "power3" }),
				y: gsap.quickTo(l, "y", { duration: 0.7, ease: "power3" }),
				ry: gsap.quickTo(l, "rotationY", { duration: 0.7, ease: "power3" }),
				rx: gsap.quickTo(l, "rotationX", { duration: 0.7, ease: "power3" }),
			}));

			const onMove = (e) => {
				const r = root.getBoundingClientRect();
				const mx = (e.clientX - r.left) / r.width - 0.5;
				const my = (e.clientY - r.top) / r.height - 0.5;
				layers.forEach((l, i) => {
					const d = parseFloat(l.dataset.depth) || 0;
					q[i].x(mx * d);
					q[i].y(my * d);
					q[i].ry(mx * (parseFloat(l.dataset.ry) || 0));
					q[i].rx(-my * (parseFloat(l.dataset.rx) || 0));
				});
			};
			const onLeave = () => {
				q.forEach((qq) => {
					qq.x(0);
					qq.y(0);
					qq.ry(0);
					qq.rx(0);
				});
			};

			root.addEventListener("pointermove", onMove);
			root.addEventListener("pointerleave", onLeave);
			return () => {
				root.removeEventListener("pointermove", onMove);
				root.removeEventListener("pointerleave", onLeave);
			};
		},
		{ scope: ref }
	);

	return (
		<div ref={ref} className={`persp ${className}`}>
			{children}
		</div>
	);
}
