"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { LIVE_MONUMENTS } from "@/lib/monuments/live";
import { DESTINATIONS } from "@/components/home3d/shapes";
import logoStpi from "@/public/logo-stpi.png";
import logoAws from "@/public/logo-aws.png";
import logoDraper from "@/public/logo-draper.png";
import logoFounderStartupHouse from "@/public/home/backers/founder-startup-house.png";
import logoGoogleForStartups from "@/public/home/backers/google-for-startups.png";
import logoNvidia from "@/public/home/backers/nvidia.png";
import logoMark from "@/public/logo-white.png";
import Maquette from "./Maquette";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const PLAY_URL = "https://play.google.com/store/apps/details?id=com.epocheye";
const EASE = [0.22, 1, 0.36, 1];
const wrap = "mx-auto w-full max-w-[1320px] px-5 md:px-10";

/* ───────────────────────── Small parts ───────────────────────── */

function Reveal({ children, className = "", delay = 0, as = "div" }) {
	const Tag = motion[as];
	return (
		<Tag
			className={className}
			initial={{ opacity: 0, y: 28 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-10% 0px" }}
			transition={{ duration: 0.9, delay, ease: EASE }}>
			{children}
		</Tag>
	);
}

function Eyebrow({ children, className = "" }) {
	return (
		<p className={`flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-type-muted ${className}`}>
			<span className="h-1.5 w-1.5 rounded-full bg-c10" aria-hidden="true" />
			{children}
		</p>
	);
}

/** The accent stroke under a headline's italic phrase. */
function Swash({ children }) {
	return (
		<span className="relative inline-block whitespace-nowrap">
			<span className="relative z-10 font-instrument-serif font-normal italic tracking-[-0.01em]">{children}</span>
			<svg className="absolute -bottom-[0.08em] left-0 h-[0.28em] w-full text-c10" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
				<path d="M3 14 C 70 4, 160 3, 297 9" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
			</svg>
		</span>
	);
}

const button = "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold transition-transform duration-300 hover:-translate-y-0.5";
const primary = `${button} bg-c10 text-on-c10`;
const secondary = `${button} border border-hair text-type hover:bg-plate`;

const h2 = "font-instrument-sans font-semibold tracking-[-0.035em] leading-[0.98] text-type";

/* ───────────────────────── Smooth scroll ───────────────────────── */

function useSmoothScroll() {
	useEffect(() => {
		const touch = window.matchMedia("(pointer: coarse)").matches;
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (touch || reduced) {
			ScrollTrigger.refresh();
			return;
		}
		const lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
		lenis.on("scroll", ScrollTrigger.update);
		const raf = (time) => lenis.raf(time * 1000);
		gsap.ticker.add(raf);
		gsap.ticker.lagSmoothing(0);
		window.__lenis = lenis;
		ScrollTrigger.refresh();
		return () => {
			gsap.ticker.remove(raf);
			lenis.destroy();
			delete window.__lenis;
		};
	}, []);
}

const scrollToY = (y) => (window.__lenis ? window.__lenis.scrollTo(y, { duration: 1.2 }) : window.scrollTo({ top: y, behavior: "smooth" }));

/**
 * Pins a section for `steps` screens. `progress.current` runs 0 → steps − 1 and
 * rests on each whole step for a while, so every stage is seen in full before
 * the next one starts.
 */
function usePinnedSteps(section, steps, onStep) {
	const progress = useRef(0);
	const trigger = useRef(null);
	const step = useEffectEvent(onStep);
	useEffect(() => {
		const st = ScrollTrigger.create({
			trigger: section.current,
			start: "top top",
			end: () => `+=${(steps - 1) * window.innerHeight}`,
			pin: true,
			scrub: true,
			anticipatePin: 1,
			onUpdate: (self) => {
				const raw = self.progress * (steps - 1);
				const i = Math.min(steps - 2, Math.floor(raw));
				const f = raw - i;
				const x = Math.min(1, Math.max(0, (f - 0.3) / 0.4));
				progress.current = i + x * x * (3 - 2 * x);
				step(progress.current);
			},
		});
		trigger.current = st;
		return () => st.kill();
	}, [section, steps]);
	const goTo = (k) => {
		const st = trigger.current;
		if (st) scrollToY(st.start + ((st.end - st.start) * k) / (steps - 1));
	};
	return { progress, goTo };
}

/* ───────────────────────── Navigation ───────────────────────── */

const NAV = [
	["How it works", "#how"],
	["Monuments", "#where"],
	["Destinations", "#destinations"],
	["Creators", "#creators"],
	["Team", "#team"],
];

function Nav() {
	return (
		<header className="tone-normal fixed inset-x-0 top-0 z-50 border-b border-hair bg-page/80 backdrop-blur-md">
			<div className={`${wrap} flex h-16 items-center justify-between gap-6`}>
				<Link href="/" className="flex items-center gap-2.5 text-type" aria-label="Epocheye home">
					<Image src={logoMark} alt="" className="logo-mark h-8 w-8" />
					<span className="text-lg font-semibold tracking-[-0.02em]">Epocheye</span>
				</Link>
				<nav className="hidden items-center gap-7 text-sm text-type-muted lg:flex" aria-label="Sections">
					{NAV.map(([t, href]) => (
						<a key={href} href={href} className="transition-colors hover:text-type">
							{t}
						</a>
					))}
				</nav>
				<div className="flex items-center gap-2">
					<Link href="/login" className="hidden px-3 py-2 text-sm text-type-muted transition-colors hover:text-type sm:block">
						Log in
					</Link>
					<a href={PLAY_URL} target="_blank" rel="noopener noreferrer" className="rounded-full bg-c10 px-4 py-2 text-sm font-semibold text-on-c10">
						Get the app
					</a>
				</div>
			</div>
		</header>
	);
}

/* ───────────────────────── Hero ───────────────────────── */

const BACKERS = [
	{ name: "Software Technology Parks of India", logo: logoStpi, className: "h-9 w-auto md:h-11" },
	{ name: "Amazon Web Services", logo: logoAws, className: "h-9 w-auto md:h-11" },
	{ name: "Draper Startup House", logo: logoDraper, className: "h-9 w-auto md:h-11" },
	{ name: "Founder Startup House", logo: logoFounderStartupHouse, className: "h-auto w-24 md:w-28" },
	{ name: "India 2047 Ventures" },
	{ name: "Google for Startups", logo: logoGoogleForStartups, className: "h-auto w-28 md:w-32" },
	{ name: "NVIDIA Inception Program", logo: logoNvidia, className: "h-auto w-24 md:w-28" },
];

const STATS = [
	["4", "monuments live"],
	["2", "cities"],
	["EN · HI", "narration"],
	["8", "sites next"],
];

function Hero() {
	const up = (delay) => ({ initial: { opacity: 0, y: 26 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1, delay, ease: EASE } });
	return (
		<section className="tone-normal relative bg-page pt-24 md:pt-28" aria-label="Epocheye">
			<div className={`${wrap} grid items-center gap-8 md:grid-cols-[1.02fr_1fr] md:gap-10`}>
				<div className="relative z-10 order-2 md:order-1">
					<motion.a
						{...up(0.05)}
						href="#where"
						className="inline-flex max-w-full items-center gap-2 rounded-full border border-hair bg-plate py-1 pl-1 pr-3 text-xs text-type-muted transition-colors hover:text-type">
						<span className="rounded-full bg-c10 px-2 py-0.5 font-semibold text-on-c10">Live</span>
						<span className="truncate">Now at 4 monuments in Bengaluru &amp; Kolkata</span>
						<span aria-hidden="true">→</span>
					</motion.a>
					<motion.h1 {...up(0.15)} className={`${h2} mt-6`} style={{ fontSize: "clamp(46px, 6.4vw, 96px)" }}>
						History, standing <Swash>where it stood.</Swash>
					</motion.h1>
					<motion.p {...up(0.3)} className="mt-6 max-w-[34rem] text-lg leading-relaxed text-type-muted md:text-xl">
						Point your phone at a monument and see what the historical record says was there: rebuilt in AR, narrated in English and Hindi,
						every claim sourced.
					</motion.p>
					<motion.div {...up(0.42)} className="mt-8 flex flex-wrap gap-3">
						<a href={PLAY_URL} target="_blank" rel="noopener noreferrer" className={primary}>
							Get it on Google Play <span aria-hidden="true">↗</span>
						</a>
						<a href="#how" className={secondary}>
							See how it works
						</a>
					</motion.div>
					<motion.dl {...up(0.55)} className="mt-10 grid grid-cols-4 border-t border-hair pt-6">
						{STATS.map(([n, l], i) => (
							<div key={l} className={i ? "border-l border-hair pl-4" : ""}>
								<dt className="sr-only">{l}</dt>
								<dd className="text-2xl font-semibold tracking-[-0.03em] text-type md:text-3xl">{n}</dd>
								<dd className="mt-1 text-[11px] leading-tight text-type-muted md:text-xs">{l}</dd>
							</div>
						))}
					</motion.dl>
				</div>

				<motion.div
					initial={{ opacity: 0, scale: 0.97 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 1.2, delay: 0.1, ease: EASE }}
					className="order-1 md:order-2">
					<Maquette models={["temple"]} intro className="h-[52svh] overflow-hidden rounded-[28px] border border-hair bg-plate md:h-[min(74svh,720px)]">
						{/* A model plate's labels, like a museum maquette. */}
						<div className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-type px-4 py-3 text-page shadow-xl md:left-6 md:top-6">
							<p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">Model 01</p>
							<p className="mt-1 text-sm font-semibold md:text-base">Konark Sun Temple</p>
							<p className="text-xs opacity-70">Laser scan · 13th century</p>
						</div>
						<p className="pointer-events-none absolute right-4 top-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-type-muted md:right-6 md:top-6">
							<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-c10" aria-hidden="true" />
							Live 3D · drag to turn
						</p>
						<div className="pointer-events-none absolute bottom-4 right-4 w-56 rounded-2xl border border-hair bg-page/85 p-3.5 backdrop-blur md:bottom-6 md:right-6 md:w-64">
							<div className="flex items-center justify-between text-xs text-type-muted">
								<span>Reconstruction</span>
								<span className="font-semibold text-type">1250 AD</span>
							</div>
							<div className="relative mt-3 h-1 rounded-full bg-hair">
								<span className="absolute inset-y-0 left-0 w-[22%] rounded-full bg-c10" />
								<span className="absolute -top-1 left-[22%] h-3 w-3 -translate-x-1/2 rounded-full border-2 border-page bg-c10" />
							</div>
							<div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-type-faint">
								<span>1250</span>
								<span>1600</span>
								<span>1900</span>
								<span>Today</span>
							</div>
						</div>
					</Maquette>
				</motion.div>
			</div>

			<div className={`${wrap} mt-14 border-t border-hair py-8 md:mt-16`}>
				<p className="font-mono text-[11px] uppercase tracking-[0.22em] text-type-muted">Backed by</p>
				<ul className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-6 opacity-80 md:justify-between">
					{BACKERS.map((b) => (
						<li key={b.name} title={b.name} className="flex items-center">
							{b.logo ? (
								<Image src={b.logo} alt={b.name} className={`logo-mark ${b.className}`} />
							) : (
								<span className="font-montserrat text-[13px] font-bold uppercase leading-none tracking-[0.06em] text-type md:text-[15px]">
									India <span className="text-c10">2047</span>
									<br />
									Ventures
								</span>
							)}
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}

/* ───────────────────────── The product (pinned, inverted) ───────────────────────── */

const STACK = [
	{
		title: "AR time travel",
		desc: "Stand at the monument and see what the record says was there: Tipu Sultan's Summer Palace as it was painted, Bangalore Fort's lost rampart back on its wall.",
	},
	{ title: "An AI historian", desc: "A guided narration at Tipu Sultan's Summer Palace, in English and Hindi, stop by stop as you walk the rooms." },
	{
		title: "Sourced, every card",
		desc: "Point at an exhibit and read what the published record says, with the source named. Where no record exists, the app says so.",
	},
];

function Product() {
	const section = useRef(null);
	const [step, setStep] = useState(0);
	const { progress, goTo } = usePinnedSteps(section, STACK.length, (p) => setStep(Math.round(p)));
	return (
		<section ref={section} className="tone-invert relative z-10 bg-page md:h-svh" aria-label="What Epocheye does">
			<div className={`${wrap} grid h-svh grid-rows-[42svh_1fr] gap-4 py-6 md:grid-cols-2 md:grid-rows-1 md:items-center md:gap-12 md:py-0`}>
				<div className="order-2 md:order-1">
					<Eyebrow>The product</Eyebrow>
					<h2 className={`${h2} mt-4`} style={{ fontSize: "clamp(34px, 4.6vw, 68px)" }}>
						Three systems. <span className="font-instrument-serif font-normal italic">One impossible product.</span>
					</h2>
					<ol className="mt-6 space-y-1 md:mt-10">
						{STACK.map((s, i) => (
							<li key={s.title}>
								<button
									type="button"
									onClick={() => goTo(i)}
									className={`w-full border-t border-hair py-3 text-left transition-opacity duration-500 md:py-4 ${i === step ? "opacity-100" : "opacity-40 hover:opacity-70"}`}>
									<span className="flex items-baseline gap-4">
										<span className="font-mono text-xs text-type-muted">0{i + 1}</span>
										<span className="text-xl font-semibold tracking-[-0.02em] text-type md:text-3xl">{s.title}</span>
									</span>
									<span
										className={`grid transition-all duration-500 ${i === step ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
										<span className="overflow-hidden">
											<span className="block max-w-lg pl-8 pt-2 text-sm leading-relaxed text-type-muted md:text-base">{s.desc}</span>
										</span>
									</span>
								</button>
							</li>
						))}
					</ol>
				</div>
				<Maquette models={["phone", "wave", "cards"]} progress={progress} invert className="order-1 h-full md:order-2 md:h-[78svh]">
					<p className="pointer-events-none absolute bottom-2 left-0 font-mono text-[10px] uppercase tracking-[0.2em] text-type-muted">
						{`0${step + 1} / 03 · ${STACK[step].title}`}
					</p>
				</Maquette>
			</div>
		</section>
	);
}

/* ───────────────────────── How it works (pinned eras) ───────────────────────── */

const ERAS = [
	{ year: "80 AD", label: "Reconstructing · Colosseum, 80 AD" },
	{ year: "1150", label: "Standing · Angkor Wat, 1150" },
	{ year: "1450", label: "Built · Machu Picchu, 1450" },
	{ year: "Today", label: "Today · explore it in AR" },
];
const HOW = [
	["Point.", "Aim your phone at any heritage monument in front of you."],
	["Scrub.", "Drag the timeline to slide through centuries of its history."],
	["Travel.", "Unlock stories and reconstructions verified by historians."],
];

function How() {
	const section = useRef(null);
	const [value, setValue] = useState(0);
	const { progress, goTo } = usePinnedSteps(section, ERAS.length, setValue);
	const era = Math.round(value);
	const word = Math.min(era, 2);
	return (
		<section id="how" ref={section} className="tone-normal relative bg-page md:h-svh" aria-label="How it works">
			<div className={`${wrap} grid h-svh grid-rows-[44svh_1fr] gap-4 py-6 md:grid-cols-[1.1fr_1fr] md:grid-rows-1 md:items-center md:gap-12 md:py-0`}>
				<Maquette models={["rome", "angkor", "terraces", "phone"]} progress={progress} className="h-full md:h-[80svh]">
					<p className="pointer-events-none absolute left-0 top-3 font-mono text-[10px] uppercase tracking-[0.2em] text-type-muted">{ERAS[era].label}</p>
				</Maquette>
				<div>
					<Eyebrow>How it works</Eyebrow>
					<h2 className={`${h2} mt-4 flex flex-wrap gap-x-3`} style={{ fontSize: "clamp(36px, 4.8vw, 72px)" }}>
						{HOW.map(([w], i) => (
							<span key={w} className={`transition-opacity duration-500 ${i === word ? "opacity-100" : "opacity-25"}`}>
								{w}
							</span>
						))}
					</h2>
					<p className="mt-3 min-h-[3em] max-w-md text-base leading-relaxed text-type-muted md:text-lg">{HOW[word][1]}</p>
					<p className="mt-2 font-instrument-serif italic leading-[0.9] tracking-[-0.02em] text-type" style={{ fontSize: "clamp(80px, 11vw, 168px)" }} aria-live="polite">
						{ERAS[era].year}
					</p>
					<input
						type="range"
						min={0}
						max={ERAS.length - 1}
						step={0.01}
						value={value}
						aria-label="Timeline"
						aria-valuetext={ERAS[era].year}
						onChange={(e) => goTo(Number(e.target.value))}
						className="tl-range mt-6 w-full"
						style={{ "--fill": `${(value / (ERAS.length - 1)) * 100}%` }}
					/>
					<div className="mt-3 flex justify-between">
						{ERAS.map((e, i) => (
							<button
								key={e.year}
								type="button"
								onClick={() => goTo(i)}
								className={`font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${i === era ? "text-type" : "text-type-faint hover:text-type-muted"}`}>
								{e.year}
							</button>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

/* ───────────────────────── The collection ───────────────────────── */

const COLLECTION = [
	{ name: "Pyramids of Giza", place: "Egypt", coord: "29.98°N 31.13°E" },
	{ name: "Colosseum", place: "Italy", coord: "41.89°N 12.49°E" },
	{ name: "Taj Mahal", place: "India", coord: "27.17°N 78.04°E" },
];
const ROSTER = ["Taj Mahal", "Colosseum", "Machu Picchu", "Tikal", "Great Wall", "Pyramids", "Carcassonne", "Boudhanath", "Bagan"];

function Collection() {
	const [picked, setPicked] = useState(0);
	const progress = useRef(0);
	const held = useRef(0);
	useEffect(() => {
		const tween = gsap.to(progress, { current: picked, duration: 1.6, ease: "power2.inOut" });
		return () => tween.kill();
	}, [picked]);
	useEffect(() => {
		const id = setInterval(() => {
			// A pick by hand holds for two turns of the tour.
			if (held.current > 0) {
				held.current -= 1;
				return;
			}
			setPicked((k) => (k + 1) % COLLECTION.length);
		}, 4200);
		return () => clearInterval(id);
	}, []);
	const pick = (k) => {
		held.current = 2;
		setPicked(k);
	};
	return (
		<section className="tone-normal relative overflow-hidden border-t border-hair bg-page py-20 md:py-28" aria-label="The collection">
			<div className={`${wrap} grid items-center gap-10 md:grid-cols-[1fr_1.15fr]`}>
				<div>
					<Reveal>
						<Eyebrow>The collection</Eyebrow>
						<h2 className={`${h2} mt-4`} style={{ fontSize: "clamp(40px, 5.6vw, 84px)" }}>
							A world, <span className="font-instrument-serif font-normal italic">rebuilt.</span>
						</h2>
						<p className="mt-5 max-w-md text-base leading-relaxed text-type-muted md:text-lg">
							Every model is built from the published record, one block at a time. These three are next.
						</p>
					</Reveal>
					<ul className="mt-8">
						{COLLECTION.map((c, k) => (
							<li key={c.name}>
								<button
									type="button"
									onClick={() => pick(k)}
									onPointerEnter={() => pick(k)}
									className="group flex w-full items-center gap-4 border-t border-hair py-4 text-left">
									<span className={`h-2.5 w-2.5 rounded-full transition-colors ${k === picked ? "bg-c10" : "bg-hair"}`} aria-hidden="true" />
									<span className={`flex-1 text-2xl font-semibold tracking-[-0.02em] transition-colors md:text-3xl ${k === picked ? "text-type" : "text-type-faint group-hover:text-type-muted"}`}>
										{c.name}
									</span>
									<span className="hidden font-mono text-[11px] uppercase tracking-[0.14em] text-type-muted sm:block">
										{c.place} · {c.coord}
									</span>
								</button>
							</li>
						))}
					</ul>
				</div>
				<Maquette models={["pyramids", "colosseum", "taj"]} progress={progress} className="h-[46svh] overflow-hidden rounded-[28px] border border-hair bg-plate md:h-[66svh]">
					<p className="pointer-events-none absolute bottom-5 left-5 font-mono text-[10px] uppercase tracking-[0.2em] text-type-muted">
						{`Model ${String(picked + 2).padStart(2, "0")} · ${COLLECTION[picked].name}`}
					</p>
				</Maquette>
			</div>
			<div className="mt-16 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]" aria-hidden="true">
				<div className="ticker flex w-max gap-8">
					{[0, 1].map((dup) =>
						ROSTER.map((r) => (
							<span key={`${dup}${r}`} className="flex items-center gap-8 text-4xl font-semibold tracking-[-0.03em] text-type-faint/60 md:text-6xl">
								{r}
								<span className="text-xl text-c10">✦</span>
							</span>
						)),
					)}
				</div>
			</div>
		</section>
	);
}

/* ───────────────────────── Where it works ───────────────────────── */

function Where() {
	return (
		<section id="where" className="tone-normal relative border-t border-hair bg-page py-20 md:py-28" aria-label="Where it works">
			<div className={`${wrap} grid items-center gap-10 md:grid-cols-[1.1fr_1fr]`}>
				<Maquette models={["india"]} className="order-2 h-[50svh] overflow-hidden rounded-[28px] border border-hair bg-plate md:order-1 md:h-[72svh]">
					<div className="pointer-events-none absolute left-5 top-5 flex gap-2">
						{["Bengaluru", "Kolkata"].map((c) => (
							<span key={c} className="rounded-full bg-type px-3 py-1 text-xs font-semibold text-page">
								{c}
							</span>
						))}
					</div>
				</Maquette>
				<div className="order-1 md:order-2">
					<Reveal>
						<Eyebrow>Where it works</Eyebrow>
						<h2 className={`${h2} mt-4`} style={{ fontSize: "clamp(40px, 5.4vw, 80px)" }}>
							Live at <span className="font-instrument-serif font-normal italic">four monuments.</span>
						</h2>
					</Reveal>
					<ol className="mt-8">
						{LIVE_MONUMENTS.map((m, i) => (
							<li key={m.slug}>
								<Link href={`/monuments/${m.slug}`} className="group flex items-center gap-4 border-t border-hair py-4">
									<span className="font-mono text-xs text-type-faint">0{i + 1}</span>
									<span className="flex-1 text-xl font-semibold tracking-[-0.02em] text-type md:text-2xl">{m.name}</span>
									<span className="text-sm text-type-muted">{m.city}</span>
									<span className="grid h-9 w-9 place-items-center rounded-full border border-hair text-type transition-colors group-hover:border-transparent group-hover:bg-c10 group-hover:text-on-c10" aria-hidden="true">
										↗
									</span>
								</Link>
							</li>
						))}
					</ol>
				</div>
			</div>
		</section>
	);
}

/* ───────────────────────── In the field ───────────────────────── */

function Field() {
	const video = useRef(null);
	useEffect(() => {
		const el = video.current;
		if (!el) return;
		const io = new IntersectionObserver(([e]) => (e.isIntersecting ? el.play().catch(() => {}) : el.pause()), { threshold: 0.2 });
		io.observe(el);
		return () => io.disconnect();
	}, []);
	return (
		<section className="tone-normal border-t border-hair bg-page py-20 md:py-28" aria-label="In the field">
			<div className={wrap}>
				<Reveal className="flex flex-wrap items-end justify-between gap-6">
					<div>
						<Eyebrow>In the field</Eyebrow>
						<h2 className={`${h2} mt-4`} style={{ fontSize: "clamp(40px, 5.6vw, 84px)" }}>
							Heritage, <span className="font-instrument-serif font-normal italic">in motion.</span>
						</h2>
					</div>
					<p className="max-w-sm text-base leading-relaxed text-type-muted">Real footage from the Epocheye AR prototype. Point, and the past renders in place.</p>
				</Reveal>
				<Reveal delay={0.1} className="relative mt-10 overflow-hidden rounded-[28px] border border-hair bg-black">
					<video ref={video} className="aspect-video w-full object-cover" src="/shot2.mp4" muted loop playsInline preload="none" />
					<span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white backdrop-blur">
						<span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
						AR prototype
					</span>
				</Reveal>
			</div>
		</section>
	);
}

/* ───────────────────────── Destinations ───────────────────────── */

function Destinations() {
	const [picked, setPicked] = useState(0);
	const d = DESTINATIONS[picked];
	return (
		<section id="destinations" className="tone-normal border-t border-hair bg-page py-20 md:py-28" aria-label="Where we're headed">
			<div className={`${wrap} grid items-center gap-10 md:grid-cols-[1fr_1.1fr]`}>
				<div>
					<Reveal>
						<Eyebrow>Where we&apos;re headed</Eyebrow>
						<h2 className={`${h2} mt-4`} style={{ fontSize: "clamp(40px, 5.4vw, 80px)" }}>
							We&apos;re coming <span className="font-instrument-serif font-normal italic">to these.</span>
						</h2>
						<p className="mt-4 text-sm text-type-muted">
							<span className="font-semibold text-type">{d.name}</span> · {d.place} · {d.coord} · Coming 2026
						</p>
					</Reveal>
					<ol className="mt-8 rounded-2xl border border-hair bg-plate p-2 font-mono text-[12px] uppercase tracking-[0.12em] md:text-[13px]">
						{DESTINATIONS.map((x, k) => (
							<li key={x.name}>
								<button
									type="button"
									onPointerEnter={() => setPicked(k)}
									onFocus={() => setPicked(k)}
									onClick={() => setPicked(k)}
									className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${k === picked ? "bg-type text-page" : "text-type-muted hover:text-type"}`}>
									<span className="w-6 opacity-60">{String(k + 1).padStart(2, "0")}</span>
									<span className="flex-1">{x.name}</span>
									<span className="opacity-70">{x.place}</span>
									<span className={`h-2 w-2 rounded-full ${k === picked ? "bg-c10" : "bg-transparent"}`} aria-hidden="true" />
								</button>
							</li>
						))}
					</ol>
				</div>
				<Maquette models={["globe"]} className="h-[50svh] md:h-[74svh]" zoom={10} />
			</div>
		</section>
	);
}

/* ───────────────────────── Creators (inverted) ───────────────────────── */

function Creators() {
	return (
		<section id="creators" className="tone-invert relative bg-page py-20 md:py-28" aria-label="Creators">
			<div className={`${wrap} grid items-center gap-10 md:grid-cols-[1.1fr_1fr]`}>
				<div>
					<Reveal>
						<Eyebrow>Creators program · applications open</Eyebrow>
						<h2 className={`${h2} mt-4`} style={{ fontSize: "clamp(38px, 5vw, 76px)" }}>
							Built with the people who <span className="font-instrument-serif font-normal italic">tell these stories.</span>
						</h2>
						<p className="mt-5 max-w-lg text-base leading-relaxed text-type-muted md:text-lg">
							Turn heritage storytelling into income, and earn on every booking you drive. Clicks, conversions and UPI payouts update live on
							your dashboard: every rupee in the open.
						</p>
					</Reveal>
					<Reveal delay={0.1} as="ol" className="mt-8 grid grid-cols-3 gap-3">
						{["Apply", "Get verified", "Earn"].map((w, i) => (
							<li key={w} className="border-t-2 border-type pt-3">
								<span className="font-mono text-xs text-type-muted">0{i + 1}</span>
								<span className="mt-1 block text-lg font-semibold tracking-[-0.02em] text-type md:text-2xl">{w}</span>
							</li>
						))}
					</Reveal>
					<Reveal delay={0.2} className="mt-9 flex flex-wrap gap-3">
						<a href="https://creators.epocheye.com" target="_blank" rel="noopener noreferrer" className={primary}>
							Apply as a creator <span aria-hidden="true">↗</span>
						</a>
						<a href="https://creators.epocheye.com" target="_blank" rel="noopener noreferrer" className={secondary}>
							Creator login
						</a>
					</Reveal>
					<p className="mt-8 font-mono text-[10px] uppercase tracking-[0.18em] text-type-faint">Verified by historians · Accurate sources · Expert-curated</p>
				</div>
				<Maquette models={["network"]} invert className="h-[46svh] md:h-[64svh]" />
			</div>
		</section>
	);
}

/* ───────────────────────── Team & footer ───────────────────────── */

function Team() {
	return (
		<section id="team" className="tone-normal bg-page pt-20 md:pt-28" aria-label="Team">
			<div className={`${wrap} grid items-center gap-10 md:grid-cols-[1.1fr_1fr]`}>
				<div>
					<Reveal>
						<Eyebrow>The team</Eyebrow>
						<h2 className={`${h2} mt-4`} style={{ fontSize: "clamp(44px, 6vw, 92px)" }}>
							Operators, <span className="font-instrument-serif font-normal italic">not tourists.</span>
						</h2>
					</Reveal>
					<Reveal delay={0.1} className="mt-8 flex items-start gap-4 border-t border-hair pt-6">
						<span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-type text-lg font-semibold text-page">SS</span>
						<div>
							<p className="text-xl font-semibold text-type">
								Sambit Singha <span className="ml-2 align-middle text-sm font-normal text-type-muted">Founder &amp; CEO</span>
							</p>
							<p className="mt-1 max-w-md text-base leading-relaxed text-type-muted">
								Full-stack engineer and product builder. Shipped at two startups before building the Epocheye AR prototype from scratch.
							</p>
						</div>
					</Reveal>
					<Reveal delay={0.2} className="mt-10 rounded-[28px] bg-plate p-6 md:p-8">
						<p className="max-w-lg text-lg leading-snug text-type md:text-xl">
							Investor or partner? We&apos;re raising to scale coverage across continents. If you back deep-tech with cultural impact, we should
							talk.
						</p>
						<a href="mailto:sambit@epocheye.app" className={`${primary} mt-6`}>
							Let&apos;s build the future of heritage <span aria-hidden="true">→</span>
						</a>
					</Reveal>
				</div>
				<Maquette models={["logo"]} className="h-[44svh] md:h-[62svh]" />
			</div>
			<footer className={`${wrap} mt-20 border-t border-hair pb-10 pt-8`}>
				<p className="select-none text-center font-semibold leading-none tracking-[-0.06em] text-type/10" style={{ fontSize: "clamp(72px, 19vw, 300px)" }} aria-hidden="true">
					Epocheye
				</p>
				<div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm text-type-muted">
					<span>© 2026 Epocheye Private Limited</span>
					<div className="flex flex-wrap gap-6">
						<a href="https://d2d3syfid51acn.cloudfront.net/app-release.apk" className="hover:text-type">
							Download APK
						</a>
						<button
							type="button"
							data-tally-open="mZ4Aa0"
							data-tally-layout="modal"
							data-tally-width="600"
							data-tally-auto-close="1000"
							className="hover:text-type">
							Join our team
						</button>
						<Link href="/privacy" className="hover:text-type">
							Privacy
						</Link>
						<Link href="/terms" className="hover:text-type">
							Terms
						</Link>
					</div>
				</div>
			</footer>
		</section>
	);
}

/* ───────────────────────── Page ───────────────────────── */

export default function Home() {
	useSmoothScroll();
	return (
		<main className="tone-normal flex-1 overflow-x-clip bg-page text-type">
			<Nav />
			<Hero />
			<div id="main-content">
				<Product />
				<How />
				<Collection />
				<Where />
				<Field />
				<Destinations />
				<Creators />
				<Team />
			</div>
		</main>
	);
}
