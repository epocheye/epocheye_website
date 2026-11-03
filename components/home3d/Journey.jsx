"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { LIVE_MONUMENTS } from "@/lib/monuments/live";
import { ScrambleText } from "@/components/preorder/reactbits";
import logoStpi from "@/public/logo-stpi.png";
import logoAws from "@/public/logo-aws.png";
import logoDraper from "@/public/logo-draper.png";
import { DESTINATIONS, ERAS, SHAPES, labelEls, ui } from "./scenes";
import { CITIES } from "./shapes";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const Particles = dynamic(() => import("./Particles"), { ssr: false, loading: () => null });

// The steps, in scroll order: the shape the cloud takes and which side the text sits on
// (the shape takes the other half on wide screens; on phones it sits above the text).
const STEPS = [
	{ shape: "temple", side: "left" },
	{ shape: "india", side: "right" },
	{ shape: "phone", side: "left" },
	{ shape: "wave", side: "left" },
	{ shape: "cards", side: "left" },
	{ shape: "pyramids", side: "right" },
	{ shape: "colosseum", side: "right" },
	{ shape: "taj", side: "right" },
	{ shape: "video", side: "left" },
	{ shape: "eras", side: "right" },
	{ shape: "globe", side: "left" },
	{ shape: "network", side: "right" },
	{ shape: "logo", side: "left" },
];

// Shared with the scene outside React state: scroll writes, the frame loop reads.
const track = { f: -1, steps: STEPS, pointerActive: false };

const noop = () => () => {};
function hasWebGL() {
	try {
		const c = document.createElement("canvas");
		return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
	} catch {
		return false;
	}
}
const useWebGL = () => useSyncExternalStore(noop, hasWebGL, () => true);
const subscribeWidth = (cb) => {
	const mq = window.matchMedia("(max-width: 767px)");
	mq.addEventListener("change", cb);
	return () => mq.removeEventListener("change", cb);
};
/** Fewer points on phones. */
const usePointCount = () =>
	useSyncExternalStore(subscribeWidth, () => (window.matchMedia("(max-width: 767px)").matches ? 26000 : 56000), () => 56000);

/* ───────────────────────── Text ───────────────────────── */

// No cards: the words sit straight on the scene, each headline rising word by
// word out of its own line as it arrives, the rest fading in after it.

const body = "font-mono text-sm leading-relaxed text-bone-muted";
const headline = "font-serif text-bone leading-[0.95] kin-spaced";

/** A section label with a short rule leading into it. */
function Label({ children }) {
	return (
		<p className="mono-label flex items-center gap-3 text-[11px] text-signal" data-fade>
			<span className="h-px w-8 bg-signal" aria-hidden="true" />
			{children}
		</p>
	);
}

/** Words that rise one by one out of a mask as the step arrives. */
function Words({ text, className = "" }) {
	return text.split(" ").map((w, i) => (
		<span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
			<span data-word className={`inline-block ${className}`}>
				{w}
				{" "}
			</span>
		</span>
	));
}

/**
 * One scroll step, a screen tall. Wide screens: the text takes one side, the
 * shape the other. Phones: the text sits low, the shape above it.
 */
function Step({ index, side, id, children, wide = false }) {
	return (
		<div
			id={id}
			data-step={index}
			className={`relative flex min-h-svh w-full items-end px-5 pb-24 pt-[50svh] md:items-center md:px-12 md:py-24 ${
				side === "right" ? "md:justify-end" : "md:justify-start"
			}`}>
			<div className={`w-full ${wide ? "md:max-w-[40rem]" : "md:max-w-[34rem]"}`}>{children}</div>
		</div>
	);
}

