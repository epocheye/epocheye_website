"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Lenis from "lenis";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";

import { PLAY_STORE_URL } from "@/lib/site";
import { OTHER_SITE, PREORDER_SITES } from "@/lib/preorder/sites";
import { EASE } from "./theme";
import { STATIONS, STATION_COUNT, nearestStation, stationProgress, stationWeight } from "./stations";
import FormPanel from "./FormPanel";

if (typeof window !== "undefined") gsap.registerPlugin(useGSAP);

const World = dynamic(() => import("./World"), { ssr: false, loading: () => null });

const INTRO = 2.1; // seconds the curtain holds before the hero rises
const SCROLL_PER_STATION = 130; // vh of scrolling between two stations

function hasWebGL() {
	try {
		const c = document.createElement("canvas");
		return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
	} catch {
		return false;
	}
}

function scrollToStation(i) {
	const max = document.documentElement.scrollHeight - window.innerHeight;
	const y = stationProgress(i) * max;
	if (window.__lenis) window.__lenis.scrollTo(y, { duration: 2.2 });
	else window.scrollTo({ top: y, behavior: "smooth" });
}

/** Opening curtain: a counter fills, then the panel wipes up off the grid. */
function Curtain() {
	const ref = useRef(null);
	useGSAP(
		() => {
			const el = ref.current;
			if (!el) return;
			if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
				gsap.set(el, { display: "none" });
				return;
			}
			const counter = el.querySelector("[data-count]");
			const n = { v: 0 };
			gsap
				.timeline()
				.to(n, {
					v: 100,
					duration: 1.3,
					ease: "power2.inOut",
					onUpdate: () => {
						counter.textContent = String(Math.round(n.v)).padStart(3, "0");
					},
				})
				.to("[data-bar]", { scaleX: 1, duration: 1.3, ease: "power2.inOut" }, 0)
				.to("[data-word]", { yPercent: -110, duration: 0.6, ease: "power3.in" }, 1.25)
				.to(el, { clipPath: "inset(0% 0% 100% 0%)", duration: 1, ease: "expo.inOut" }, 1.4)
				.set(el, { display: "none" });
		},
		{ scope: ref }
	);
	return (
		<div
			ref={ref}
			className="fixed inset-0 z-[90] flex flex-col justify-between bg-[#07040f] p-6 sm:p-10"
			style={{ clipPath: "inset(0% 0% 0% 0%)" }}
			aria-hidden="true">
			<div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-[#b28cff]">
				<span>Epocheye</span>
				<span>Entering the grid</span>
			</div>
			<div className="overflow-hidden">
				<div data-word className="font-montserrat text-[18vw] font-semibold leading-none tracking-tight text-[#f2efe6] sm:text-[12vw]">
					<span data-count>000</span>
				</div>
			</div>
			<div className="h-px w-full origin-left scale-x-0 bg-gradient-to-r from-[#7b2fff] to-[#ccff00]" data-bar />
		</div>
	);
}

function Hud({ station }) {
	return (
		<>
			<header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7">
				<Link href="/" className="pointer-events-auto font-montserrat text-sm font-semibold tracking-[0.18em] text-[#f2efe6]">
					EPOCHEYE
				</Link>
				<a
					href={PLAY_STORE_URL}
					target="_blank"
					rel="noopener noreferrer"
					className="pointer-events-auto rounded-full border border-[#7b2fff] bg-[#07040f]/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#f2efe6] backdrop-blur-sm transition-colors hover:border-[#ccff00] hover:text-[#ccff00] sm:px-5 sm:py-2.5 sm:text-[11px]">
					Get the app ↗
				</a>
			</header>

			<nav aria-label="Sections" className="fixed right-8 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-4 sm:flex">
				{STATIONS.map((s, i) => (
					<button
						key={s.id}
						type="button"
						onClick={() => scrollToStation(i)}
						aria-label={s.label}
						aria-current={station === i ? "step" : undefined}
						className="group flex items-center justify-end gap-3">
						<span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-[#f2efe6]/0 transition-colors group-hover:text-[#f2efe6]/80 sm:inline">
							{s.label}
						</span>
						<span
							className={`block h-2 w-2 rotate-45 border transition-all duration-500 ${
								station === i ? "scale-125 border-[#ccff00] bg-[#ccff00] shadow-[0_0_12px_#ccff00]" : "border-[#b28cff]/70"
							}`}
						/>
					</button>
				))}
			</nav>

			<div className="pointer-events-none fixed bottom-5 left-5 z-30 font-mono text-[10px] uppercase tracking-[0.22em] text-[#b28cff] sm:bottom-8 sm:left-10 sm:text-[11px]">
				<span className="text-[#ccff00]">{String(station + 1).padStart(2, "0")}</span> / {String(STATION_COUNT).padStart(2, "0")}
				<AnimatePresence mode="wait" initial={false}>
					<motion.span
						key={station}
						className="ml-3 inline-block text-[#f2efe6]/80"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.4, ease: EASE }}>
						{STATIONS[station].label}
					</motion.span>
				</AnimatePresence>
			</div>
		</>
	);
}

