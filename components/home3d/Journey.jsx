"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { LIVE_MONUMENTS } from "@/lib/monuments/live";
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
	{ shape: "eye", side: "left" },
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

/* ───────────────────────── Text blocks ───────────────────────── */

const label = "mono-label text-[11px] text-signal";
const body = "font-mono text-sm leading-relaxed text-bone-muted";
const headline = "font-serif text-bone leading-[0.95] kin-spaced";

/**
 * One scroll step: a full screen tall, its text on one side (wide screens) or
 * in a glass card at the bottom (phones), leaving the cloud room above.
 */
function Step({ index, side, id, children, wide = false }) {
	return (
		<div
			id={id}
			data-step={index}
			className={`relative flex min-h-svh w-full items-end px-4 pb-24 pt-[48svh] md:items-center md:px-10 md:py-24 ${
				side === "right" ? "md:justify-end" : "md:justify-start"
			}`}>
			<div
				data-reveal
				className={`w-full rounded-3xl border border-rule bg-ink/70 p-6 backdrop-blur-md md:rounded-none md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none ${
					wide ? "md:max-w-[36rem]" : "md:max-w-[32rem]"
				}`}>
				{children}
			</div>
		</div>
	);
}

function Manifesto({ points }) {
	return (
		<>
			<p className={label}>Epocheye — Est. 2026</p>
			<h2 className={`${headline} mt-4`} style={{ fontSize: "clamp(56px, 9vw, 132px)" }}>
				See
				<br />
				<em className="text-bone-muted">through</em>
				<br />
				<span className="text-signal glow-signal">time.</span>
			</h2>
			<p className={`${body} mt-6 max-w-md`}>
				Historical intelligence for the physical world. Point your phone at a monument and see what the record says stood there.
			</p>
			<p className="mono-label mt-6 text-[10px] text-bone-faint">
				{`Konark Sun Temple, as ${points.toLocaleString("en-IN")} points of light. Move through it.`}
			</p>
		</>
	);
}