function Manifesto({ points }) {
	return (
		<>
			<Label>Epocheye — Est. 2026</Label>
			<h2 className={`${headline} mt-5`} style={{ fontSize: "clamp(64px, 10vw, 150px)" }}>
				<Words text="See" />
				<br />
				<Words text="through" className="italic text-bone-muted" />
				<br />
				<Words text="time." className="text-signal glow-signal" />
			</h2>
			<p className={`${body} mt-6 max-w-md`} data-fade>
				Historical intelligence for the physical world. Point your phone at a monument and see what the record says stood there.
			</p>
			<p className="mono-label mt-6 flex items-center gap-2 text-[10px] text-bone-muted" data-fade>
				<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" aria-hidden="true" />
				{`Konark Sun Temple · ${points.toLocaleString("en-IN")} points · move through it`}
			</p>
		</>
	);
}

// Logo heights differ because each file carries different padding: these make the marks look the same size.
const BACKERS = [
	{ name: "STPI", logo: logoStpi, w: 200, h: 200, className: "h-16 md:h-20" },
	{ name: "Amazon Web Services", logo: logoAws, w: 225, h: 225, className: "-my-4 h-24 md:-my-5 md:h-32" },
	{ name: "Draper Startup House", logo: logoDraper, w: 653, h: 382, className: "h-11 md:h-14" },
];

function Where() {
	const cityIndex = (name) => CITIES.findIndex((c) => c.name === name);
	const light = (m) => () => {
		ui.city = cityIndex(m.city);
	};
	const dim = () => {
		ui.city = -1;
	};
	return (
		<>
			<Label>01 — Where it works</Label>
			<h2 className={`${headline} mt-5`} style={{ fontSize: "clamp(44px, 6.5vw, 96px)" }}>
				<Words text="Live at four monuments." />
			</h2>
			{/* Point at a name: its city lights up on the map. */}
			<ol className="mt-7 space-y-1" data-fade>
				{LIVE_MONUMENTS.map((m, i) => (
					<li key={m.slug}>
						<Link
							href={`/monuments/${m.slug}`}
							onPointerEnter={light(m)}
							onPointerLeave={dim}
							onFocus={light(m)}
							onBlur={dim}
							className="group flex items-baseline gap-4 py-1">
							<span className="mono-label w-6 shrink-0 text-[10px] text-bone-faint">{String(i + 1).padStart(2, "0")}</span>
							<span className="link-sweep font-serif text-2xl text-bone transition-colors group-hover:text-signal md:text-[34px]">{m.name}</span>
							<span className="mono-label text-[10px] text-bone-muted opacity-60 transition-all duration-500 group-hover:translate-x-1 group-hover:text-signal group-hover:opacity-100">
								{m.city} ↗
							</span>
						</Link>
					</li>
				))}
			</ol>
			{/* Who backs us, big and in white so it reads at a glance. */}
			<div className="mt-10" data-fade>
				<p className="mono-label text-[11px] text-signal">Backed by</p>
				<div className="mt-4 flex flex-wrap items-center gap-x-10 gap-y-6">
					{BACKERS.map((b) => (
						<figure key={b.name} className="flex flex-col items-start gap-2">
							<Image src={b.logo} alt={b.name} width={b.w} height={b.h} className={`w-auto brightness-0 invert ${b.className}`} />
							<figcaption className="mono-label text-[10px] text-bone-muted">{b.name}</figcaption>
						</figure>
					))}
				</div>
			</div>
		</>
	);
}

const STACK = [
	{
		n: "01",
		title: "AR Time Travel",
		desc: "Stand at the monument and see what the record says was there: Tipu Sultan's Summer Palace as it was painted, Bangalore Fort's lost rampart back on its wall.",
	},
	{ n: "02", title: "AI Historian", desc: "A guided narration at Tipu Sultan's Summer Palace, in English and Hindi, stop by stop as you walk the rooms." },
	{
		n: "03",
		title: "Sourced, every card",
		desc: "Point at an exhibit and read what the published record says, with the source named. Where no record exists, the app says so.",
	},
];

