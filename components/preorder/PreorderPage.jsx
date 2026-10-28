"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import Cursor from "@/components/fx/Cursor";
import Hero from "./Hero";
import { GRID_BG } from "./Sections";
import { Reveal } from "./fx";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

// Everything below the hero loads lazily, as on the home page.
const Manifesto = dynamic(() => import("./Sections").then((m) => m.Manifesto), {
	loading: () => <div className="min-h-[80vh] bg-ink" />,
});
const Includes = dynamic(() => import("./Sections").then((m) => m.Includes), {
	loading: () => <div className="min-h-screen bg-ink-2" />,
});
const MonumentRail = dynamic(() => import("./MonumentRail"), {
	loading: () => <div className="min-h-screen bg-ink" />,
});
const Faq = dynamic(() => import("./Sections").then((m) => m.Faq), {
	loading: () => <div className="min-h-[80vh] bg-ink" />,
});
const Outro = dynamic(() => import("./Sections").then((m) => m.Outro), {
	loading: () => <div className="min-h-[60vh] bg-ink-3" />,
});
// Client-only: the visit-month list depends on the visitor's clock.
const ReserveForm = dynamic(() => import("./ReserveForm"), {
	ssr: false,
	loading: () => <div className="min-h-[640px] rounded-3xl border border-rule bg-ink/80" />,
});

/**
 * Pins measure their start/end once. The announcement banner and the lazy
 * sections change the page height after that, so re-measure when it does.
 */
function useRefreshOnResize() {
	useEffect(() => {
		let frame = 0;
		let lastHeight = document.body.scrollHeight;
		const ro = new ResizeObserver(() => {
			const h = document.body.scrollHeight;
			if (h === lastHeight) return;
			lastHeight = h;
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => ScrollTrigger.refresh());
		});
		ro.observe(document.body);
		return () => {
			cancelAnimationFrame(frame);
			ro.disconnect();
		};
	}, []);
}

/** Lenis smooth scroll on the GSAP ticker; native scroll on touch / reduced motion. */
function useSmoothScroll() {
	useEffect(() => {
		const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		const touch = window.matchMedia?.("(pointer: coarse)").matches;
		if (reduced || touch) {
			ScrollTrigger.refresh();
			return;
		}
		const lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
		lenis.on("scroll", ScrollTrigger.update);
		const raf = (time) => lenis.raf(time * 1000);
		gsap.ticker.add(raf);
		gsap.ticker.lagSmoothing(0);
		window.__lenis = lenis;
		ScrollTrigger.refresh();
		return () => {
			lenis.off("scroll", ScrollTrigger.update);
			gsap.ticker.remove(raf);
			lenis.destroy();
			if (window.__lenis === lenis) window.__lenis = null;
		};
	}, []);
}

function Reserve() {
	return (
		<section id="reserve" className="relative scroll-mt-6 bg-ink-2 px-5 py-32 sm:px-10 sm:py-40" aria-label="Pre-order">
			<div className="absolute inset-0 opacity-40" style={GRID_BG} aria-hidden="true" />
			<div className="pointer-events-none absolute left-1/2 top-1/3 h-[50vh] w-[70vw] -translate-x-1/2 rounded-full bg-signal/[0.06] blur-[120px]" aria-hidden="true" />
			<div className="relative mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1fr_1.35fr] lg:gap-20">
				<div>
					<p className="mb-8 flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.22em] text-bone-muted">
						<span className="text-signal">04</span>
						<span className="h-px w-10 bg-rule" />
						Pre-order
					</p>
					<Reveal>
						<h2 className="font-montserrat text-[clamp(2.6rem,6vw,5.6rem)] font-semibold leading-[0.92] tracking-[-0.03em] text-bone">
							Hold your
							<span className="block font-instrument-serif font-normal italic text-signal">place.</span>
						</h2>
					</Reveal>
					<Reveal delay={0.15}>
						<ul className="mt-10 space-y-4 text-base text-bone/65">
							{["Choose the monument you are visiting.", "Leave your name and email.", "Get a reference. Pay nothing today."].map((line, i) => (
								<li key={line} className="flex gap-4">
									<span className="font-mono text-[11px] leading-6 text-signal">{String(i + 1).padStart(2, "0")}</span>
									{line}
								</li>
							))}
						</ul>
					</Reveal>
				</div>
				<Reveal delay={0.1}>
					<ReserveForm />
				</Reveal>
			</div>
		</section>
	);
}

export default function PreorderPage() {
	useSmoothScroll();
	useRefreshOnResize();
	return (
		<main className="overflow-x-clip bg-ink text-bone selection:bg-signal selection:text-ink">
			<Cursor />
			<Hero />
			<Manifesto />
			<Includes />
			<MonumentRail />
			<Reserve />
			<Faq />
			<Outro />
			<div className="grain-overlay" aria-hidden="true" />
		</main>
	);
}