function Where() {
	const cityIndex = (name) => CITIES.findIndex((c) => c.name === name);
	return (
		<>
			<p className={label}>01 — Where it works</p>
			<h2 className={`${headline} mt-4`} style={{ fontSize: "clamp(40px, 6vw, 84px)" }}>
				Live at four monuments.
			</h2>
			<ul className="mt-6 divide-y divide-rule border-y border-rule">
				{LIVE_MONUMENTS.map((m) => (
					<li key={m.slug}>
						<Link
							href={`/monuments/${m.slug}`}
							onPointerEnter={() => {
								ui.city = cityIndex(m.city);
							}}
							onPointerLeave={() => {
								ui.city = -1;
							}}
							onFocus={() => {
								ui.city = cityIndex(m.city);
							}}
							onBlur={() => {
								ui.city = -1;
							}}
							className="group flex items-baseline justify-between gap-4 py-3 transition-colors">
							<span className="font-serif text-2xl text-bone transition-colors group-hover:text-signal md:text-3xl">{m.name}</span>
							<span className="mono-label shrink-0 text-[10px] text-bone-muted">{m.city} ↗</span>
						</Link>
					</li>
				))}
			</ul>
			<div className="mt-6 flex items-center gap-5">
				<span className="mono-label text-[10px] text-bone-faint">Backed by</span>
				<Image src={logoStpi} alt="Software Technology Parks of India" width={200} height={200} className="h-8 w-auto" />
				<Image src={logoAws} alt="Amazon Web Services" width={225} height={225} className="-mx-2 h-12 w-auto" />
				<Image src={logoDraper} alt="Draper Startup House" width={653} height={382} className="h-6 w-auto" />
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

function Capability({ item, first }) {
	return (
		<>
			<p className={label}>{first ? "02 — The stack" : `02 — The stack · ${item.n} / 03`}</p>
			{first && (
				<p className="mt-4 font-serif text-2xl leading-tight text-bone-muted md:text-3xl">Three systems. One impossible product.</p>
			)}
			<div className="mt-6 flex items-baseline gap-4">
				<span className="font-serif text-5xl leading-none text-signal md:text-6xl">{item.n}</span>
				<h3 className={headline} style={{ fontSize: "clamp(36px, 5vw, 68px)" }}>
					{item.title}
				</h3>
			</div>
			<p className={`${body} mt-5`}>{item.desc}</p>
		</>
	);
}

const ROSTER = ["Taj Mahal", "Colosseum", "Machu Picchu", "Tikal", "Great Wall", "Pyramids", "Carcassonne", "Boudhanath", "Bagan"];
const COLLECTION = [
	{ name: "Pyramids", place: "Pyramids of Giza · Egypt" },
	{ name: "Colosseum", place: "Colosseum · Italy" },
	{ name: "Taj Mahal", place: "Taj Mahal · India" },
];

function Collection({ item, first }) {
	return (
		<>
			<p className={label}>{"// The collection"}</p>
			{first ? (
				<h2 className={`${headline} mt-4`} style={{ fontSize: "clamp(44px, 7vw, 104px)" }}>
					A world, rebuilt.
				</h2>
			) : (
				<p className="mt-4 font-serif text-3xl text-bone-muted">A world, rebuilt.</p>
			)}
			<p className={`${body} mt-5`}>{`Assembled across the ages, point by point. Now: ${item.place}.`}</p>
			<ol className="mt-6 grid grid-cols-3 gap-x-4 gap-y-2">
				{ROSTER.map((r, i) => (
					<li key={r} className={`mono-label text-[10px] transition-colors ${r === item.name ? "text-signal" : "text-bone-faint"}`}>
						{`${String(i + 1).padStart(2, "0")} ${r}`}
					</li>
				))}
			</ol>
		</>
	);
}

function Field() {
	return (
		<>
			<p className={label}>{"// In the field"}</p>
			<h2 className={`${headline} mt-4`} style={{ fontSize: "clamp(44px, 7vw, 104px)" }}>
				Heritage, <em className="text-signal">in motion.</em>
			</h2>
			<p className={`${body} mt-5`}>
				Real footage from the Epocheye AR prototype. Point, and the past renders in place. Every point here takes its colour from a pixel
				of that clip, live.
			</p>
		</>
	);
}

const HOW = [
	["01", "Point", "Aim your phone at any heritage monument in front of you."],
	["02", "Scrub", "Drag the timeline to slide through centuries of its history."],
	["03", "Travel", "Unlock stories and reconstructions verified by historians."],
];

/** The timeline: drag it (or let it play) and the cloud rebuilds each era. */
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

	return (
		<>
			<p className={label}>03 — How it works</p>
			<h2 className={`${headline} mt-4`} style={{ fontSize: "clamp(40px, 6vw, 88px)" }}>
				Point. Scrub. Travel.
			</h2>
			<div className="mt-7">
				<div className="flex items-baseline justify-between">
					<span className="font-serif text-4xl text-bone md:text-5xl">{ERAS[era].year}</span>
					<span className="mono-label text-[10px] text-signal">{ERAS[era].label}</span>
				</div>
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
					className="era-range mt-4 w-full"
				/>
				<div className="mt-2 flex justify-between">
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
			</div>
			<ol className="mt-8 grid grid-cols-3 gap-4 border-t border-rule pt-5">
				{HOW.map(([n, t, d], i) => (
					<li key={n} className={`transition-opacity duration-500 ${Math.min(era, 2) === i ? "opacity-100" : "opacity-40"}`}>
						<span className="font-serif text-2xl text-signal">{n}</span>
						<p className="font-serif text-xl text-bone">{t}</p>
						<p className="mt-1 hidden font-mono text-[11px] leading-relaxed text-bone-muted md:block">{d}</p>
					</li>
				))}
			</ol>
		</>
	);
}

/** Turns the globe to site k and holds it there a while, so the tour doesn't snatch it away. */
function pickDestination(k, holdFor = 9000) {
	if (holdFor) ui.heldUntil = performance.now() + holdFor;
	ui.destination = k;
	return k;
}

/** The roster: point at a site and the globe turns to it; otherwise it tours them. */
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
	return (
		<>
			<p className={label}>04 — Where we&apos;re headed</p>
			<h2 className={`${headline} mt-4`} style={{ fontSize: "clamp(40px, 6vw, 88px)" }}>
				We&apos;re coming to these.
			</h2>
			<p className={`${body} mt-4 hidden md:block`}>The world&apos;s monuments, rebuilt and narrated in AR. Five continents, launching 2026.</p>
			<ul className="mt-6 grid grid-cols-2 gap-x-6 border-t border-rule pt-4">
				{DESTINATIONS.map((d, k) => (
					<li key={d.name}>
						<button
							type="button"
							onPointerEnter={() => pick(k)}
							onFocus={() => pick(k)}
							onClick={() => pick(k)}
							className={`flex w-full items-baseline gap-2 py-1.5 text-left transition-colors ${k === picked ? "text-signal" : "text-bone-muted hover:text-bone"}`}>
							<span className="mono-label text-[10px] opacity-60">{String(k + 1).padStart(2, "0")}</span>
							<span className="font-serif text-lg md:text-xl">{d.name}</span>
						</button>
					</li>
				))}
			</ul>
			<p className="mono-label mt-4 text-[10px] text-bone-faint">{`${DESTINATIONS[picked].place} · ${DESTINATIONS[picked].coord} · Coming 2026`}</p>
		</>
	);
}

