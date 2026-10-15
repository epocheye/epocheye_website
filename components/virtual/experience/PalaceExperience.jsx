"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Lenis from "lenis";
import { AnimatePresence, motion } from "motion/react";
import { useProgress } from "@react-three/drei";

import { STOPS, TIERS } from "@/lib/virtual/journey";
import {
	CHAPTERS,
	EVIDENCE_LEGEND,
	EVIDENCE_TOGGLE,
	EVIDENCE_TOGGLE_OFF,
	HEADLINE_LEAD,
	HEADLINE_TURN,
	LOADER_LINE,
	SCROLL_HINT,
} from "@/lib/virtual/copy";
import { journey } from "./store";
import BlurWords from "./BlurWords";
import { trackVirtual } from "../track";

// three.js stays out of the first bundle: the headline, loader and chapter text paint first.
const PalaceCanvas = dynamic(() => import("./PalaceCanvas"), { ssr: false });

const EASE = [0.22, 1, 0.36, 1];
const GLASS = "border border-white/20 bg-white/10 backdrop-blur-md";

function canUseWebGL() {
	try {
		const c = document.createElement("canvas");
		return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
	} catch {
		return false;
	}
}

export default function PalaceExperience({ cta }) {
	const sectionRefs = useRef([]);
	const lenisRef = useRef(null);
	const [active, setActive] = useState(0);
	const [shown, setShown] = useState({ index: 0, visible: true }); // which chapter's text is up
	const [evidence, setEvidence] = useState(false);
	const [ready, setReady] = useState(false);
	const [webgl, setWebgl] = useState(true);
	const [effects, setEffects] = useState(false);

	// Scroll drives the camera: map the page position onto chapter sections.
	useEffect(() => {
		const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
		const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
		journey.reducedMotion = reduce;
		startTransition(() => {
			setWebgl(canUseWebGL());
			setEffects(!coarse && !reduce);
		});

		let lenis = null;
		let raf = 0;
		if (!reduce) {
			lenis = new Lenis({ lerp: 0.085, smoothWheel: true, touchMultiplier: 1.4 });
			lenisRef.current = lenis;
			const loop = (time) => {
				lenis.raf(time);
				raf = requestAnimationFrame(loop);
			};
			raf = requestAnimationFrame(loop);
		}

		let lastActive = -1;
		let lastShown = "0:true";
		const update = () => {
			const y = window.scrollY;
			const tops = sectionRefs.current.map((el) => (el ? el.offsetTop : 0));
			let t = 0;
			for (let i = 0; i < tops.length; i++) {
				const start = tops[i];
				const end = i + 1 < tops.length ? tops[i + 1] : start;
				if (y < start) break;
				t = end > start ? i + Math.min(1, (y - start) / (end - start)) : i;
			}
			journey.t = Math.min(t, STOPS.length - 1);
			const nextActive = Math.min(Math.round(journey.t - 0.25), STOPS.length - 1);
			if (nextActive !== lastActive) {
				lastActive = nextActive;
				setActive(Math.max(0, nextActive));
			}
			// A chapter's text shows while the camera holds at its stop, and leaves as it moves on.
			const index = Math.min(Math.floor(journey.t), STOPS.length - 1);
			const frac = journey.t - index;
			const visible = index === 0 ? frac < 0.45 : frac >= 0.04 && frac <= 0.5;
			const key = `${index}:${visible}`;
			if (key !== lastShown) {
				lastShown = key;
				setShown({ index, visible });
			}
		};
		update();
		window.addEventListener("scroll", update, { passive: true });
		window.addEventListener("resize", update);

		const onPointer = (e) => {
			journey.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
			journey.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
		};
		window.addEventListener("pointermove", onPointer, { passive: true });

		return () => {
			cancelAnimationFrame(raf);
			lenis?.destroy();
			lenisRef.current = null;
			window.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
			window.removeEventListener("pointermove", onPointer);
		};
	}, []);

	const goTo = (i) => {
		const el = sectionRefs.current[i];
		if (!el) return;
		// Land just past the hold point so the chapter's text is showing on arrival.
		const top = el.offsetTop + (i === 0 ? 0 : window.innerHeight * 0.25);
		if (lenisRef.current) lenisRef.current.scrollTo(top, { duration: 2.2 });
		else window.scrollTo({ top, behavior: "smooth" });
	};

	const toggleEvidence = () => {
		setEvidence((on) => {
			if (!on) trackVirtual("virtual_evidence_view");
			return !on;
		});
	};

	const last = STOPS.length - 1;

	return (
		<div className="relative bg-black font-montserrat text-white">
			{webgl ? (
				<PalaceCanvas
					evidence={evidence}
					effects={effects}
					onReady={() => setReady(true)}
					onLost={() => setWebgl(false)}
				/>
			) : (
				// eslint-disable-next-line @next/next/no-img-element
				<img src="/virtual/share.jpg" alt="" className="fixed inset-0 h-full w-full object-cover" />
			)}
			<div ref={(el) => (journey.fadeEl = el)} className="pointer-events-none fixed inset-0 z-10 bg-black opacity-0" aria-hidden="true" />

			<Loader ready={ready || !webgl} />
			<TopBar onEarlyAccess={() => goTo(last)} />
			<ChapterNav active={active} onSelect={goTo} />
			{webgl && active < last ? <EvidenceToggle on={evidence} onToggle={toggleEvidence} /> : null}

			{/* Chapter text: one fixed layer, so it never depends on sticky positioning. */}
			<div className="pointer-events-none fixed inset-0 z-20">
				<Arrival show={shown.index === 0 && shown.visible} />
				{STOPS.slice(1, last).map((stop, j) => (
					<Chapter key={stop.id} id={stop.id} show={shown.index === j + 1 && shown.visible} />
				))}
			</div>

			{/* The scroll track: one spacer per chapter; the last one holds the ask. */}
			<main className="relative z-20">
				{STOPS.map((stop, i) => (
					<section
						key={stop.id}
						ref={(el) => (sectionRefs.current[i] = el)}
						id={`chapter-${stop.id}`}
						aria-label={CHAPTERS[stop.id].nav}
						className={i === 0 ? "h-[170svh]" : i === last ? "min-h-svh" : "h-[200svh]"}>
						{i === last ? <Finale>{cta}</Finale> : null}
					</section>
				))}
			</main>
		</div>
	);
}