/** A capability: a huge outlined numeral behind its name, and three ticks for where you are in the three. */
function Capability({ item, index }) {
	return (
		<>
			<Label>02 — The stack</Label>
			{index === 0 && (
				<p className="mt-5 font-serif text-2xl leading-tight text-bone-muted md:text-3xl" data-fade>
					Three systems. One impossible product.
				</p>
			)}
			<div className="relative mt-4">
				<span
					className="text-outline pointer-events-none absolute -left-2 -top-10 select-none font-serif leading-none md:-top-16"
					style={{ fontSize: "clamp(120px, 16vw, 230px)" }}
					aria-hidden="true">
					{item.n}
				</span>
				<h3 className={`${headline} relative pt-16 md:pt-24`} style={{ fontSize: "clamp(42px, 6vw, 88px)" }}>
					<Words text={item.title} />
				</h3>
			</div>
			<p className={`${body} mt-5 max-w-md`} data-fade>
				{item.desc}
			</p>
			<div className="mt-7 flex gap-2" role="img" aria-label={`${index + 1} of 3`} data-fade>
				{STACK.map((s, k) => (
					<span key={s.n} className={`h-[3px] rounded-full transition-all duration-700 ${k === index ? "w-12 bg-signal" : "w-5 bg-white/20"}`} />
				))}
			</div>
		</>
	);
}

const ROSTER = ["Taj Mahal", "Colosseum", "Machu Picchu", "Tikal", "Great Wall", "Pyramids", "Carcassonne", "Boudhanath", "Bagan"];
const COLLECTION = [
	{ name: "Pyramids", place: "Pyramids of Giza · Egypt" },
	{ name: "Colosseum", place: "Colosseum · Italy" },
	{ name: "Taj Mahal", place: "Taj Mahal · India" },
];

/** The roster runs past as a ticker; the one being rebuilt is lit. */
function Ticker({ active }) {
	const row = (dup) =>
		ROSTER.map((r) => (
			<span key={`${dup}${r}`} className={`flex items-center gap-6 font-serif text-3xl md:text-4xl ${r === active ? "text-signal" : "text-bone/25"}`}>
				{r}
				<span className="text-base text-bone/20">✦</span>
			</span>
		));
	return (
		<div className="mt-7 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]" aria-hidden="true" data-fade>
			<div className="ticker flex w-max gap-6">
				{row("a")}
				{row("b")}
			</div>
		</div>
	);
}

function Collection({ item, index }) {
	return (
		<>
			<Label>03 — The collection</Label>
			<h2 className={`${headline} mt-5`} style={{ fontSize: index === 0 ? "clamp(48px, 7.5vw, 112px)" : "clamp(32px, 4vw, 56px)" }}>
				<Words text="A world, rebuilt." className={index === 0 ? "" : "text-bone-muted"} />
			</h2>
			<p className="mono-label mt-6 text-[11px] text-bone-muted" data-fade>
				Now rebuilding
			</p>
			<p className="mt-1 font-serif text-3xl text-bone md:text-4xl" data-fade>
				<ScrambleText text={item.place} />
			</p>
			<p className="sr-only">{`The collection: ${ROSTER.join(", ")}.`}</p>
			<Ticker active={item.name} />
		</>
	);
}

function Field() {
	return (
		<>
			<Label>04 — In the field</Label>
			<h2 className={`${headline} mt-5`} style={{ fontSize: "clamp(52px, 8vw, 124px)" }}>
				<Words text="Heritage," />
				<br />
				<Words text="in motion." className="italic text-signal" />
			</h2>
			<p className={`${body} mt-6 max-w-md`} data-fade>
				Real footage from the Epocheye AR prototype. Point, and the past renders in place. Every point here takes its colour from a pixel of
				that clip, live.
			</p>
			<p className="mono-label mt-5 flex items-center gap-2 text-[10px] text-bone-muted" data-fade>
				<span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
				Playing · AR prototype
			</p>
		</>
	);
}

const HOW = [
	["Point", "Aim your phone at any heritage monument in front of you."],
	["Scrub", "Drag the timeline to slide through centuries of its history."],
	["Travel", "Unlock stories and reconstructions verified by historians."],
];

