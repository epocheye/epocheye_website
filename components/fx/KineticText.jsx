"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
	gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const NBSP = " ";

function tokenize(line, split) {
	if (split === "char") return Array.from(line).map((ch) => (ch === " " ? NBSP : ch));
	// word split — keep a hard space after each word so inline-block words don't collapse
	return line.split(" ").map((w, i, arr) => (i < arr.length - 1 ? w + NBSP : w));
}

/**
 * Kinetic display type. Splits `text` (\n = line break) into word/char tokens,
 * each masked behind an overflow-hidden wrapper, and reveals them from below on
 * scroll with a stagger. Optional `skew` adds a scroll-velocity lean.
 * Honors reduced-motion (CSS forces the final state; the tween simply no-ops).
 */
export default function KineticText({
	text = "",
	as: Tag = "span",
	className = "",
	split = "word",
	stagger = 0.06,
	duration = 0.9,
	start = "top 85%",
	skew = false,
	delay = 0,
	style,
}) {
	const ref = useRef(null);
	const lines = String(text).split("\n");

	useGSAP(
		() => {
			const el = ref.current;
			if (!el) return;
			const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
			const targets = el.querySelectorAll("[data-kin]");
			if (!targets.length || reduced) return;

			gsap.set(targets, { yPercent: 115 });
			gsap.to(targets, {
				yPercent: 0,
				duration,
				delay,
				ease: "power4.out",
				stagger,
				scrollTrigger: { trigger: el, start },
			});
		},
		{ scope: ref }
	);

	return (
		<Tag ref={ref} className={`kinetic ${className}`} style={style}>
			{lines.map((line, li) => (
				<span className="kin-line" key={li}>
					{tokenize(line, split).map((tok, ti) => (
						<span
							key={ti}
							style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom" }}>
							<span data-kin style={{ display: "inline-block" }}>
								{tok}
							</span>
						</span>
					))}
				</span>
			))}
		</Tag>
	);
}
