"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
	AnimatePresence,
	motion,
	useAnimationFrame,
	useMotionValue,
	useReducedMotion,
	useScroll,
	useSpring,
	useTransform,
	useVelocity,
} from "motion/react";

import { LEGAL_NAME } from "@/lib/site";
import { EASE, Reveal, ScrollReveal, SplitText, TiltCard } from "./fx";

// Hairline grid drawn in CSS: the page's recurring motif.
export const GRID_BG = {
	backgroundImage:
		"linear-gradient(rgba(242,239,230,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(242,239,230,0.07) 1px, transparent 1px)",
	backgroundSize: "56px 56px",
};

function Label({ index, children }) {
	return (
		<p className="mb-8 flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.22em] text-bone-muted">
			<span className="text-signal">{index}</span>
			<span className="h-px w-10 bg-rule" />
			{children}
		</p>
	);
}

export function Manifesto() {
	return (
		<section className="relative bg-ink px-5 py-32 sm:px-10 sm:py-44" aria-label="Why Epocheye">
			<div className="absolute inset-0 opacity-60" style={GRID_BG} aria-hidden="true" />
			<div className="relative mx-auto max-w-6xl">
				<Label index="01">The record, in place</Label>
				<ScrollReveal
					className="font-montserrat text-[clamp(1.9rem,4.6vw,4.4rem)] font-medium leading-[1.08] tracking-[-0.02em] text-bone"
					text="Every monument was once complete. Point your phone at what stands today and Epocheye shows it as the historical record describes it, and says plainly where the record runs out."
				/>
			</div>
		</section>
	);
}

const INCLUDES = [
	{
		k: "01",
		title: "One monument, one unlock",
		body: "A pre-order is for one monument. When you unlock it in the app, it is a one-time unlock. Not a subscription.",
	},
	{
		k: "04h",
		title: "Four hours on site",
		body: "Each unlock gives you 4 hours of access, so you can walk the whole site at your own pace.",
	},
	{
		k: "00",
		title: "Nothing to pay today",
		body: "Pre-ordering holds your place and costs nothing. We email you about your pre-order before your visit.",
	},
];

export function Includes() {
	return (
		<section className="relative bg-ink-2 px-5 py-32 sm:px-10 sm:py-40" aria-label="What you pre-order">
			<div className="mx-auto max-w-6xl">
				<Label index="02">What you pre-order</Label>
				<h2 className="mb-16 max-w-3xl font-montserrat text-[clamp(2.4rem,6vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-bone">
					<SplitText text="A window" stagger={0.025} />
					<span className="font-instrument-serif font-normal italic text-signal"> into the record.</span>
				</h2>
				<div className="grid gap-6 md:grid-cols-3">
					{INCLUDES.map((item, i) => (
						<Reveal key={item.title} delay={i * 0.12} className="h-full">
							<TiltCard className="overflow-hidden rounded-2xl border border-rule bg-ink">
								<div className="relative flex h-full min-h-[340px] flex-col justify-between p-7">
									<div
										className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 origin-bottom opacity-70"
										style={{
											...GRID_BG,
											backgroundSize: "28px 28px",
											transform: "perspective(400px) rotateX(58deg)",
											maskImage: "linear-gradient(to top, #000, transparent)",
											WebkitMaskImage: "linear-gradient(to top, #000, transparent)",
										}}
										aria-hidden="true"
									/>
									<span className="font-montserrat text-6xl font-semibold tracking-tight text-ghost [-webkit-text-stroke:1px_rgba(204,255,0,0.55)]">
										{item.k}
									</span>
									<div className="relative">
										<h3 className="mb-3 font-montserrat text-xl font-semibold text-bone">{item.title}</h3>
										<p className="text-sm leading-relaxed text-bone/60">{item.body}</p>
									</div>
								</div>
							</TiltCard>
						</Reveal>
					))}
				</div>
			</div>
		</section>
	);
}

const FAQ = [
	{
		q: "Do I pay anything now?",
		a: "No. A pre-order costs nothing. It holds your place and gives us a way to email you about it.",
	},
	{
		q: "What does an unlock include?",
		a: "Access to one monument in the Epocheye app for 4 hours. It is a one-time unlock, not a subscription.",
	},
	{
		q: "Where does Epocheye work?",
		a: "Tipu Sultan's Summer Palace and Bangalore Fort in Bengaluru, and the Indian Museum and Victoria Memorial in Kolkata.",
	},
	{
		q: "Where do I get the app?",
		a: "Epocheye is on Google Play. Search Epocheye (you may hear it as “Epoch Eye”).",
	},
	{
		q: "Can I change or cancel my pre-order?",
		a: "Yes. Write to support@epocheye.app with your reference and we will change or remove it.",
	},
];

