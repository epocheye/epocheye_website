"use client";

// Motion primitives for /preorder, adapted from React Bits patterns
// (SplitText, DecryptedText, ScrollReveal, TiltedCard) onto motion.dev.

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";

export const EASE = [0.22, 1, 0.36, 1];

/** Per-character mask reveal: each glyph tips up out of depth. */
export function SplitText({ text, className = "", delay = 0, stagger = 0.035, as: Tag = "span" }) {
	const reduced = useReducedMotion();
	const lines = String(text).split("\n");
	const offsets = lines.map((_, li) => lines.slice(0, li).reduce((n, l) => n + Array.from(l).length, 0));
	return (
		<Tag className={className} aria-label={text.replace(/\n/g, " ")}>
			{lines.map((line, li) => (
				<span key={li} className="block whitespace-nowrap" aria-hidden="true">
					{Array.from(line).map((ch, ci) => {
						const i = offsets[li] + ci;
						return (
							<span key={ci} className="inline-block overflow-hidden align-bottom" style={{ perspective: 600 }}>
								<motion.span
									className="inline-block origin-bottom"
									initial={reduced ? false : { y: "110%", rotateX: -70, opacity: 0 }}
									animate={{ y: "0%", rotateX: 0, opacity: 1 }}
									transition={{ duration: 1.1, ease: EASE, delay: delay + i * stagger }}>
									{ch === " " ? "\u00A0" : ch}
								</motion.span>
							</span>
						);
					})}
				</span>
			))}
		</Tag>
	);
}

const GLYPHS = "ABCDEFGHJKMNPQRSTUVWXYZ0123456789#%&*+=/<>";

/** Scrambles to its text once it scrolls into view. */
export function DecryptedText({ text, className = "", speed = 28, delay = 0 }) {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, margin: "-10% 0px" });
	const reduced = useReducedMotion();
	const [out, setOut] = useState(text);

	useEffect(() => {
		if (!inView || reduced) return;
		let frame = 0;
		let timer;
		const total = text.length;
		const start = setTimeout(() => {
			timer = setInterval(() => {
				frame += 1;
				const revealed = Math.floor(frame / 1.6);
				setOut(
					Array.from(text)
						.map((ch, i) => (ch === " " || i < revealed ? ch : GLYPHS[(i * 7 + frame) % GLYPHS.length]))
						.join("")
				);
				if (revealed >= total) clearInterval(timer);
			}, speed);
		}, delay * 1000);
		return () => {
			clearTimeout(start);
			clearInterval(timer);
		};
	}, [inView, reduced, text, speed, delay]);

	return (
		<span ref={ref} className={className} aria-label={text}>
			<span aria-hidden="true">{out}</span>
		</span>
	);
}

function Word({ children, progress, range }) {
	const opacity = useTransform(progress, range, [0.12, 1]);
	const blur = useTransform(progress, range, [6, 0]);
	const filter = useMotionTemplate`blur(${blur}px)`;
	return (
		<motion.span style={{ opacity, filter }} className="inline-block">
			{children}&nbsp;
		</motion.span>
	);
}

/** Scroll-linked word reveal: each word sharpens as the paragraph crosses the viewport. */
export function ScrollReveal({ text, className = "" }) {
	const ref = useRef(null);
	const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
	const words = String(text).split(" ");
	return (
		<p ref={ref} className={className}>
			{words.map((w, i) => (
				<Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
					{w}
				</Word>
			))}
		</p>
	);
}

/** Pointer-tilted card with a following spotlight and a lifted inner layer. */
export function TiltCard({ children, className = "", max = 12 }) {
	const ref = useRef(null);
	const rx = useMotionValue(0);
	const ry = useMotionValue(0);
	const mx = useMotionValue(50);
	const my = useMotionValue(50);
	const rotateX = useSpring(rx, { stiffness: 160, damping: 20 });
	const rotateY = useSpring(ry, { stiffness: 160, damping: 20 });
	const glow = useMotionTemplate`radial-gradient(420px circle at ${mx}% ${my}%, rgba(204,255,0,0.14), transparent 60%)`;

	const onMove = (e) => {
		const r = ref.current?.getBoundingClientRect();
		if (!r) return;
		const px = (e.clientX - r.left) / r.width;
		const py = (e.clientY - r.top) / r.height;
		ry.set((px - 0.5) * max * 2);
		rx.set(-(py - 0.5) * max * 2);
		mx.set(px * 100);
		my.set(py * 100);
	};
	const onLeave = () => {
		rx.set(0);
		ry.set(0);
	};

	return (
		<div style={{ perspective: 1100 }} className="h-full">
			<motion.div
				ref={ref}
				onPointerMove={onMove}
				onPointerLeave={onLeave}
				style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
				className={`relative h-full ${className}`}
				data-cursor>
				<motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: glow }} />
				<div style={{ transform: "translateZ(40px)" }} className="relative h-full">
					{children}
				</div>
			</motion.div>
		</div>
	);
}

/** Fade/lift into view once. */
export function Reveal({ children, className = "", delay = 0, y = 40 }) {
	const reduced = useReducedMotion();
	return (
		<motion.div
			className={className}
			initial={reduced ? false : { opacity: 0, y }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-12% 0px" }}
			transition={{ duration: 1, ease: EASE, delay }}>
			{children}
		</motion.div>
	);
}
