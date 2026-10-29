"use client";

// React Bits patterns (DecryptedText, Magnet, ClickSpark), rebuilt on GSAP and
// canvas so the page runs on GSAP, anime.js and three.js only.

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(ScrambleTextPlugin, useGSAP);

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Decrypts into `text` whenever it changes (React Bits DecryptedText). */
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

/** Sparks burst from every click (React Bits ClickSpark), drawn on one canvas. */
export function ClickSpark({ color = "#ffb020", count = 10, radius = 26, duration = 450 }) {
	const ref = useRef(null);
	useEffect(() => {
		const canvas = ref.current;
		if (!canvas || reduced()) return;
		const ctx = canvas.getContext("2d");
		const sparks = [];
		let raf = 0;
		const resize = () => {
			canvas.width = window.innerWidth * devicePixelRatio;
			canvas.height = window.innerHeight * devicePixelRatio;
		};
		const draw = (now) => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			for (let i = sparks.length - 1; i >= 0; i -= 1) {
				const s = sparks[i];
				const k = (now - s.t) / duration;
				if (k >= 1) {
					sparks.splice(i, 1);
					continue;
				}
				const e = 1 - Math.pow(1 - k, 3);
				const d = e * radius * devicePixelRatio;
				const len = (1 - e) * 10 * devicePixelRatio;
				ctx.strokeStyle = color;
				ctx.lineWidth = 2 * devicePixelRatio;
				ctx.beginPath();
				ctx.moveTo(s.x + d * Math.cos(s.a), s.y + d * Math.sin(s.a));
				ctx.lineTo(s.x + (d + len) * Math.cos(s.a), s.y + (d + len) * Math.sin(s.a));
				ctx.stroke();
			}
			raf = sparks.length ? requestAnimationFrame(draw) : 0;
		};
		const click = (e) => {
			const now = performance.now();
			for (let i = 0; i < count; i += 1) {
				sparks.push({ x: e.clientX * devicePixelRatio, y: e.clientY * devicePixelRatio, a: (i / count) * Math.PI * 2, t: now });
			}
			if (!raf) raf = requestAnimationFrame(draw);
		};
		resize();
		window.addEventListener("resize", resize);
		window.addEventListener("pointerdown", click);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", resize);
			window.removeEventListener("pointerdown", click);
		};
	}, [color, count, radius, duration]);
	return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[80] h-full w-full" aria-hidden="true" />;
}