/** The timeline: a giant year you scrub (or let play), and the cloud rebuilds each era. */
function Eras({ active }) {
	const [era, setEra] = useState(0);
	const [value, setValue] = useState(0);
	const held = useRef(0);
	const tween = useRef(null);

	const go = (target) => {
		tween.current?.kill();
		tween.current = gsap.to(ui, {
			era: target,
			duration: 1.6,
			ease: "power2.inOut",
			onUpdate: () => {
				setValue(ui.era);
				setEra(Math.round(ui.era));
			},
		});
	};

	// Plays through the eras while it is on screen and nobody is dragging.
	const tick = useEffectEvent(() => {
		if (performance.now() < held.current) return;
		go((Math.round(ui.era) + 1) % ERAS.length);
	});
	useEffect(() => {
		if (!active) return;
		const id = setInterval(tick, 3800);
		return () => clearInterval(id);
	}, [active]);
	useEffect(() => () => tween.current?.kill(), []);

	const hold = () => {
		held.current = performance.now() + 9000;
	};
	const step = Math.min(era, 2);

	return (
		<>
			<Label>05 — How it works</Label>
			<h2 className="mt-5 flex flex-wrap gap-x-4 font-serif leading-none kin-spaced" style={{ fontSize: "clamp(40px, 5.5vw, 80px)" }}>
				{HOW.map(([w], i) => (
					<span key={w} className={`transition-colors duration-700 ${i === step ? "text-bone" : "text-bone/25"}`}>
						{w}.
					</span>
				))}
			</h2>
			<p className={`${body} mt-3 min-h-[3em] max-w-md`}>{HOW[step][1]}</p>
			{/* The year, huge: it is what you are scrubbing. */}
			<p className="mt-4 font-serif leading-[0.85] text-signal" style={{ fontSize: "clamp(84px, 12vw, 180px)" }} aria-live="polite">
				<ScrambleText text={ERAS[era].year} />
			</p>
			<p className="mono-label mt-2 text-[10px] text-bone-muted">{ERAS[era].label}</p>
			<input
				type="range"
				min={0}
				max={ERAS.length - 1}
				step={0.01}
				value={value}
				aria-label="Timeline"
				aria-valuetext={ERAS[era].year}
				onPointerDown={() => {
					hold();
					tween.current?.kill();
				}}
				onChange={(e) => {
					hold();
					const v = Number(e.target.value);
					ui.era = v;
					setValue(v);
					setEra(Math.round(v));
				}}
				onPointerUp={() => go(Math.round(ui.era))}
				onKeyUp={() => go(Math.round(ui.era))}
				className="era-range mt-6 w-full"
			/>
			<div className="mt-3 flex justify-between">
				{ERAS.map((e, i) => (
					<button
						key={e.year}
						type="button"
						onClick={() => {
							hold();
							go(i);
						}}
						className={`mono-label text-[10px] transition-colors ${i === era ? "text-signal" : "text-bone-muted hover:text-bone"}`}>
						{e.year}
					</button>
				))}
			</div>
		</>
	);
}

/** Turns the globe to site k and holds it there a while, so the tour doesn't snatch it away. */
function pickDestination(k, holdFor = 9000) {
	if (holdFor) ui.heldUntil = performance.now() + holdFor;
	ui.destination = k;
	return k;
}