function Loader({ ready }) {
	const { progress } = useProgress();
	return (
		<AnimatePresence>
			{!ready ? (
				<motion.div
					key="loader"
					className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black px-6 text-center"
					exit={{ opacity: 0, transition: { duration: 1.2, ease: EASE } }}>
					<p className="text-2xl font-bold tracking-tight sm:text-3xl">Epocheye</p>
					<p className="mt-8 max-w-md text-lg font-light leading-snug text-white/80 sm:text-2xl">
						{HEADLINE_LEAD} <span className="font-semibold text-white">{HEADLINE_TURN}</span>
					</p>
					<div className="mt-10 h-px w-48 overflow-hidden bg-white/15">
						<motion.div className="h-full bg-white" animate={{ width: `${Math.round(progress)}%` }} transition={{ ease: "easeOut" }} />
					</div>
					<p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-white/50">{LOADER_LINE}</p>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}

function TopBar({ onEarlyAccess }) {
	return (
		<header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 sm:px-8">
			<p className="text-xl font-bold tracking-tight drop-shadow-lg sm:text-2xl">Epocheye</p>
			<button
				type="button"
				onClick={onEarlyAccess}
				className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-black sm:text-xs ${GLASS}`}>
				{CHAPTERS.dusk.nav}
			</button>
		</header>
	);
}

function ChapterNav({ active, onSelect }) {
	return (
		<>
			{/* Desktop: a rail of standing points down the right edge. */}
			<nav aria-label="Chapters" className="fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 md:flex">
				{STOPS.map((stop, i) => (
					<button
						key={stop.id}
						type="button"
						onClick={() => onSelect(i)}
						aria-current={active === i ? "step" : undefined}
						className="group flex items-center justify-end gap-3">
						<span
							className={`text-[11px] font-medium uppercase tracking-[0.18em] transition-all duration-500 ${
								active === i ? "text-white opacity-100" : "translate-x-2 text-white/60 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
							}`}>
							{CHAPTERS[stop.id].nav}
						</span>
						<span
							className={`block rounded-full border border-white/60 transition-all duration-500 ${
								active === i ? "h-3 w-3 bg-white" : "h-2 w-2 bg-transparent group-hover:bg-white/50"
							}`}
						/>
					</button>
				))}
			</nav>
			{/* Phones: a thin progress line along the bottom. */}
			<div className="fixed inset-x-5 bottom-4 z-30 flex gap-1.5 md:hidden" aria-hidden="true">
				{STOPS.map((stop, i) => (
					<span key={stop.id} className={`h-0.5 flex-1 rounded-full transition-colors duration-500 ${i <= active ? "bg-white" : "bg-white/25"}`} />
				))}
			</div>
		</>
	);
}

function EvidenceToggle({ on, onToggle }) {
	return (
		// Phones: under the top bar, clear of the chapter card. Desktop: bottom left.
		<div className="fixed left-5 top-[72px] z-30 flex flex-col-reverse items-start gap-3 sm:left-8 md:bottom-8 md:top-auto md:flex-col">
			<AnimatePresence>
				{on ? (
					<motion.ul
						key="legend"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 10 }}
						transition={{ duration: 0.5, ease: EASE }}
						className={`flex flex-col gap-1.5 rounded-2xl px-4 py-3 ${GLASS} bg-black/40`}>
						{Object.entries(TIERS).map(([key, tier]) => (
							<li key={key} className="flex items-center gap-2 text-[11px] font-medium text-white/90">
								<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tier.color }} />
								{EVIDENCE_LEGEND[key]}
							</li>
						))}
					</motion.ul>
				) : null}
			</AnimatePresence>
			<button
				type="button"
				onClick={onToggle}
				aria-pressed={on}
				className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-black ${GLASS}`}>
				{on ? EVIDENCE_TOGGLE_OFF : EVIDENCE_TOGGLE}
			</button>
		</div>
	);
}

function Arrival({ show }) {
	return (
		<div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
			<motion.div
				className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55),transparent_65%)]"
				animate={{ opacity: show ? 1 : 0 }}
				transition={{ duration: 0.8 }}
			/>
			<BlurWords
				as="h1"
				show={show}
				text={HEADLINE_LEAD}
				className="relative max-w-4xl text-[1.9rem] font-light leading-[1.15] tracking-tight sm:text-5xl md:text-6xl"
			/>
			<BlurWords
				as="p"
				show={show}
				delay={0.35}
				text={HEADLINE_TURN}
				className="relative mt-2 max-w-4xl text-[1.9rem] font-semibold leading-[1.15] tracking-tight sm:text-5xl md:text-6xl"
			/>
			<motion.div
				className="absolute bottom-14 flex flex-col items-center gap-3"
				animate={{ opacity: show ? 1 : 0 }}
				transition={{ duration: 0.6 }}>
				<span className={`rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] ${GLASS}`}>{SCROLL_HINT}</span>
				<motion.span
					className="h-10 w-px bg-linear-to-b from-white to-transparent"
					animate={{ scaleY: [0.3, 1, 0.3], originY: 0 }}
					transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
				/>
			</motion.div>
		</div>
	);
}

