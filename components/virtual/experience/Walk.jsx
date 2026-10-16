"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";

import { STOPS, TIERS } from "@/lib/virtual/journey";
import { CHAPTERS, EVIDENCE_LEGEND, EVIDENCE_TOGGLE, EVIDENCE_TOGGLE_OFF, HEAR_FIRST_STOP, LOADER_LINE } from "@/lib/virtual/copy";
import { FIRST_STOP_AUDIO, HUNTER_PAINTING, STILLS } from "@/lib/virtual/media";
import { journey } from "./store";
import AudioButton from "../AudioButton";
import { scrollToForm } from "../scrollToForm";
import { trackVirtual } from "../track";

// three.js loads only when the walk approaches the viewport; first paint never waits on it.
const PalaceCanvas = dynamic(() => import("./PalaceCanvas"), { ssr: false });

const EASE = [0.22, 1, 0.36, 1];
const LAST = STOPS.length - 1;
const SCREENS_PER_CHAPTER = 1.15;

function canUseWebGL() {
	try {
		const c = document.createElement("canvas");
		return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
	} catch {
		return false;
	}
}

export default function Walk({ showSlots, ctaLabel }) {
	const sectionRef = useRef(null);
	const [mount, setMount] = useState(false);
	const [active, setActive] = useState(false);
	const [ready, setReady] = useState(false);
	const [webgl, setWebgl] = useState(true);
	const [quality, setQuality] = useState("high");
	const [stream, setStream] = useState(false);
	const [evidence, setEvidence] = useState(false);
	const [chapter, setChapter] = useState({ index: 0, visible: true });
	const [capture, setCapture] = useState(false);

	useEffect(() => {
		const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
		const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
		journey.reducedMotion = reduce;

		// Capture mode for posters and review screenshots: /virtual?shot=<stop id>&clean=1
		const params = new URLSearchParams(window.location.search);
		const shot = STOPS.findIndex((s) => s.id === params.get("shot"));
		if (shot >= 0) {
			journey.locked = true;
			journey.t = shot;
			journey.reducedMotion = true;
			window.__journey = journey;
		}
		startTransition(() => {
			setWebgl(canUseWebGL());
			setQuality(params.get("q") || (coarse ? "low" : "high"));
			if (shot >= 0) {
				setCapture(true);
				setMount(true);
				setActive(true);
				setStream(true);
			}
		});

		const section = sectionRef.current;
		if (!section) return undefined;

		const near = new IntersectionObserver(([e]) => e.isIntersecting && startTransition(() => setMount(true)), { rootMargin: "120% 0px" });
		const inView = new IntersectionObserver(([e]) => startTransition(() => setActive(e.isIntersecting || journey.locked)));
		near.observe(section);
		inView.observe(section);

		let last = "";
		const onScroll = () => {
			if (journey.locked) return;
			const top = section.offsetTop;
			const span = Math.max(1, section.offsetHeight - window.innerHeight);
			const p = Math.min(1, Math.max(0, (window.scrollY - top) / span));
			journey.t = p * LAST;
			const index = Math.min(Math.floor(journey.t), LAST);
			const frac = journey.t - index;
			const visible = index === LAST || frac < 0.6;
			const key = `${index}:${visible}`;
			if (key !== last) {
				last = key;
				startTransition(() => setChapter({ index, visible }));
			}
			if (journey.t > 0.2) startTransition(() => setStream(true));
		};
		const onPointer = (e) => {
			journey.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
			journey.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
		};
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);
		window.addEventListener("pointermove", onPointer, { passive: true });
		return () => {
			near.disconnect();
			inView.disconnect();
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
			window.removeEventListener("pointermove", onPointer);
		};
	}, []);

	const canvas =
		mount && webgl ? (
			<PalaceCanvas
				evidence={evidence}
				quality={quality}
				active={active}
				capture={capture}
				streamTextures={stream}
				onReady={() => setReady(true)}
				onLost={() => {
					console.warn("[virtual] WebGL context lost; showing the still instead.");
					setWebgl(false);
				}}
				onDecline={() => setQuality((q) => (q === "high" && window.matchMedia?.("(pointer: coarse)").matches ? "low" : q))}
			/>
		) : null;

	if (capture) {
		return <div className="fixed inset-0 z-[100] bg-black">{canvas}</div>;
	}

	const stop = STOPS[chapter.index];
	const copy = CHAPTERS[stop.id];

	return (
		<section ref={sectionRef} id="walk" aria-label="Walk through the palace" className="relative bg-[#f4efe6]" style={{ height: `${STOPS.length * SCREENS_PER_CHAPTER * 100}svh` }}>
			<div className="sticky top-0 flex h-svh flex-col pt-16 lg:flex-row">
				{/* The palace, full bleed. */}
				<div className="relative h-[56%] w-full overflow-hidden bg-[#d8c6a4] lg:order-2 lg:h-full lg:flex-1">
					<Image src={STILLS.walk.src} alt={STILLS.walk.alt} fill sizes="(min-width: 1024px) 62vw, 100vw" className="object-cover" />
					{canvas}
					<AnimatePresence>
						{mount && webgl && !ready ? (
							<motion.p
								key="loading"
								exit={{ opacity: 0 }}
								transition={{ duration: 1.2 }}
								className="absolute bottom-4 left-4 font-instrument-serif text-lg italic text-white drop-shadow">
								{LOADER_LINE}
							</motion.p>
						) : null}
					</AnimatePresence>
				</div>

				{/* The words, beside it on desktop and below it on phones. */}
				<div className="relative flex flex-1 flex-col justify-center px-6 pb-24 pt-6 sm:px-10 lg:order-1 lg:w-[38%] lg:flex-none lg:px-14 lg:pb-12">
					<AnimatePresence mode="wait">
						{chapter.visible ? (
							<motion.div
								key={stop.id}
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -6 }}
								transition={{ duration: 0.9, ease: EASE }}
								className="max-w-md">
								<p className="font-instrument-serif text-lg italic text-[#3f7f78]">{copy.nav}</p>
								<h3 className="mt-2 font-instrument-serif text-3xl leading-[1.08] text-[#2e1f16] sm:text-5xl">{copy.title}</h3>
								<p className="mt-4 font-instrument-sans text-[15px] leading-relaxed text-[#5c4636] sm:text-lg">{copy.body}</p>
								<ChapterExtra id={stop.id} showSlots={showSlots} ctaLabel={ctaLabel} />
							</motion.div>
						) : null}
					</AnimatePresence>

					<div className="mt-auto hidden items-center gap-6 pt-8 lg:flex">
						<Progress index={chapter.index} />
						{webgl ? (
							<button
								type="button"
								onClick={() =>
									setEvidence((on) => {
										if (!on) trackVirtual("virtual_evidence_view");
										return !on;
									})
								}
								aria-pressed={evidence}
								className="shrink-0 font-instrument-sans text-sm text-[#3f7f78] underline underline-offset-4">
								{evidence ? EVIDENCE_TOGGLE_OFF : EVIDENCE_TOGGLE}
							</button>
						) : null}
					</div>
					{evidence ? <Legend /> : null}
				</div>
			</div>
		</section>
	);
}

