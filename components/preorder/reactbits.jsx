"use client";

// React Bits patterns (Magnet, BlurText, CountUp), rebuilt on GSAP and
// anime.js so the page runs on GSAP, anime.js and three.js only.

import { Fragment, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { animate } from "animejs";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Pulls toward the pointer when it comes near (React Bits Magnet). */
export function Magnet({ children, strength = 0.35, className = "", ...rest }) {
	const ref = useRef(null);
	useGSAP(
		() => {
			const el = ref.current;
			if (!el || !window.matchMedia?.("(pointer: fine)").matches) return;
			const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
			const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
			const move = (e) => {
				const r = el.getBoundingClientRect();
				x((e.clientX - (r.left + r.width / 2)) * strength);
				y((e.clientY - (r.top + r.height / 2)) * strength);
			};
			const leave = () => {
				x(0);
				y(0);
			};
			el.addEventListener("pointermove", move);
			el.addEventListener("pointerleave", leave);
			return () => {
				el.removeEventListener("pointermove", move);
				el.removeEventListener("pointerleave", leave);
			};
		},
		{ scope: ref }
	);
	return (
		<span ref={ref} className={`inline-block will-change-transform ${className}`} {...rest}>
			{children}
		</span>
	);
}

/**
 * Words come into focus one after another, rising out of a blur, when the line
 * scrolls into view (React Bits BlurText). `immediate` plays it on mount.
 */
export function BlurText({ text, as: Tag = "span", className = "", immediate = false, delay = 0 }) {
	const ref = useRef(null);
	useGSAP(
		() => {
			const words = ref.current?.querySelectorAll("[data-word]");
			if (!words?.length || reduced()) return;
			gsap.fromTo(
				words,
				{ opacity: 0, y: "0.35em", filter: "blur(10px)" },
				{
					opacity: 1,
					y: 0,
					filter: "blur(0px)",
					duration: 0.9,
					ease: "power3.out",
					stagger: 0.07,
					delay,
					scrollTrigger: immediate ? undefined : { trigger: ref.current, start: "top 85%", once: true },
				}
			);
		},
		{ scope: ref }
	);
	return (
		<Tag ref={ref} className={className} aria-label={text}>
			{/* Spaces sit between the word boxes, so a wrapped line never starts indented. */}
			{text.split(" ").map((w, i) => (
				<Fragment key={i}>
					{i > 0 && " "}
					<span data-word aria-hidden="true" className="inline-block">
						{w}
					</span>
				</Fragment>
			))}
		</Tag>
	);
}

/** Counts up to `value` (React Bits CountUp), and on to any new value it is given. */
export function CountUp({ value, className = "" }) {
	const ref = useRef(null);
	const shown = useRef({ n: 0 });
	useEffect(() => {
		const el = ref.current;
		if (!el || value == null) return;
		if (reduced()) {
			shown.current.n = value;
			el.textContent = String(value);
			return;
		}
		const a = animate(shown.current, {
			n: value,
			duration: 1200,
			ease: "outExpo",
			onUpdate: () => {
				el.textContent = String(Math.round(shown.current.n));
			},
		});
		return () => a.pause();
	}, [value]);
	return (
		<span ref={ref} className={`tabular-nums ${className}`}>
			{value == null ? "–" : 0}
		</span>
	);
}
