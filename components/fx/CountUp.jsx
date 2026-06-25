"use client";

import { useRef } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

/**
 * Counts a number up to `value` the first time it scrolls into view.
 * `prefix`/`suffix` frame the number (e.g. "10,000" + "+"). Thousands are
 * grouped. Reduced-motion renders the final value immediately.
 */
export default function CountUp({
	value = 0,
	prefix = "",
	suffix = "",
	duration = 1.6,
	className = "",
}) {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, amount: 0.6 });
	const reduced = useReducedMotion();

	useGSAP(
		() => {
			const el = ref.current;
			if (!el) return;
			const format = (n) => prefix + Math.round(n).toLocaleString("en-US") + suffix;
			if (!inView || reduced) {
				el.textContent = format(value);
				return;
			}
			const obj = { n: 0 };
			gsap.to(obj, {
				n: value,
				duration,
				ease: "power3.out",
				onUpdate: () => {
					el.textContent = format(obj.n);
				},
			});
		},
		{ dependencies: [inView, value], scope: ref }
	);

	return (
		<span ref={ref} className={className}>
			{prefix}
			{value.toLocaleString("en-US")}
			{suffix}
		</span>
	);
}