const CREATOR_CARDS = [
	{
		tag: "// Applications open",
		title: "Creators Program is live",
		desc: "Turn heritage storytelling into income. Apply, get verified, earn on every booking you drive.",
		cta: "Apply as a creator →",
	},
	{
		tag: "// Live dashboard",
		title: "Payout tracking, in real time",
		desc: "Watch clicks, conversions, and UPI payouts update live. Full transparency on every rupee you earn.",
		cta: "Creator login →",
	},
];

function Network() {
	return (
		<>
			<p className={label}>05 — The network</p>
			<h2 className={`${headline} mt-4`} style={{ fontSize: "clamp(36px, 5vw, 72px)" }}>
				Built with the people who tell these stories.
			</h2>
			<div className="mt-6 grid gap-3">
				{CREATOR_CARDS.map((c) => (
					<a
						key={c.title}
						href="https://creators.epocheye.com"
						target="_blank"
						rel="noopener noreferrer"
						className="group block rounded-2xl border border-rule bg-white/[0.03] p-5 transition-colors hover:border-signal/60">
						<span className="mono-label text-[10px] text-signal">{c.tag}</span>
						<p className="mt-1 font-serif text-2xl text-bone">{c.title}</p>
						<p className="mt-1 hidden font-mono text-xs leading-relaxed text-bone-muted md:block">{c.desc}</p>
						<span className="mono-label mt-3 inline-block text-[11px] text-signal transition-transform group-hover:translate-x-1">{c.cta}</span>
					</a>
				))}
			</div>
			<p className="mono-label mt-5 text-[10px] text-bone-faint">Verified by historians / 100% accurate sources / Expert-curated content</p>
		</>
	);
}

function Team() {
	return (
		<>
			<p className={label}>06 — The team</p>
			<h2 className={`${headline} mt-4`} style={{ fontSize: "clamp(44px, 7vw, 104px)" }}>
				Operators, <em className="text-bone-muted">not tourists.</em>
			</h2>
			<div className="mt-6 border-t border-rule pt-5">
				<p className="font-serif text-3xl text-bone">Sambit Singha</p>
				<p className="mono-label mt-1 text-[11px] text-signal">Founder &amp; CEO</p>
				<p className={`${body} mt-3`}>
					Full-stack engineer and product builder. Shipped at two startups before building the Epocheye AR prototype from scratch.
				</p>
			</div>
			<div className="mt-6 border-t border-rule pt-5">
				<p className="font-serif text-2xl leading-snug text-bone">Investor or partner? Let&apos;s build the future of heritage.</p>
				<p className={`${body} mt-2`}>
					We&apos;re raising to scale coverage across continents. If you back deep-tech with cultural impact, we should talk.
				</p>
				<a
					href="mailto:sambit@epocheye.app"
					className="mono-label mt-5 inline-flex items-center rounded-full bg-signal px-7 py-4 text-xs text-ink box-glow-signal transition-transform hover:scale-[1.03]">
					Get in touch →
				</a>
			</div>
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

		// Each step's text rises in as it arrives.
		const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		const reveals = reduced
			? []
			: els.map((el) =>
					gsap.from(el.querySelector("[data-reveal]"), {
						opacity: 0,
						y: 40,
						duration: 0.9,
						ease: "power3.out",
						scrollTrigger: { trigger: el, start: "top 70%", toggleActions: "play none none reverse" },
					})
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
					<p className="pointer-events-none absolute bottom-6 right-6 hidden text-right font-mono text-[10px] uppercase tracking-[0.22em] text-bone-muted md:block">
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
						<Capability item={item} first={k === 0} />
					</Step>
				))}
				{COLLECTION.map((item, k) => (
					<Step key={item.name} index={5 + k} side="right" id={k === 0 ? "collection" : undefined}>
						<Collection item={item} first={k === 0} />
					</Step>
				))}
				<Step index={8} side="left" id="field">
					<Field />
				</Step>
				<Step index={9} side="right" id="how-it-works" wide>
					<Eras active={step === 9} />
				</Step>
				<Step index={10} side="left" id="destinations" wide>
					<Destinations active={step === 10} />
				</Step>
				<Step index={11} side="right" id="creators">
					<Network />
				</Step>
				<Step index={12} side="left" id="team">
					<Team />
				</Step>
			</div>
		</section>
	);
}