/** Flat page for browsers without WebGL: same content, same form. */
function Fallback({ sites, counts, selected, onSelect, onDone }) {
	const ranked = [...sites].sort((a, b) => (counts?.[b.slug] ?? 0) - (counts?.[a.slug] ?? 0));
	return (
		<div className="mx-auto max-w-3xl px-5 py-28 text-[#f2efe6]">
			<h1 className="font-montserrat text-5xl font-semibold">
				Pre-order <span className="font-instrument-serif font-normal italic text-[#ccff00]">the past.</span>
			</h1>
			<p className="mt-4 text-[#f2efe6]/70">Pick the heritage site you want to see next. The most-wanted gets built first.</p>
			<ol className="mt-10 space-y-2">
				{ranked.map((s, i) => (
					<li key={s.slug}>
						<button type="button" onClick={() => onSelect(s.slug)} className="flex w-full justify-between border-b border-[#7b2fff]/40 py-3 text-left">
							<span>
								<span className="mr-3 font-mono text-[#ccff00]">#{i + 1}</span>
								{s.name}, {s.place}
							</span>
							<span className="font-mono text-sm text-[#b28cff]">{counts?.[s.slug] ?? 0}</span>
						</button>
					</li>
				))}
			</ol>
			<div className="mt-12 flex justify-center">
				<FormPanel sites={sites} selected={selected} onSelect={onSelect} onDone={onDone} narrow />
			</div>
		</div>
	);
}

export default function PreorderExperience() {
	const reduced = useReducedMotion();
	const [webgl] = useState(hasWebGL);
	const [counts, setCounts] = useState(null);
	const [selected, setSelected] = useState(PREORDER_SITES[0].slug);
	const [hovered, setHovered] = useState(null);
	const [flash, setFlash] = useState(null);
	const [station, setStation] = useState(0);
	const [formVisible, setFormVisible] = useState(false);
	const { scrollYProgress } = useScroll();

	useMotionValueEvent(scrollYProgress, "change", (v) => {
		const s = nearestStation(v);
		setStation((prev) => (prev === s ? prev : s));
		const show = stationWeight(v, 3) > 0.35;
		setFormVisible((prev) => (prev === show ? prev : show));
	});

	const loadCounts = useCallback(() => {
		fetch("/api/preorder", { cache: "no-store" })
			.then((r) => r.json())
			.then((j) => {
				if (j?.success) setCounts(j.data.counts);
			})
			.catch(() => {});
	}, []);

	useEffect(() => {
		loadCounts();
	}, [loadCounts]);

	// Lenis smooth scroll on desktop; native scroll on touch / reduced motion.
	useEffect(() => {
		const touch = window.matchMedia?.("(pointer: coarse)").matches;
		if (reduced || touch) return;
		const lenis = new Lenis({ duration: 1.3, smoothWheel: true, autoRaf: true });
		window.__lenis = lenis;
		return () => {
			lenis.destroy();
			if (window.__lenis === lenis) window.__lenis = null;
		};
	}, [reduced]);

	const pick = (slug) => {
		setSelected(slug);
		scrollToStation(3);
	};

	const onDone = ({ slug }) => {
		if (slug !== OTHER_SITE) setFlash({ slug, at: performance.now() });
		loadCounts();
	};

	if (!webgl) {
		return (
			<main className="min-h-screen bg-[#07040f]">
				<Fallback sites={PREORDER_SITES} counts={counts} selected={selected} onSelect={setSelected} onDone={onDone} />
			</main>
		);
	}

	return (
		<main className="bg-[#07040f]">
			<Curtain />
			<div className="fixed inset-0 z-10">
				<World
					progress={scrollYProgress}
					reduced={reduced}
					introDelay={reduced ? 0 : INTRO}
					sites={PREORDER_SITES}
					counts={counts}
					selected={selected}
					hovered={hovered}
					onHover={setHovered}
					onPick={pick}
					onSelect={setSelected}
					onDone={onDone}
					flash={flash}
					formVisible={formVisible}
				/>
			</div>
			<Hud station={station} />
			{/* Scroll track: the page's only job is to give the camera distance to travel. */}
			<div aria-hidden="true" style={{ height: `${(STATION_COUNT - 1) * SCROLL_PER_STATION + 100}vh` }} />
		</main>
	);
}