/** A departures board: point at a row and the globe turns to it; otherwise it tours them. */
function Destinations({ active }) {
	const [picked, setPicked] = useState(0);
	const pick = (k) => setPicked(pickDestination(k));
	useEffect(() => {
		if (!active) return;
		const id = setInterval(() => {
			if (performance.now() < ui.heldUntil) return;
			setPicked(pickDestination((ui.destination + 1) % DESTINATIONS.length, 0));
		}, 3200);
		return () => clearInterval(id);
	}, [active]);
	const d = DESTINATIONS[picked];
	return (
		<>
			<Label>06 — Where we&apos;re headed</Label>
			<h2 className={`${headline} mt-5`} style={{ fontSize: "clamp(40px, 6vw, 88px)" }}>
				<Words text="We're coming to these." />
			</h2>
			<p className="mt-6 font-serif text-4xl leading-none text-signal md:text-5xl" aria-live="polite">
				<ScrambleText text={d.name} />
			</p>
			<p className="mono-label mt-2 text-[10px] text-bone-muted">{`${d.place} · ${d.coord} · Coming 2026`}</p>
			<ol className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] md:text-xs" data-fade>
				{DESTINATIONS.map((x, k) => (
					<li key={x.name}>
						<button
							type="button"
							onPointerEnter={() => pick(k)}
							onFocus={() => pick(k)}
							onClick={() => pick(k)}
							className={`flex w-full items-baseline gap-3 py-[3px] text-left transition-colors ${k === picked ? "text-signal" : "text-bone-muted hover:text-bone"}`}>
							<span className="w-5 opacity-50">{String(k + 1).padStart(2, "0")}</span>
							<span className="shrink-0">{x.name}</span>
							<span className="mb-[3px] flex-1 border-b border-dotted border-current opacity-30" aria-hidden="true" />
							<span className="shrink-0">{x.place}</span>
						</button>
					</li>
				))}
			</ol>
		</>
	);
}

/** Creators: how it works as three words joined by lines that draw themselves, then two plain links. */
function Network() {
	return (
		<>
			<Label>07 — The network</Label>
			<h2 className={`${headline} mt-5`} style={{ fontSize: "clamp(40px, 5.6vw, 84px)" }}>
				<Words text="Built with the people who tell these stories." />
			</h2>
			<p className="mono-label mt-7 flex items-center gap-2 text-[10px] text-signal" data-fade>
				<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" aria-hidden="true" />
				Creators Program · applications open
			</p>
			<ol className="mt-4 flex flex-wrap items-center gap-3 font-serif text-3xl text-bone md:text-5xl" data-fade>
				{["Apply", "Get verified", "Earn"].map((w, i) => (
					<li key={w} className="flex items-center gap-3">
						{i > 0 && <span data-draw className="block h-px w-6 origin-left bg-signal md:w-12" aria-hidden="true" />}
						<span className={i === 2 ? "italic text-signal" : ""}>{w}</span>
					</li>
				))}
			</ol>
			<p className={`${body} mt-5 max-w-md`} data-fade>
				Turn heritage storytelling into income, and earn on every booking you drive. Clicks, conversions and UPI payouts update live on
				your dashboard: every rupee in the open.
			</p>
			<div className="mt-7 flex flex-wrap gap-x-8 gap-y-3" data-fade>
				{[
					["Apply as a creator", "https://creators.epocheye.com"],
					["Creator login", "https://creators.epocheye.com"],
				].map(([t, href], i) => (
					<a
						key={t}
						href={href}
						target="_blank"
						rel="noopener noreferrer"
						className={`link-sweep group font-serif text-2xl md:text-3xl ${i === 0 ? "text-signal" : "text-bone"}`}>
						{t} <span className="inline-block transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1">↗</span>
					</a>
				))}
			</div>
			<p className="mono-label mt-8 text-[10px] text-bone-faint" data-fade>
				Verified by historians / 100% accurate sources / Expert-curated content
			</p>
		</>
	);
}

function Team() {
	return (
		<>
			<Label>08 — The team</Label>
			<h2 className={`${headline} mt-5`} style={{ fontSize: "clamp(52px, 8vw, 124px)" }}>
				<Words text="Operators," />
				<br />
				<Words text="not tourists." className="italic text-bone-muted" />
			</h2>
			<p className="mt-7 font-serif text-2xl text-bone" data-fade>
				Sambit Singha <span className="mono-label ml-2 align-middle text-[10px] text-signal">Founder &amp; CEO</span>
			</p>
			<p className={`${body} mt-2 max-w-md`} data-fade>
				Full-stack engineer and product builder. Shipped at two startups before building the Epocheye AR prototype from scratch.
			</p>
			<p className="mt-7 max-w-md font-serif text-xl leading-snug text-bone-muted" data-fade>
				Investor or partner? We&apos;re raising to scale coverage across continents. If you back deep-tech with cultural impact, we should
				talk.
			</p>
			<a href="mailto:sambit@epocheye.app" className="link-sweep group mt-4 inline-block font-serif text-3xl text-signal md:text-4xl" data-fade>
				Let&apos;s build the future of heritage <span className="inline-block transition-transform duration-300 group-hover:translate-x-2">→</span>
			</a>
			<p className="mono-label mt-10 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-bone-faint" data-fade>
				<span>© 2026 Epocheye Private Limited</span>
				<Link href="/privacy" className="hover:text-signal">
					Privacy
				</Link>
				<Link href="/terms" className="hover:text-signal">
					Terms
				</Link>
			</p>
		</>
	);
}