function ChapterExtra({ id, showSlots, ctaLabel }) {
	if (id === "lawn") {
		return (
			<div className="mt-6">
				<AudioButton src={FIRST_STOP_AUDIO} label={HEAR_FIRST_STOP} showSlots={showSlots} />
			</div>
		);
	}
	if (id === "pillars") {
		if (HUNTER_PAINTING) {
			return (
				<figure className="mt-6">
					<div className="relative aspect-[4/3] w-full max-w-sm overflow-hidden">
						<Image src={HUNTER_PAINTING.src} alt={HUNTER_PAINTING.alt} fill sizes="380px" className="object-cover" />
					</div>
					<figcaption className="mt-2 font-instrument-sans text-xs text-[#5c4636]">{HUNTER_PAINTING.credit}</figcaption>
				</figure>
			);
		}
		return showSlots ? (
			<div className="mt-6 flex aspect-[4/3] w-full max-w-sm items-center justify-center border border-dashed border-[#b48a3c]/60 p-4 text-center">
				<p className="font-mono text-[11px] leading-relaxed text-[#5c4636]">
					SLOT: James Hunter, 1792, this front. public/virtual/hunter-1792.jpg + credit line in lib/virtual/media.js
				</p>
			</div>
		) : null;
	}
	if (id === "dusk") {
		return (
			<button type="button" onClick={scrollToForm} className="mt-6 bg-[#c0614a] px-7 py-3 font-instrument-sans text-base font-medium text-white transition-colors duration-500 hover:bg-[#a44f3b]">
				{ctaLabel}
			</button>
		);
	}
	return null;
}

function Progress({ index }) {
	return (
		<div className="flex flex-1 items-center gap-1.5" aria-hidden="true">
			{STOPS.map((s, i) => (
				<span key={s.id} className={`h-px flex-1 transition-colors duration-700 ${i <= index ? "bg-[#2e1f16]" : "bg-[#2e1f16]/15"}`} />
			))}
		</div>
	);
}

function Legend() {
	return (
		<ul className="mt-4 hidden flex-wrap gap-x-5 gap-y-2 lg:flex">
			{Object.entries(TIERS).map(([key, tier]) => (
				<li key={key} className="flex items-center gap-2 font-instrument-sans text-xs text-[#5c4636]">
					<span className="h-2.5 w-2.5" style={{ backgroundColor: tier.color }} />
					{EVIDENCE_LEGEND[key]}
				</li>
			))}
		</ul>
	);
}
