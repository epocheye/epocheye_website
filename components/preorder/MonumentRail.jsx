"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { LIVE_MONUMENTS } from "@/lib/monuments/live";
import { GRID_BG } from "./Sections";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

// Only what docs/canonical_public_claims.md ("Where it works") allows per monument.
const NOTES = {
	"tipu-summer-palace-bengaluru": "Reconstruction and narration in English and Hindi.",
};

/** Wireframe block that rises out of a perspective grid; each card's is offset. */
function GridTile({ seed }) {
	const heights = Array.from({ length: 25 }, (_, i) => {
		const x = i % 5;
		const z = Math.floor(i / 5);
		return 14 + Math.round((Math.sin(x * 1.3 + seed) + Math.cos(z * 1.1 + seed * 2)) * 18 + 22);
	});
	return (
		<div className="relative h-56 w-full overflow-hidden" style={{ perspective: 700 }} aria-hidden="true">
			<div
				data-tile
				className="absolute left-1/2 top-[58%] grid h-56 w-56 grid-cols-5 gap-2"
				style={{ transform: "translate(-50%,-50%) rotateX(62deg) rotateZ(45deg)", transformStyle: "preserve-3d" }}>
				{heights.map((h, i) => (
					<div key={i} className="relative" style={{ transformStyle: "preserve-3d" }}>
						<div className="absolute inset-0 border border-rule" />
						<div
							data-col
							className="absolute inset-0 border border-signal/60 bg-signal/[0.06]"
							style={{ transform: `translateZ(${h}px)`, "--h": `${h}px` }}
						/>
					</div>
				))}
			</div>
		</div>
	);
}

export default function MonumentRail() {
	const sectionRef = useRef(null);
	const trackRef = useRef(null);

	useGSAP(
		() => {
			const section = sectionRef.current;
			const track = trackRef.current;
			if (!section || !track) return;
			const mm = gsap.matchMedia();

			mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
				const distance = () => track.scrollWidth - window.innerWidth;
				const tween = gsap.to(track, {
					x: () => -distance(),
					ease: "none",
					scrollTrigger: {
						trigger: section,
						start: "top top",
						end: () => `+=${distance()}`,
						pin: true,
						scrub: 0.8,
						invalidateOnRefresh: true,
					},
				});

				gsap.utils.toArray("[data-card]", section).forEach((card) => {
					gsap.fromTo(
						card,
						{ rotateY: -24, z: -180, opacity: 0.35 },
						{
							rotateY: 0,
							z: 0,
							opacity: 1,
							ease: "none",
							scrollTrigger: { trigger: card, containerAnimation: tween, start: "left 95%", end: "center 55%", scrub: true },
						}
					);
					gsap.fromTo(
						card.querySelectorAll("[data-col]"),
						{ z: 0 },
						{
							z: (_, el) => parseFloat(el.style.getPropertyValue("--h")) || 20,
							ease: "power2.out",
							stagger: { each: 0.02, from: "random" },
							scrollTrigger: { trigger: card, containerAnimation: tween, start: "left 85%", end: "center 50%", scrub: true },
						}
					);
				});
			});

			return () => mm.revert();
		},
		{ scope: sectionRef }
	);

	return (
		<section ref={sectionRef} className="relative overflow-hidden bg-ink" aria-label="Where it works">
			<div className="absolute inset-0 opacity-50" style={GRID_BG} aria-hidden="true" />
			<div
				ref={trackRef}
				className="relative flex flex-col gap-6 px-5 py-28 sm:px-10 md:h-[100svh] md:w-max md:flex-row md:items-center md:gap-8 md:py-0"
				style={{ perspective: 1400 }}>
				<div className="flex shrink-0 flex-col justify-center md:w-[38vw] md:pr-10">
					<p className="mb-8 flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.22em] text-bone-muted">
						<span className="text-signal">03</span>
						<span className="h-px w-10 bg-rule" />
						Where it works
					</p>
					<h2 className="font-montserrat text-[clamp(2.6rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.03em] text-bone">
						Four monuments.
						<span className="block font-instrument-serif font-normal italic text-signal">Live now.</span>
					</h2>
					<p className="mt-8 max-w-sm text-base leading-relaxed text-bone/60">
						Pick the one you are visiting. Scroll to walk the grid.
					</p>
				</div>

				{LIVE_MONUMENTS.map((m, i) => (
					<article
						key={m.slug}
						data-card
						className="group relative flex shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-rule bg-ink-2/90 p-7 backdrop-blur-sm md:h-[72svh] md:w-[min(30rem,34vw)]"
						style={{ transformStyle: "preserve-3d" }}>
						<div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.22em] text-bone-muted">
							<span>
								{String(i + 1).padStart(2, "0")} / {String(LIVE_MONUMENTS.length).padStart(2, "0")}
							</span>
							<span className="flex items-center gap-2 text-signal">
								<span className="h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_12px_#ccff00]" />
								Live
							</span>
						</div>
						<GridTile seed={i * 1.7 + 0.4} />
						<div>
							<p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-bone-faint">{m.city}</p>
							<h3 className="font-montserrat text-3xl font-semibold leading-tight tracking-[-0.02em] text-bone sm:text-4xl">
								{m.name}
							</h3>
							{NOTES[m.slug] && <p className="mt-3 text-sm text-bone/55">{NOTES[m.slug]}</p>}
							<Link
								href={`/monuments/${m.slug}`}
								className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-bone-muted transition-colors hover:text-signal"
								data-cursor>
								Read the record <span className="transition-transform group-hover:translate-x-1">→</span>
							</Link>
						</div>
					</article>
				))}
				<div className="hidden w-[8vw] shrink-0 md:block" aria-hidden="true" />
			</div>
		</section>
	);
}
