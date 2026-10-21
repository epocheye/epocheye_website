"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Line-by-line reveal: split into lines, each masked, translateY 100% to 0, 0.9s, power3.out,
 * 0.08s stagger, when the frame enters. The text is real HTML on first paint; the split only
 * happens after hydration and after fonts load, and is skipped under prefers-reduced-motion.
 */
export default function SplitReveal({ as: Tag = "h2", className = "", children, start = "top 72%" }) {
	const ref = useRef(null);

	useGSAP(() => {
		const el = ref.current;
		if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const trigger = el.closest("[data-frame], [data-section]") || el;
		let split = null;
		let cancelled = false;
		// Split after hydration has settled and fonts are in, so the first paint is never blocked.
		const idle = window.requestIdleCallback || ((fn) => window.setTimeout(fn, 200));
		const id = idle(() => {
			document.fonts.ready.then(() => {
				if (cancelled) return;
				split = SplitText.create(el, {
					type: "lines",
					mask: "lines",
					linesClass: "line",
					autoSplit: true,
					onSplit: (self) =>
						gsap.from(self.lines, {
							yPercent: 100,
							duration: 0.9,
							ease: "power3.out",
							stagger: 0.08,
							scrollTrigger: { trigger, start, once: true },
						}),
				});
			});
		});
		return () => {
			cancelled = true;
			(window.cancelIdleCallback || window.clearTimeout)(id);
			split?.revert();
		};
	});

	return (
		<Tag ref={ref} className={`jr-split ${className}`.trim()}>
			{children}
		</Tag>
	);
}
