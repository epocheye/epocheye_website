"use client";

import { useEffect, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
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

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const Scene = dynamic(() => import("./Scene"), { ssr: false, loading: () => null });

const PLAY_URL = "https://play.google.com/store/apps/details?id=com.epocheye";
const EASE = [0.22, 1, 0.36, 1];
const wrap = "mx-auto w-full max-w-[1320px] px-5 md:px-10";
const h2 = "font-instrument-sans font-semibold tracking-[-0.035em] leading-[0.98] text-type";
const serif = "font-instrument-serif font-normal italic tracking-[-0.01em]";
const button = "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold transition-transform duration-300 hover:-translate-y-0.5";
const primary = `${button} bg-c10 text-on-c10`;
const secondary = `${button} border border-hair bg-page/60 text-type backdrop-blur-sm hover:bg-plate`;

/* ───────────────────────── Parts ───────────────────────── */

function Reveal({ children, className = "", delay = 0 }) {
	return (
		<motion.div
			className={className}
			initial={{ opacity: 0, y: 30 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: false, margin: "-12% 0px" }}
			transition={{ duration: 0.9, delay, ease: EASE }}>
			{children}
		</motion.div>
	);
}

function Eyebrow({ children }) {
	return (
		<p className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-type-muted">
			<span className="h-1.5 w-1.5 rounded-full bg-c10" aria-hidden="true" />
			{children}
		</p>
	);
}

function Swash({ children }) {
	return (
		<span className="relative inline-block whitespace-nowrap">
			<span className={`relative z-10 ${serif}`}>{children}</span>
			<svg className="absolute -bottom-[0.08em] left-0 h-[0.28em] w-full text-c10" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
				<path d="M3 14 C 70 4, 160 3, 297 9" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
			</svg>
		</span>
	);
}

/**
 * A screen of the page whose 3D model stands beside the text. `model` names
 * what the scene shows while this chapter is in view; `side` is where the
 * text sits (the model takes the other side); `az` turns the camera, `sun`
 * sets the hour.
 */
function Chapter({ id, model, side = "left", az = 0, sun = 35, className = "min-h-svh", label, children }) {
	return (
		<section
			id={id}
			data-chapter={model}
			data-side={side}
			data-az={az}
			data-sun={sun}
			aria-label={label}
			className={`relative z-10 flex items-end md:items-center ${className}`}>
			{/* On phones the model sits above, so the text gets a wash of the page colour under it. */}
			<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-page via-page/85 via-35% to-transparent to-60% md:hidden" aria-hidden="true" />
			<div className={`${wrap} relative pb-16 pt-24 md:py-24`}>
				<div className={`max-w-xl ${side === "right" ? "md:ml-auto" : ""}`}>{children}</div>
			</div>
		</section>
	);
}

/* ───────────────────────── Scroll ───────────────────────── */

function useSmoothScroll() {
	useEffect(() => {
		const touch = window.matchMedia("(pointer: coarse)").matches;
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (touch || reduced) return;
		const lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
		lenis.on("scroll", ScrollTrigger.update);
		const raf = (time) => lenis.raf(time * 1000);
		gsap.ticker.add(raf);
		gsap.ticker.lagSmoothing(0);
		window.__lenis = lenis;
		return () => {
			gsap.ticker.remove(raf);
			lenis.destroy();
			delete window.__lenis;
		};
	}, []);
}

const scrollToId = (id) => {
	const el = document.getElementById(id);
	if (!el) return;
	if (window.__lenis) window.__lenis.scrollTo(el, { duration: 1.4 });
	else el.scrollIntoView({ behavior: "smooth" });
};

const noop = () => () => {};
function hasWebGL() {
	try {
		const c = document.createElement("canvas");
		return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
	} catch {
		return false;
	}
}

/* ───────────────────────── Navigation ───────────────────────── */

const NAV = [
	["How it works", "era-0"],
	["Monuments", "where"],
	["Destinations", "destinations"],
	["Creators", "creators"],
	["Team", "team"],
];

function Nav() {
	return (
		<header className="tone-normal fixed inset-x-0 top-0 z-50 border-b border-hair bg-page/75 backdrop-blur-md">
			<div className={`${wrap} flex h-16 items-center justify-between gap-6`}>
				<Link href="/" className="flex items-center gap-2.5 text-type" aria-label="Epocheye home">
					<Image src={logoMark} alt="" className="logo-mark h-8 w-8" />
					<span className="text-lg font-semibold tracking-[-0.02em]">Epocheye</span>
				</Link>
				<nav className="hidden items-center gap-7 text-sm text-type-muted lg:flex" aria-label="Sections">
					{NAV.map(([t, id]) => (
						<a
							key={id}
							href={`#${id}`}
							onClick={(e) => {
								e.preventDefault();
								scrollToId(id);
							}}
							className="transition-colors hover:text-type">
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
	{ name: "Software Technology Parks of India", logo: logoStpi, className: "h-9 w-auto md:h-10" },
	{ name: "Amazon Web Services", logo: logoAws, className: "h-9 w-auto md:h-10" },
	{ name: "Draper Startup House", logo: logoDraper, className: "h-9 w-auto md:h-10" },
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
	const up = (delay) => ({ initial: { opacity: 0, y: 26 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1.1, delay, ease: EASE } });
	return (
		<section data-chapter="wheel" data-side="left" data-sun="40" aria-label="Epocheye" className="relative z-10 flex min-h-svh flex-col justify-end md:justify-center">
			<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-page via-page/85 via-40% to-transparent to-70% md:hidden" aria-hidden="true" />
			{/* On phones the wheel takes the top of the screen and the words start below it. */}
			<div className={`${wrap} relative pt-[46svh] md:pt-28`}>
				<div className="max-w-[40rem]">
					<motion.a
						{...up(0.3)}
						href="#where"
						onClick={(e) => {
							e.preventDefault();
							scrollToId("where");
						}}
						className="inline-flex max-w-full items-center gap-2 rounded-full border border-hair bg-page/60 py-1 pl-1 pr-3 text-xs text-type-muted backdrop-blur-sm transition-colors hover:text-type">
						<span className="rounded-full bg-c10 px-2 py-0.5 font-semibold text-on-c10">Live</span>
						<span className="truncate">Now at 4 monuments in Bengaluru &amp; Kolkata</span>
						<span aria-hidden="true">→</span>
					</motion.a>
					<motion.h1 {...up(0.45)} className={`${h2} mt-6`} style={{ fontSize: "clamp(46px, 6.6vw, 100px)" }}>
						History, standing <Swash>where it stood.</Swash>
					</motion.h1>
					<motion.p {...up(0.6)} className="mt-6 max-w-[33rem] text-lg leading-relaxed text-type-muted md:text-xl">
						Point your phone at a monument and see what the historical record says was there: rebuilt in AR, narrated in English and Hindi,
						every claim sourced.
					</motion.p>
					<motion.div {...up(0.75)} className="mt-8 flex flex-wrap gap-3">
						<a href={PLAY_URL} target="_blank" rel="noopener noreferrer" className={primary}>
							Get it on Google Play <span aria-hidden="true">↗</span>
						</a>
						<a
							href="#era-0"
							onClick={(e) => {
								e.preventDefault();
								scrollToId("era-0");
							}}
							className={secondary}>
							See how it works
						</a>
					</motion.div>
					<motion.dl {...up(0.9)} className="mt-10 grid max-w-xl grid-cols-4 border-t border-hair pt-6">
						{STATS.map(([n, l], i) => (
							<div key={l} className={i ? "border-l border-hair pl-4" : ""}>
								<dt className="sr-only">{l}</dt>
								<dd className="text-2xl font-semibold tracking-[-0.03em] text-type md:text-3xl">{n}</dd>
								<dd className="mt-1 text-[11px] leading-tight text-type-muted md:text-xs">{l}</dd>
							</div>
						))}
					</motion.dl>
				</div>
				<motion.p
					{...up(1.2)}
					className="mt-8 hidden max-w-[15rem] font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-type-muted md:absolute md:bottom-6 md:right-10 md:block">
					The Konark wheel is a sundial: its shadow tells the hour. Epocheye tells the rest.
				</motion.p>
			</div>
			<div className={`${wrap} relative mt-12 border-t border-hair py-7`}>
				<p className="font-mono text-[11px] uppercase tracking-[0.22em] text-type-muted">Backed by</p>
				<ul className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-6 opacity-85 md:justify-between">
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

/* ───────────────────────── The product ───────────────────────── */

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
	return (
		<Chapter id="product" model="konark" side="left" az={28} sun={-35} className="min-h-[150svh]" label="What Epocheye does">
			<Reveal>
				<Eyebrow>Konark Sun Temple · rebuilt from the record</Eyebrow>
				<h2 className={`${h2} mt-4`} style={{ fontSize: "clamp(36px, 4.8vw, 72px)" }}>
					Three systems. <span className={serif}>One impossible product.</span>
				</h2>
			</Reveal>
			<ol className="mt-8">
				{STACK.map((s, i) => (
					<Reveal key={s.title} delay={0.08 * i}>
						<li className="border-t border-hair py-5">
							<p className="flex items-baseline gap-4">
								<span className="font-mono text-xs text-c10">0{i + 1}</span>
								<span className="text-2xl font-semibold tracking-[-0.02em] text-type md:text-3xl">{s.title}</span>
							</p>
							<p className="mt-2 max-w-lg pl-8 text-base leading-relaxed text-type-muted">{s.desc}</p>
						</li>
					</Reveal>
				))}
			</ol>
		</Chapter>
	);
}

/* ───────────────────────── How it works: four eras ───────────────────────── */

const ERAS = [
	{ model: "colosseum", year: "80 AD", label: "Reconstructing · Colosseum, 80 AD", sun: -70, az: -22 },
	{ model: "angkor", year: "1150", label: "Standing · Angkor Wat, 1150", sun: -15, az: 18 },
	{ model: "machuPicchu", year: "1450", label: "Built · Machu Picchu, 1450", sun: 45, az: -12 },
	{ model: "phone", year: "Today", label: "Today · explore it in AR", sun: 80, az: 8 },
];
const HOW = [
	["Point.", "Aim your phone at any heritage monument in front of you."],
	["Scrub.", "Drag the timeline to slide through centuries of its history."],
	["Travel.", "Unlock stories and reconstructions verified by historians."],
];

function Era({ era, index }) {
	const word = Math.min(index, 2);
	return (
		<Chapter id={`era-${index}`} model={era.model} side="right" az={era.az} sun={era.sun} label={`How it works: ${era.year}`}>
			<Reveal>
				<Eyebrow>{`How it works · 0${index + 1} / 04`}</Eyebrow>
				<h2 className={`${h2} mt-4 flex flex-wrap gap-x-3`} style={{ fontSize: "clamp(34px, 4.4vw, 64px)" }}>
					{HOW.map(([w], i) => (
						<span key={w} className={i === word ? "" : "opacity-25"}>
							{w}
						</span>
					))}
				</h2>
				<p className="mt-3 max-w-md text-base leading-relaxed text-type-muted md:text-lg">{HOW[word][1]}</p>
				<p className={`${serif} mt-2 leading-[0.9] text-type`} style={{ fontSize: "clamp(84px, 11vw, 170px)" }}>
					{era.year}
				</p>
				<p className="font-mono text-[11px] uppercase tracking-[0.18em] text-type-muted">{era.label}</p>
			</Reveal>
			{/* The timeline: where this era sits, and a way to jump to the others. */}
			<div className="mt-8">
				<div className="relative h-1 rounded-full bg-hair">
					<span className="absolute inset-y-0 left-0 rounded-full bg-c10 transition-all duration-700" style={{ width: `${(index / (ERAS.length - 1)) * 100}%` }} />
					<span
						className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-page bg-c10"
						style={{ left: `${(index / (ERAS.length - 1)) * 100}%` }}
					/>
				</div>
				<div className="mt-3 flex justify-between">
					{ERAS.map((e, i) => (
						<button
							key={e.year}
							type="button"
							onClick={() => scrollToId(`era-${i}`)}
							className={`font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${i === index ? "text-type" : "text-type-faint hover:text-type-muted"}`}>
							{e.year}
						</button>
					))}
				</div>
			</div>
		</Chapter>
	);
}

/* ───────────────────────── The collection ───────────────────────── */

const COLLECTION = [
	{ model: "pyramids", name: "Pyramids of Giza", place: "Egypt", coord: "29.98°N 31.13°E", sun: 60, az: 22 },
	{ model: "taj", name: "Taj Mahal", place: "India", coord: "27.17°N 78.04°E", sun: -40, az: 0 },
];
const ROSTER = ["Taj Mahal", "Colosseum", "Machu Picchu", "Tikal", "Great Wall", "Pyramids", "Carcassonne", "Boudhanath", "Bagan"];

function Collection() {
	return COLLECTION.map((c, k) => (
		<Chapter key={c.model} id={k === 0 ? "collection" : undefined} model={c.model} side="left" az={c.az} sun={c.sun} label={`The collection: ${c.name}`}>
			<Reveal>
				<Eyebrow>{`The collection · ${String(k + 1).padStart(2, "0")}`}</Eyebrow>
				{k === 0 ? (
					<h2 className={`${h2} mt-4`} style={{ fontSize: "clamp(40px, 5.6vw, 84px)" }}>
						A world, <span className={serif}>rebuilt.</span>
					</h2>
				) : (
					<h2 className={`${h2} mt-4`} style={{ fontSize: "clamp(40px, 5.6vw, 84px)" }}>
						Next, <span className={serif}>the Taj.</span>
					</h2>
				)}
				<p className="mt-6 text-3xl font-semibold tracking-[-0.02em] text-type md:text-4xl">{c.name}</p>
				<p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-type-muted">
					{c.place} · {c.coord} · Coming 2026
				</p>
				<p className="mt-5 max-w-md text-base leading-relaxed text-type-muted">
					{k === 0
						? "Every model is built from the published record, stone by stone, and taken apart the same way."
						: "Next on the list, and seven more after it."}
				</p>
				{k === 1 && (
					<p className="mt-6 flex flex-wrap gap-2">
						{ROSTER.map((r) => (
							<span key={r} className="rounded-full border border-hair bg-page/60 px-3 py-1 text-xs text-type-muted backdrop-blur-sm">
								{r}
							</span>
						))}
					</p>
				)}
			</Reveal>
		</Chapter>
	));
}

/* ───────────────────────── Where it works ───────────────────────── */

function Where() {
	return (
		<Chapter id="where" model="victoria" side="right" az={-16} sun={25} className="min-h-[120svh]" label="Where it works">
			<Reveal>
				<Eyebrow>Where it works · Victoria Memorial, Kolkata</Eyebrow>
				<h2 className={`${h2} mt-4`} style={{ fontSize: "clamp(40px, 5.4vw, 80px)" }}>
					Live at <span className={serif}>four monuments.</span>
				</h2>
			</Reveal>
			<ol className="mt-8">
				{LIVE_MONUMENTS.map((m, i) => (
					<Reveal key={m.slug} delay={0.06 * i}>
						<li>
							<Link href={`/monuments/${m.slug}`} className="group flex items-center gap-4 border-t border-hair py-4">
								<span className="font-mono text-xs text-type-faint">0{i + 1}</span>
								<span className="flex-1 text-xl font-semibold tracking-[-0.02em] text-type md:text-2xl">{m.name}</span>
								<span className="text-sm text-type-muted">{m.city}</span>
								<span
									className="grid h-9 w-9 place-items-center rounded-full border border-hair text-type transition-colors group-hover:border-transparent group-hover:bg-c10 group-hover:text-on-c10"
									aria-hidden="true">
									↗
								</span>
							</Link>
						</li>
					</Reveal>
				))}
			</ol>
		</Chapter>
	);
}

/* ───────────────────────── In the field (opaque) ───────────────────────── */

function Field() {
	useEffect(() => {
		const el = document.getElementById("field-video");
		if (!el) return;
		const io = new IntersectionObserver(([e]) => (e.isIntersecting ? el.play().catch(() => {}) : el.pause()), { threshold: 0.2 });
		io.observe(el);
		return () => io.disconnect();
	}, []);
	return (
		<section data-chapter="none" aria-label="In the field" className="tone-normal relative z-10 bg-page py-20 md:py-28">
			<div className={wrap}>
				<Reveal className="flex flex-wrap items-end justify-between gap-6">
					<div>
						<Eyebrow>In the field</Eyebrow>
						<h2 className={`${h2} mt-4`} style={{ fontSize: "clamp(40px, 5.6vw, 84px)" }}>
							Heritage, <span className={serif}>in motion.</span>
						</h2>
					</div>
					<p className="max-w-sm text-base leading-relaxed text-type-muted">Real footage from the Epocheye AR prototype. Point, and the past renders in place.</p>
				</Reveal>
				<Reveal delay={0.1} className="relative mt-10 overflow-hidden rounded-[28px] border border-hair bg-black">
					<video id="field-video" className="aspect-video w-full object-cover" src="/shot2.mp4" muted loop playsInline preload="none" />
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
	return (
		<Chapter id="destinations" model="globe" side="left" az={0} sun={30} className="min-h-[120svh]" label="Where we're headed">
			<Reveal>
				<Eyebrow>Where we&apos;re headed · coming 2026</Eyebrow>
				<h2 className={`${h2} mt-4`} style={{ fontSize: "clamp(40px, 5.4vw, 80px)" }}>
					We&apos;re coming <span className={serif}>to these.</span>
				</h2>
			</Reveal>
			<Reveal delay={0.1}>
				<ol className="mt-8 grid grid-cols-2 gap-x-6 font-mono text-[12px] uppercase tracking-[0.1em] md:text-[13px]">
					{DESTINATIONS.map((x, k) => (
						<li key={x.name} className="flex items-baseline gap-3 border-t border-hair py-3">
							<span className="text-c10">{String(k + 1).padStart(2, "0")}</span>
							<span className="flex-1 text-type">{x.name}</span>
							<span className="hidden text-type-faint sm:inline">{x.place}</span>
						</li>
					))}
				</ol>
			</Reveal>
		</Chapter>
	);
}

/* ───────────────────────── Creators (inverted, opaque) ───────────────────────── */

function Creators() {
	return (
		<section id="creators" data-chapter="none" aria-label="Creators" className="tone-invert relative z-10 bg-page py-20 md:py-28">
			<div className={`${wrap} grid items-end gap-10 md:grid-cols-[1.3fr_1fr]`}>
				<Reveal>
					<Eyebrow>Creators program · applications open</Eyebrow>
					<h2 className={`${h2} mt-4`} style={{ fontSize: "clamp(38px, 5.4vw, 84px)" }}>
						Built with the people who <span className={serif}>tell these stories.</span>
					</h2>
					<p className="mt-5 max-w-lg text-base leading-relaxed text-type-muted md:text-lg">
						Turn heritage storytelling into income, and earn on every booking you drive. Clicks, conversions and UPI payouts update live on your
						dashboard: every rupee in the open.
					</p>
					<div className="mt-9 flex flex-wrap gap-3">
						<a href="https://creators.epocheye.com" target="_blank" rel="noopener noreferrer" className={primary}>
							Apply as a creator <span aria-hidden="true">↗</span>
						</a>
						<a href="https://creators.epocheye.com" target="_blank" rel="noopener noreferrer" className={secondary}>
							Creator login
						</a>
					</div>
				</Reveal>
				<Reveal delay={0.1}>
					<ol className="grid gap-3">
						{["Apply", "Get verified", "Earn"].map((w, i) => (
							<li key={w} className="flex items-baseline gap-4 border-t-2 border-type pt-3">
								<span className="font-mono text-xs text-type-muted">0{i + 1}</span>
								<span className="text-2xl font-semibold tracking-[-0.02em] text-type md:text-3xl">{w}</span>
							</li>
						))}
					</ol>
					<p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-type-faint">Verified by historians · Accurate sources · Expert-curated</p>
				</Reveal>
			</div>
		</section>
	);
}

/* ───────────────────────── Team & footer ───────────────────────── */

function Team() {
	return (
		<>
			<Chapter id="team" model="wheel" side="left" sun={-50} label="Team">
				<Reveal>
					<Eyebrow>The team</Eyebrow>
					<h2 className={`${h2} mt-4`} style={{ fontSize: "clamp(44px, 6vw, 92px)" }}>
						Operators, <span className={serif}>not tourists.</span>
					</h2>
					<div className="mt-8 flex items-start gap-4 border-t border-hair pt-6">
						<span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-type text-lg font-semibold text-page">SS</span>
						<div>
							<p className="text-xl font-semibold text-type">
								Sambit Singha <span className="ml-2 align-middle text-sm font-normal text-type-muted">Founder &amp; CEO</span>
							</p>
							<p className="mt-1 max-w-md text-base leading-relaxed text-type-muted">
								Full-stack engineer and product builder. Shipped at two startups before building the Epocheye AR prototype from scratch.
							</p>
						</div>
					</div>
					<p className="mt-8 max-w-lg text-lg leading-snug text-type md:text-xl">
						Investor or partner? We&apos;re raising to scale coverage across continents. If you back deep-tech with cultural impact, we should talk.
					</p>
					<a href="mailto:sambit@epocheye.app" className={`${primary} mt-6`}>
						Let&apos;s build the future of heritage <span aria-hidden="true">→</span>
					</a>
				</Reveal>
			</Chapter>
			<footer data-chapter="wheel" data-side="left" className="tone-normal relative z-10 bg-page">
				<div className={`${wrap} border-t border-hair pb-10 pt-8`}>
					<p className="select-none text-center font-semibold leading-none tracking-[-0.06em] text-type/10" style={{ fontSize: "clamp(72px, 19vw, 300px)" }} aria-hidden="true">
						Epocheye
					</p>
					<div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm text-type-muted">
						<span>© 2026 Epocheye Private Limited</span>
						<div className="flex flex-wrap gap-6">
							<a href="https://d2d3syfid51acn.cloudfront.net/app-release.apk" className="hover:text-type">
								Download APK
							</a>
							<button type="button" data-tally-open="mZ4Aa0" data-tally-layout="modal" data-tally-width="600" data-tally-auto-close="1000" className="hover:text-type">
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
				</div>
			</footer>
		</>
	);
}

/* ───────────────────────── Page ───────────────────────── */

export default function Home() {
	useSmoothScroll();
	const webgl = useSyncExternalStore(noop, hasWebGL, () => false);
	return (
		<main className="tone-normal relative flex-1 overflow-x-clip text-type">
			<div className="fixed inset-0 bg-page" aria-hidden="true" />
			{webgl && <Scene />}
			<Nav />
			<Hero />
			<div id="main-content">
				<Product />
				{ERAS.map((era, i) => (
					<Era key={era.year} era={era} index={i} />
				))}
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
