"use client";

// React Bits' DecryptedText, rebuilt on GSAP's ScrambleText plugin.

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(ScrambleTextPlugin, useGSAP);

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Decrypts into `text` whenever it changes. */
export function ScrambleText({ text, className = "", duration = 0.9, chars = "upperCase", as: Tag = "span" }) {
	const ref = useRef(null);
	useGSAP(
		() => {
			const el = ref.current;
			if (!el) return;
			if (reduced()) {
				el.textContent = text;
				return;
			}
			gsap.to(el, { duration, scrambleText: { text, chars, speed: 0.6, revealDelay: 0.15 }, ease: "none" });
		},
		{ dependencies: [text], scope: ref }
	);
	return (
		<Tag ref={ref} className={className} aria-label={text}>
			{text}
		</Tag>
	);
}