function Chapter({ id, show }) {
	const copy = CHAPTERS[id];
	return (
		<motion.div
			className="absolute inset-x-0 bottom-0 px-5 pb-12 sm:inset-y-0 sm:left-0 sm:right-auto sm:flex sm:items-center sm:px-10 sm:pb-0 md:px-16"
			initial={false}
			animate={{ opacity: show ? 1 : 0, y: show ? 0 : 16 }}
			transition={{ duration: 0.8, ease: EASE }}
			aria-hidden={!show}>
			<div className="max-w-xl rounded-3xl bg-linear-to-t from-black/70 to-black/30 p-5 backdrop-blur-sm sm:bg-none sm:p-0 sm:backdrop-blur-none">
				<span className={`inline-flex rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] ${GLASS}`}>
					{copy.nav}
				</span>
				<BlurWords
					as="h2"
					show={show}
					text={copy.title}
					className="mt-4 text-3xl font-semibold leading-tight tracking-tight drop-shadow-[0_2px_20px_rgba(0,0,0,0.7)] sm:text-5xl"
				/>
				<BlurWords
					as="p"
					show={show}
					delay={0.25}
					stagger={0.018}
					text={copy.body}
					className="mt-4 text-sm font-medium leading-relaxed text-white/90 drop-shadow-[0_2px_16px_rgba(0,0,0,0.8)] sm:text-lg"
				/>
			</div>
		</motion.div>
	);
}

function Finale({ children }) {
	return (
		<div className="flex min-h-svh flex-col">
			<div className="h-[60svh]" aria-hidden="true" />
			<div className="relative flex-1 bg-linear-to-b from-black/45 via-black/80 to-black pt-12">{children}</div>
		</div>
	);
}