function FaqItem({ item, open, onToggle, index }) {
	return (
		<div className="border-b border-rule">
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={open}
				className="group flex w-full items-center justify-between gap-6 py-7 text-left"
				data-cursor>
				<span className="flex items-baseline gap-5">
					<span className="font-mono text-[11px] text-bone-faint">{String(index + 1).padStart(2, "0")}</span>
					<span className="font-montserrat text-lg font-medium text-bone transition-colors group-hover:text-signal sm:text-2xl">
						{item.q}
					</span>
				</span>
				<motion.span
					animate={{ rotate: open ? 45 : 0 }}
					transition={{ duration: 0.5, ease: EASE }}
					className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-rule text-bone">
					+
				</motion.span>
			</button>
			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.6, ease: EASE }}
						className="overflow-hidden">
						<p className="max-w-2xl pb-8 pl-10 text-base leading-relaxed text-bone/65">{item.a}</p>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

export function Faq() {
	const [open, setOpen] = useState(0);
	return (
		<section className="relative bg-ink px-5 py-32 sm:px-10 sm:py-40" aria-label="Questions">
			<div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1fr_1.6fr]">
				<div>
					<Label index="05">Questions</Label>
					<h2 className="font-montserrat text-[clamp(2.2rem,5vw,4.2rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-bone">
						Before you <span className="font-instrument-serif font-normal italic text-signal">go.</span>
					</h2>
				</div>
				<div className="border-t border-rule">
					{FAQ.map((item, i) => (
						<FaqItem key={item.q} item={item} index={i} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
					))}
				</div>
			</div>
		</section>
	);
}

const wrap = (min, max, v) => {
	const r = max - min;
	return ((((v - min) % r) + r) % r) + min;
};

/** Marquee whose speed and direction follow scroll velocity (React Bits ScrollVelocity). */
function VelocityMarquee({ text, base = 3 }) {
	const reduced = useReducedMotion();
	const x = useMotionValue(0);
	const { scrollY } = useScroll();
	const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
	const factor = useTransform(velocity, [-1000, 0, 1000], [-4, 0, 4], { clamp: false });
	const skew = useTransform(velocity, [-2000, 2000], [8, -8]);
	const dir = useRef(1);
	const xPercent = useTransform(x, (v) => `${wrap(-50, 0, v)}%`);

	useAnimationFrame((_, delta) => {
		if (reduced) return;
		const f = factor.get();
		if (f < 0) dir.current = -1;
		else if (f > 0) dir.current = 1;
		x.set(x.get() + dir.current * base * (delta / 1000) * (1 + Math.abs(f)) * -1);
	});

	return (
		<div className="overflow-hidden whitespace-nowrap" aria-hidden="true">
			<motion.div style={{ x: xPercent, skewX: skew }} className="inline-flex">
				{[0, 1].map((k) => (
					<span key={k} className="flex shrink-0 items-center">
						{Array.from({ length: 4 }).map((_, i) => (
							<span
								key={i}
								className="px-6 font-montserrat text-[clamp(4rem,12vw,11rem)] font-semibold leading-none tracking-[-0.04em] text-bone">
								{text}
								<span className="px-6 text-signal">✦</span>
							</span>
						))}
					</span>
				))}
			</motion.div>
		</div>
	);
}

export function Outro() {
	return (
		<footer className="relative overflow-hidden bg-ink-3 pt-28" aria-label="Footer">
			<div className="absolute inset-0 opacity-50" style={GRID_BG} aria-hidden="true" />
			<div className="relative">
				<VelocityMarquee text="Pre-order the past" />
				<div className="mx-auto mt-24 flex max-w-6xl flex-col gap-10 px-5 pb-10 sm:px-10 md:flex-row md:items-end md:justify-between">
					<nav className="flex flex-wrap gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-[0.2em] text-bone-muted">
						{[
							["/", "Home"],
							["/monuments", "Monuments"],
							["/download", "Download"],
							["/privacy", "Privacy"],
							["/terms", "Terms"],
						].map(([href, label]) => (
							<Link key={href} href={href} className="transition-colors hover:text-signal" data-cursor>
								{label}
							</Link>
						))}
					</nav>
					<p className="font-mono text-[11px] uppercase tracking-[0.2em] text-bone-faint">
						© {LEGAL_NAME}
					</p>
				</div>
			</div>
		</footer>
	);
}
