"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import Lenis from "lenis";

import { STOPS, TIERS } from "@/lib/virtual/journey";
import { journey } from "./store";
import { trackVirtual } from "../track";

// three.js is code-split and starts loading after first paint; the poster carries the first frame.
const PalaceCanvas = dynamic(() => import("./PalaceCanvas"), { ssr: false });

const LAST = STOPS.length - 1;

function canUseWebGL() {
	try {
		const c = document.createElement("canvas");
		return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
	} catch {
		return false;
	}
}

// Every [data-beat] element on the page carries the camera position it stands for (data-t, in
// chapters). The camera follows the beat under the middle of the screen, interpolating between
// beat centres, so the words and the building always arrive together.
function readT() {
	const beats = document.querySelectorAll("[data-beat]");
	if (!beats.length) return 0;
	const mid = window.innerHeight / 2;
	let prev = null;
	for (const el of beats) {
		const r = el.getBoundingClientRect();
		const centre = r.top + r.height / 2;
		const t = Number(el.dataset.t);
		if (centre >= mid) {
			if (!prev) return t;
			const k = (mid - prev.centre) / Math.max(1, centre - prev.centre);
			return prev.t + (t - prev.t) * k;
		}
		prev = { centre, t };
	}
	return prev.t;
}

// The fixed 3D layer behind the whole walk: poster first, then the live palace, with grain and a
// vignette over both, a chapter rail on desktop and a progress line on phones.
export default function Stage({ poster, loaderLine, chapters, evidenceLabels }) {
	const [mount, setMount] = useState(false);
	const [ready, setReady] = useState(false);
	const [webgl, setWebgl] = useState(true);
	const [quality, setQuality] = useState("high");
	const [stream, setStream] = useState(false);
	const [active, setActive] = useState(true);
	const [chapter, setChapter] = useState(0);
	const [capture, setCapture] = useState(false);
	const [evidence, setEvidence] = useState(false);
	const progressRef = useRef(null);

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
				setStream(true);
			}
		});

		// Start three.js once the page has painted and gone idle.
		const idle = window.requestIdleCallback || ((fn) => window.setTimeout(fn, 200));
		const idleId = idle(() => startTransition(() => setMount(true)));

		// Smooth scrolling, unless the visitor asked for less motion.
		let lenis = null;
		let raf = 0;
		if (!reduce && shot < 0) {
			lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
			window.__lenis = lenis;
			const loop = (time) => {
				lenis.raf(time);
				raf = requestAnimationFrame(loop);
			};
			raf = requestAnimationFrame(loop);
		}

		let lastChapter = -1;
		const onScroll = () => {
			if (journey.locked) return;
			journey.t = Math.min(LAST, Math.max(0, readT()));
			const index = Math.min(LAST, Math.round(journey.t));
			if (index !== lastChapter) {
				lastChapter = index;
				startTransition(() => setChapter(index));
			}
			if (progressRef.current) progressRef.current.style.transform = `scaleX(${journey.t / LAST})`;
			if (journey.t > 0.4) startTransition(() => setStream(true));
		};
		const onPointer = (e) => {
			journey.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
			journey.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
		};
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);
		window.addEventListener("pointermove", onPointer, { passive: true });

		// Once the solid sections after the walk cover the screen, stop rendering.
		const end = document.getElementById("walk-end");
		const io = end
			? new IntersectionObserver(([e]) => startTransition(() => setActive(e.boundingClientRect.top > 0 || journey.locked)), { threshold: 0 })
			: null;
		if (end) io.observe(end);

		return () => {
			(window.cancelIdleCallback || window.clearTimeout)(idleId);
			cancelAnimationFrame(raf);
			lenis?.destroy();
			if (window.__lenis === lenis) window.__lenis = null;
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
			window.removeEventListener("pointermove", onPointer);
			io?.disconnect();
		};
	}, []);

	const canvas =
		mount && webgl ? (
			<PalaceCanvas
				className="absolute inset-0"
				evidence={evidence}
				quality={quality}
				active={active}
				capture={capture}
				streamTextures={stream}
				onReady={() => {
					journey.readyAt = performance.now();
					setReady(true);
				}}
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

	const goTo = (index) => {
		const el = document.querySelector(`[data-beat][data-chapter="${STOPS[index].id}"]`);
		if (!el) return;
		trackVirtual("virtual_chapter_jump");
		if (window.__lenis) window.__lenis.scrollTo(el, { offset: 0, duration: 2.2 });
		else el.scrollIntoView({ behavior: "smooth" });
	};

	return (
		<>
			<div className="fixed inset-0 z-0 overflow-hidden bg-[#0b0907]" aria-hidden="true">
				<picture>
					<source media="(max-aspect-ratio: 4/5)" srcSet={poster.mobile} />
					<img src={poster.desktop} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
				</picture>
				<motion.div className="absolute inset-0" initial={false} animate={{ opacity: ready ? 1 : 0 }} transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}>
					{canvas}
				</motion.div>
				{/* Film finish: a soft vignette and fine grain, over poster and canvas alike. */}
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(5,3,2,0.72)_100%)]" />
				<div className="virtual-grain pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay" />
			</div>

			<AnimatePresence>
				{mount && webgl && !ready ? (
					<motion.p
						key="loading"
						exit={{ opacity: 0 }}
						transition={{ duration: 1.2 }}
						className="pointer-events-none fixed bottom-6 right-6 z-30 flex items-center gap-3 font-instrument-serif text-lg italic text-[#f3e9d8]/80">
						<span className="relative block h-px w-16 overflow-hidden bg-[#f3e9d8]/20">
							<span className="virtual-loading absolute inset-y-0 left-0 w-1/2 bg-[#d4a85a]" />
						</span>
						{loaderLine}
					</motion.p>
				) : null}
			</AnimatePresence>

			{/* Chapter rail, desktop. */}
			<nav
				aria-label="Chapters"
				className={`fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-3 transition-opacity duration-700 lg:flex ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}>
				{STOPS.map((s, i) => (
					<button
						key={s.id}
						type="button"
						onClick={() => goTo(i)}
						className={`group flex items-center gap-3 font-instrument-sans text-[13px] transition-colors duration-500 ${i === chapter ? "text-[#f3e9d8]" : "text-[#f3e9d8]/40 hover:text-[#f3e9d8]/80"}`}>
						<span className={`transition-opacity duration-500 ${i === chapter ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>{chapters[s.id]}</span>
						<span className={`block h-px transition-all duration-700 ${i === chapter ? "w-10 bg-[#d4a85a]" : "w-4 bg-[#f3e9d8]/40"}`} />
					</button>
				))}
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
						className="mt-6 font-instrument-sans text-[13px] text-[#d4a85a] underline underline-offset-4">
						{evidence ? evidenceLabels.off : evidenceLabels.on}
					</button>
				) : null}
				{evidence ? (
					<ul className="flex flex-col items-end gap-1.5">
						{Object.entries(TIERS).map(([key, tier]) => (
							<li key={key} className="flex items-center gap-2 font-instrument-sans text-xs text-[#f3e9d8]/70">
								{evidenceLabels.legend[key]}
								<span className="h-2.5 w-2.5" style={{ backgroundColor: tier.color }} />
							</li>
						))}
					</ul>
				) : null}
			</nav>

			{/* Progress line, phones. */}
			<div className={`fixed inset-x-0 top-0 z-50 h-0.5 transition-opacity duration-700 lg:hidden ${active ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
				<div ref={progressRef} className="h-full origin-left scale-x-0 bg-[#d4a85a]" />
			</div>
		</>
	);
}