/* ───────────────────────── The journey ───────────────────────── */

/**
 * Everything below the hero. One cloud of points, pinned behind the page,
 * takes the shape of each step as you scroll past it; the text is ordinary
 * page text, so it reads (and indexes) with or without WebGL.
 */
export default function Journey() {
	const webgl = useWebGL();
	const points = usePointCount();
	const section = useRef(null);
	const stage = useRef(null);
	const [active, setActive] = useState(false);
	const [step, setStep] = useState(0);

	useEffect(() => {
		const root = section.current;
		const els = [...root.querySelectorAll("[data-step]")];
		let centres = [];
		const measure = () => {
			centres = els.map((el) => {
				const r = el.getBoundingClientRect();
				return r.top + window.scrollY + r.height / 2;
			});
		};
		const update = () => {
			if (!centres.length) return;
			const mid = window.scrollY + window.innerHeight / 2;
			const first = centres[0] - window.innerHeight;
			let f;
			if (mid <= centres[0]) f = Math.max(-1, -1 + (mid - first) / (centres[0] - first));
			else {
				let i = 0;
				while (i < centres.length - 1 && mid > centres[i + 1]) i += 1;
				f = i === centres.length - 1 ? i : i + (mid - centres[i]) / (centres[i + 1] - centres[i]);
			}
			track.f = f;
			const s = Math.max(0, Math.min(STEPS.length - 1, Math.round(f)));
			setStep((prev) => (prev === s ? prev : s));
		};
		measure();
		update();

		const triggers = [];
		if (webgl) {
			// The stage stays on screen for the whole section. (html and body clip
			// overflow-x, which breaks position: sticky, so GSAP pins it.)
			triggers.push(
				ScrollTrigger.create({ trigger: root, start: "top top", end: "bottom bottom", pin: stage.current, pinSpacing: false }),
				ScrollTrigger.create({ trigger: root, start: "top bottom", end: "bottom top", onToggle: (self) => setActive(self.isActive) })
			);
		}
		triggers.push(ScrollTrigger.create({ trigger: root, start: "top bottom", end: "bottom top", onUpdate: update, onRefresh: () => (measure(), update()) }));

		// Each step arrives in order: its headline rises word by word out of
		// its own line, then the rest fades up, and connecting lines draw in.
		const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		const reveals = reduced
			? []
			: els.map((el) =>
					gsap
						.timeline({ scrollTrigger: { trigger: el, start: "top 65%", toggleActions: "play none none reverse" } })
						.from(el.querySelectorAll("[data-word]"), { yPercent: 115, rotate: 4, duration: 0.9, ease: "power4.out", stagger: 0.05 })
						.from(el.querySelectorAll("[data-fade]"), { opacity: 0, y: 18, duration: 0.7, ease: "power3.out", stagger: 0.08 }, "-=0.55")
						.from(el.querySelectorAll("[data-draw]"), { scaleX: 0, duration: 0.6, ease: "power2.inOut", stagger: 0.25 }, "-=0.4")
				);

		const onMove = () => {
			track.pointerActive = true;
		};
		const onLeave = () => {
			track.pointerActive = false;
		};
		root.addEventListener("pointermove", onMove);
		root.addEventListener("pointerleave", onLeave);
		ScrollTrigger.refresh();
		return () => {
			triggers.forEach((t) => t.kill());
			reveals.forEach((t) => t.scrollTrigger?.kill() || t.kill());
			root.removeEventListener("pointermove", onMove);
			root.removeEventListener("pointerleave", onLeave);
		};
	}, [webgl]);

	const current = STEPS[step].shape;
	const caption = current === "eras" ? null : SHAPES[current]?.caption;

	return (
		<section id="main-content" ref={section} aria-label="What Epocheye does" className="relative bg-ink">
			{webgl && (
				<div ref={stage} className="relative h-svh w-full overflow-hidden" aria-hidden="true">
					<Particles track={track} active={active} eventSource={section} count={points} />
					{/* A soft shade on the side the text is on, so words read without a card behind them. */}
					<div
						className={`pointer-events-none absolute inset-0 transition-opacity duration-700 max-md:bg-gradient-to-t max-md:from-[#0A0A0B] max-md:via-[#0A0A0B]/75 max-md:via-45% max-md:to-transparent max-md:to-70% md:bg-gradient-to-r md:from-[#0A0A0B]/80 md:via-[#0A0A0B]/30 md:via-35% md:to-transparent md:to-55% ${
							STEPS[step].side === "left" ? "opacity-100" : "opacity-0"
						}`}
					/>
					<div
						className={`pointer-events-none absolute inset-0 transition-opacity duration-700 max-md:bg-gradient-to-t max-md:from-[#0A0A0B] max-md:via-[#0A0A0B]/75 max-md:via-45% max-md:to-transparent max-md:to-70% md:bg-gradient-to-l md:from-[#0A0A0B]/80 md:via-[#0A0A0B]/30 md:via-35% md:to-transparent md:to-55% ${
							STEPS[step].side === "left" ? "opacity-0" : "opacity-100"
						}`}
					/>
					{/* Labels pinned to points in the cloud (the frame loop places them). */}
					{CITIES.map((c) => (
						<span
							key={c.id}
							ref={(el) => {
								labelEls[c.id] = el;
							}}
							className="pointer-events-none absolute left-0 top-0 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border border-signal/40 bg-ink/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-signal opacity-0 backdrop-blur"
							style={{ willChange: "transform" }}>
							{`${c.name} · 2 live`}
						</span>
					))}
					{DESTINATIONS.map((d, k) => (
						<span
							key={d.name}
							ref={(el) => {
								labelEls[`dest-${k}`] = el;
							}}
							className="pointer-events-none absolute left-0 top-0 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border border-signal/40 bg-ink/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-signal opacity-0 backdrop-blur"
							style={{ willChange: "transform" }}>
							{d.name}
						</span>
					))}
					<p className="pointer-events-none absolute bottom-7 right-10 hidden text-right font-mono text-[10px] uppercase tracking-[0.22em] text-bone-muted md:block">
						<span className="text-signal">{`${points.toLocaleString("en-IN")} points`}</span>
						<br />
						{caption ?? "Drag the timeline"}
					</p>
				</div>
			)}

			<div className={`relative z-10 ${webgl ? "-mt-[100svh]" : ""}`}>
				<Step index={0} side="left">
					<Manifesto points={points} />
				</Step>
				<Step index={1} side="right" id="where">
					<Where />
				</Step>
				{STACK.map((item, k) => (
					<Step key={item.n} index={2 + k} side="left" id={k === 0 ? "capabilities" : undefined}>
						<Capability item={item} index={k} />
					</Step>
				))}
				{COLLECTION.map((item, k) => (
					<Step key={item.name} index={5 + k} side="right" id={k === 0 ? "collection" : undefined} wide>
						<Collection item={item} index={k} />
					</Step>
				))}
				<Step index={8} side="left" id="field">
					<Field />
				</Step>
				<Step index={9} side="right" id="how-it-works">
					<Eras active={step === 9} />
				</Step>
				<Step index={10} side="left" id="destinations">
					<Destinations active={step === 10} />
				</Step>
				<Step index={11} side="right" id="creators" wide>
					<Network />
				</Step>
				<Step index={12} side="left" id="team">
					<Team />
				</Step>
			</div>
		</section>
	);
}
