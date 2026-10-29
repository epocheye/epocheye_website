"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { animate } from "animejs";

import googlePlayBadge from "@/public/google-play-badge.png";
import { formatPrice } from "@/lib/preorder/price";
import { PREORDER_SITES } from "@/lib/preorder/sites";
import { PLAY_STORE_URL } from "@/lib/site";
import { THEMES, THEME_KEY, currentTheme } from "./theme";
import { CountUp } from "./reactbits";
import PreorderForm, { boxedButton } from "./PreorderForm";
import { CHAPTERS, chapterWeight } from "./AtelierScene";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

// The sky is client-only and optional: without WebGL the chapters still read.
const AtelierScene = dynamic(() => import("./AtelierScene"), { ssr: false });

// Written by GSAP, read by the scene every frame (outside React state).
const store = () => ({
	value: 0,
	get() {
		return this.value;
	},
});
const progress = store(); // scroll, 0 → 1
const intro = store(); // the sky waking after the gate, 0 → 1

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const CHAPTER_NAMES = ["The past", "The idea", "The most wanted", "The pre-order", "The app"];
const YEAR = "MMXXVI";

function hasWebGL() {
	try {
		const c = document.createElement("canvas");
		return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
	} catch {
		return false;
	}
}

function scrollToChapter(i) {
	const max = document.documentElement.scrollHeight - window.innerHeight;
	window.scrollTo({ top: (i / (CHAPTERS - 1)) * max, behavior: "smooth" });
}

/** Display line: light serif, one word in italic. */
function Display({ before, em, after, className = "" }) {
	return (
		<span className={`pa-serif font-extralight tracking-[-0.015em] ${className}`}>
			{before}
			<em className="italic">{em}</em>
			{after}
		</span>
	);
}

/** A label with a hairline running to a point (the scene's callouts). */
function Callout({ children, side = "left", width = 180, className = "", onClick }) {
	const Tag = onClick ? "button" : "span";
	return (
		<Tag
			type={onClick ? "button" : undefined}
			onClick={onClick}
			className={`pa-caps absolute flex items-center gap-3 whitespace-nowrap text-(--pa-text) ${onClick ? "pointer-events-auto hover:text-(--pa-accent)" : ""} ${className}`}>
			{side === "right" && <span className="h-px bg-(--pa-line-strong)" style={{ width }} />}
			{children}
			{side === "left" && <span className="h-px bg-(--pa-line-strong)" style={{ width }} />}
		</Tag>
	);
}

/* ───────────────────────── Gate ───────────────────────── */

function Gate({ onEnter, onSkip }) {
	const ring = useRef(null);
	const count = useRef(null);
	const [ready, setReady] = useState(false);
	useEffect(() => {
		const c = ring.current;
		if (!c) return;
		const len = c.getTotalLength();
		c.style.strokeDasharray = `${len}`;
		const n = { v: 0 };
		const a = animate(n, {
			v: 100,
			duration: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 10 : 2200,
			ease: "inOutQuad",
			onUpdate: () => {
				c.style.strokeDashoffset = `${len * (1 - n.v / 100)}`;
				if (count.current) count.current.textContent = String(Math.round(n.v));
			},
			onComplete: () => setReady(true),
		});
		return () => a.pause();
	}, []);
	return (
		<div data-gate className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-(--pa-bg) px-6">
			<p className="pa-caps text-[11px] tracking-[0.42em] text-(--pa-text)">Epocheye</p>
			<p className="pa-serif mt-3 text-[15px] font-light italic text-(--pa-text-muted)">the past is waking</p>
			<div className="relative mt-8 grid h-44 w-44 place-items-center">
				<svg viewBox="0 0 176 176" className="absolute inset-0 h-full w-full -rotate-90" fill="none" aria-hidden="true">
					<circle cx="88" cy="88" r="86" stroke="var(--pa-line)" strokeWidth="1" />
					<circle ref={ring} cx="88" cy="88" r="86" stroke="var(--pa-text-soft)" strokeWidth="1" />
					<circle cx="88" cy="88" r="74" stroke="var(--pa-line)" strokeWidth="1" />
				</svg>
				<span ref={count} className="pa-serif text-[28px] font-extralight text-(--pa-text-soft)" aria-hidden="true">
					0
				</span>
			</div>
			<button type="button" onClick={onEnter} className={`${boxedButton} mt-10 transition-opacity ${ready ? "opacity-100" : "opacity-40"}`}>
				Enter
			</button>
			<p className="pa-serif mt-5 text-[15px] font-light italic text-(--pa-text-soft)">a pre-order for the past</p>
			<button type="button" onClick={onSkip} className="pa-caps mt-3 border-b border-(--pa-line-strong) pb-0.5 text-[9px] text-(--pa-text-muted) transition-colors hover:text-(--pa-text)">
				Straight to the pre-order
			</button>
			<p className="pa-caps absolute bottom-7 px-6 text-center text-[9px] text-(--pa-text-muted)">
				Epocheye is made by Epocheye Private Limited ·{" "}
				<Link href="/privacy" className="border-b border-(--pa-line-strong) hover:text-(--pa-text)">
					Privacy
				</Link>{" "}
				·{" "}
				<Link href="/terms" className="border-b border-(--pa-line-strong) hover:text-(--pa-text)">
					Terms
				</Link>
			</p>
		</div>
	);
}

/* ───────────────────────── Panels ───────────────────────── */

function Panel({ title, onClose, children }) {
	const close = useRef(null);
	useEffect(() => {
		close.current?.focus();
		const key = (e) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", key);
		return () => window.removeEventListener("keydown", key);
	}, [onClose]);
	return (
		<div role="dialog" aria-modal="true" aria-label={title} data-panel className="fixed inset-0 z-50 overflow-y-auto bg-(--pa-panel) backdrop-blur-md">
			<div className="sticky top-0 z-10 flex justify-end px-6 py-6 sm:px-10">
				<button ref={close} type="button" onClick={onClose} className="pa-caps flex items-center gap-3 text-(--pa-text) hover:text-(--pa-accent)">
					Close <span className="h-px w-8 bg-(--pa-line-strong)" />
				</button>
			</div>
			<div className="mx-auto max-w-3xl px-6 pb-24 sm:px-10">{children}</div>
		</div>
	);
}

function Board({ ranked, counts, onPick }) {
	return (
		<>
			<p className="pa-caps text-(--pa-text-muted)">The most wanted · live</p>
			<h2 className="mt-5 text-[44px] leading-[1.02] sm:text-[60px]">
				<Display before="Twelve sites, " em="waiting." />
			</h2>
			<p className="pa-serif mt-5 max-w-lg text-[17px] font-light leading-relaxed text-(--pa-text-soft)">
				Ranked by paid pre-orders. The first is built first. Choose one to pre-order it.
			</p>
			<ol className="mt-12 border-t border-(--pa-line)">
				{ranked.map((r, i) => (
					<li key={r.site.slug}>
						<button type="button" onClick={() => onPick(r.site.slug)} className="group flex w-full items-baseline gap-6 border-b border-(--pa-line) py-4 text-left">
							<span className="pa-serif w-12 shrink-0 text-[15px] font-light italic text-(--pa-text-muted)">{ROMAN[i]}.</span>
							<span className="min-w-0 flex-1">
								<span className="pa-serif block text-[24px] font-light text-(--pa-text) transition-colors group-hover:text-(--pa-accent)">{r.site.name}</span>
								<span className="pa-caps mt-1 block text-[9px] text-(--pa-text-muted)">{r.site.place}</span>
							</span>
							<span className="text-right">
								<CountUp value={counts ? r.n : null} className="pa-serif block text-[26px] font-extralight text-(--pa-text)" />
								<span className="pa-caps block text-[8px] text-(--pa-text-muted)">pre-orders</span>
							</span>
						</button>
					</li>
				))}
			</ol>
		</>
	);
}

/* ───────────────────────── Page ───────────────────────── */

export default function PreorderExperience() {
	const [webgl, setWebgl] = useState(false);
	const [mode, setMode] = useState("dark");
	const [entered, setEntered] = useState(false);
	const [chapter, setChapter] = useState(0);
	const [panel, setPanel] = useState(null); // null | "board" | "preorder"
	const [counts, setCounts] = useState(null);
	const [price, setPrice] = useState(null);
	const [selected, setSelected] = useState(PREORDER_SITES[0].slug);
	const root = useRef(null);
	const layers = useRef([]);

	const loadCounts = useCallback(() => {
		fetch("/api/preorder", { cache: "no-store" })
			.then((r) => r.json())
			.then((j) => {
				if (j?.success) setCounts(j.data.counts);
			})
			.catch(() => {});
	}, []);

	useEffect(() => {
		// The theme was set on <html> before paint; WebGL is known only now.
		startTransition(() => {
			setMode(currentTheme());
			setWebgl(hasWebGL());
		});
		loadCounts();
		fetch("/api/preorder/price", { cache: "no-store" })
			.then((r) => r.json())
			.then((j) => {
				if (j?.success) setPrice(j.data.price);
			})
			.catch(() => {});
	}, [loadCounts]);

	// No scrolling behind the gate or an open panel.
	useEffect(() => {
		const lock = !entered || panel;
		document.documentElement.style.overflow = lock ? "hidden" : "";
		return () => {
			document.documentElement.style.overflow = "";
		};
	}, [entered, panel]);

	// Scroll drives the chapters: each fixed layer fades with its chapter, and
	// the page settles on the nearest one.
	useGSAP(
		() => {
			const apply = (p) => {
				progress.value = p;
				layers.current.forEach((el, i) => {
					if (!el) return;
					const w = chapterWeight(p, i);
					el.style.opacity = String(w);
					el.style.visibility = w < 0.01 ? "hidden" : "visible";
					el.style.transform = `translateY(${(1 - w) * (p * (CHAPTERS - 1) > i ? -24 : 24)}px)`;
					el.dataset.active = w > 0.6 ? "true" : "false";
				});
				const c = Math.round(p * (CHAPTERS - 1));
				setChapter((prev) => (prev === c ? prev : c));
			};
			apply(0);
			ScrollTrigger.create({
				trigger: root.current,
				start: "top top",
				end: "bottom bottom",
				onUpdate: (self) => apply(self.progress),
				snap: { snapTo: 1 / (CHAPTERS - 1), duration: { min: 0.5, max: 1.1 }, delay: 0.08, ease: "power3.inOut" },
			});
		},
		{ scope: root }
	);

	const enter = (then) => {
		if (entered) return;
		const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		const gate = root.current?.querySelector("[data-gate]");
		gsap.to(gate, { autoAlpha: 0, duration: reduced ? 0.01 : 1.4, ease: "power2.inOut", onComplete: () => setEntered(true) });
		gsap.fromTo(intro, { value: 0 }, { value: 1, duration: reduced ? 0.01 : 3.6, ease: "power2.inOut", delay: reduced ? 0 : 0.4 });
		gsap.fromTo(
			"[data-chrome]",
			{ autoAlpha: 0 },
			{ autoAlpha: 1, duration: reduced ? 0.01 : 1.6, delay: reduced ? 0 : 1, ease: "power2.out", stagger: 0.08 }
		);
		then?.();
	};

	const toggleTheme = () => {
		const next = mode === "dark" ? "light" : "dark";
		document.documentElement.dataset.paTheme = next;
		setMode(next);
		try {
			localStorage.setItem(THEME_KEY, next);
		} catch {
			// storage blocked: the choice lasts for this visit only
		}
	};

	const openPreorder = (slug) => {
		if (slug) setSelected(slug);
		setPanel("preorder");
	};

	const ranked = PREORDER_SITES.map((s, i) => ({ site: s, i, n: counts?.[s.slug] ?? 0 })).sort((a, b) => b.n - a.n || a.i - b.i);
	const max = Math.max(0, ...ranked.map((r) => r.n));
	const priceLabel = formatPrice(price);
	const leader = ranked[0];
	const layer = (i) => (el) => {
		layers.current[i] = el;
	};
	const chapterClass = "pointer-events-none fixed inset-0 z-20 opacity-0 [&[data-active=true]_.pa-live]:pointer-events-auto";

	return (
		<main ref={root} className="pa-root pa-serif relative bg-(--pa-bg) text-(--pa-text) antialiased" style={{ height: `${CHAPTERS * 100}vh` }}>
			<h1 className="sr-only">Pre-order the next Epocheye site</h1>
			{webgl && <AtelierScene palette={THEMES[mode]} progress={progress} intro={intro} ranked={ranked} max={max} onPick={openPreorder} />}

			{/* Header */}
			<header data-chrome className="pointer-events-none invisible fixed inset-x-0 top-0 z-30 flex items-start justify-between px-6 py-6 opacity-0 sm:px-10 sm:py-8">
				<Link href="/" className="pointer-events-auto">
					<span className="pa-caps block text-[10px] tracking-[0.34em] text-(--pa-text)">Epocheye</span>
					<span className="pa-caps mt-1 block text-[8px] text-(--pa-text-muted)">Pre-orders · {YEAR}</span>
				</Link>
				<div className="pointer-events-auto flex items-center gap-6">
					<button type="button" onClick={() => openPreorder()} className="pa-caps hidden text-[9px] text-(--pa-text) hover:text-(--pa-accent) sm:block">
						Pre-order
					</button>
					<button
						type="button"
						onClick={toggleTheme}
						aria-label={mode === "dark" ? "Switch to day" : "Switch to night"}
						className="pa-caps flex items-center gap-2 text-[9px] text-(--pa-text-soft) hover:text-(--pa-text)">
						<span className="h-1 w-1 rounded-full bg-(--pa-text)" />
						{mode === "dark" ? "Night · On" : "Day · On"}
					</button>
				</div>
			</header>

			{/* Chapter numerals */}
			<nav data-chrome aria-label="Chapters" className="invisible fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 opacity-0 sm:right-10 md:block">
				<ol className="flex flex-col items-end gap-3.5">
					{CHAPTER_NAMES.map((name, i) => (
						<li key={name}>
							<button
								type="button"
								onClick={() => scrollToChapter(i)}
								aria-label={`Chapter ${ROMAN[i]}: ${name}`}
								aria-current={chapter === i ? "step" : undefined}
								className="group flex items-center gap-3">
								<span className={`pa-serif text-[12px] italic transition-colors ${chapter === i ? "text-(--pa-text)" : "text-(--pa-text-muted) group-hover:text-(--pa-text-soft)"}`}>
									{ROMAN[i]}
								</span>
								<span className={`h-px transition-all duration-500 ${chapter === i ? "w-7 bg-(--pa-text)" : "w-3 bg-(--pa-line-strong)"}`} />
							</button>
						</li>
					))}
				</ol>
			</nav>

			{/* Scroll hint */}
			<div data-chrome aria-hidden="true" className={`invisible fixed bottom-8 left-6 z-30 hidden flex-col items-center gap-3 opacity-0 transition-opacity duration-700 sm:left-10 md:flex ${chapter > 0 ? "!opacity-0" : ""}`}>
				<span className="pa-caps text-[8px] text-(--pa-text-muted) [writing-mode:vertical-rl]">Scroll</span>
				<span className="h-10 w-px bg-(--pa-line-strong)" />
			</div>

			{/* I · The past */}
			<section ref={layer(0)} aria-label="The past" className={chapterClass}>
				<div className="absolute left-6 top-28 max-w-[22rem] sm:left-10 sm:top-32 sm:max-w-md">
					<h2 className="text-[38px] leading-[1.05] sm:text-[52px]">
						<Display before="See history " em="where" after=" it happened." />
					</h2>
				</div>
				<div className="absolute right-6 top-28 hidden max-w-[15rem] text-right sm:right-10 sm:top-32 md:block">
					<p className="pa-caps text-(--pa-text-soft)">The app</p>
					<p className="mt-3 text-[15px] font-light leading-relaxed text-(--pa-text-soft)">Monuments shown as the historical record describes them.</p>
				</div>
				<p className="pa-caps absolute inset-x-6 bottom-10 text-center text-[9px] text-(--pa-text-muted)">Konark Sun Temple · a preview · not in the app yet</p>
			</section>

			{/* II · The idea */}
			<section ref={layer(1)} aria-label="The idea" className={chapterClass}>
				{/* Callouts touch the globe's edge: it is ≈26vh in radius, centred ≈8vh above the middle. */}
				<div className="absolute left-1/2 top-[42vh] hidden md:block">
					<Callout side="left" width={150} className="right-[17vh] -top-[22vh]">
						Twelve sites · not yet in the app
					</Callout>
					<Callout side="right" width={130} className="left-[24vh] -top-[9vh]">
						One is built first · the most wanted
					</Callout>
					<Callout side="right" width={110} className="left-[19vh] top-[17vh]" onClick={() => setPanel("board")}>
						Click to explore
					</Callout>
				</div>
				<div className="pa-live absolute inset-x-6 bottom-12 flex flex-col items-center text-center">
					<p className="pa-caps flex items-center gap-3 text-(--pa-text-muted)">
						<span className="h-px w-8 bg-(--pa-line-strong)" />
						II · The idea
					</p>
					<h2 className="mt-4 text-[36px] leading-[1.05] sm:text-[44px]">
						<Display before="You choose what " em="comes" after=" next." />
					</h2>
					<button type="button" onClick={() => setPanel("board")} className="pa-caps mt-6 flex items-center gap-3 text-(--pa-text) hover:text-(--pa-accent)">
						<span className="h-px w-8 bg-(--pa-line-strong)" />
						See the sites
					</button>
				</div>
			</section>

			{/* III · The most wanted */}
			<section ref={layer(2)} aria-label="The most wanted" className={chapterClass}>
				<div className="absolute left-6 top-28 max-w-sm sm:left-10 sm:top-32">
					<p className="pa-caps text-(--pa-text-muted)">III · The most wanted</p>
					<h2 className="mt-4 text-[36px] leading-[1.05] sm:text-[44px]">
						<Display before="Most " em="wanted," after=" first built." />
					</h2>
					<p className="mt-4 text-[15px] font-light leading-relaxed text-(--pa-text-soft)">
						Each light is a site. The brighter it burns, the more people have pre-ordered it.
					</p>
				</div>
				<div className="pa-live absolute inset-x-6 bottom-10 flex flex-col items-center gap-2 text-center">
					<p className="pa-caps text-[9px] text-(--pa-text-muted)">
						{!counts
							? "The board · live"
							: max > 0
								? `Leading · ${leader.site.name} · ${leader.n} pre-order${leader.n === 1 ? "" : "s"}`
								: "No pre-orders yet · be the first"}
					</p>
					<button type="button" onClick={() => setPanel("board")} className="pa-caps flex items-center gap-3 text-(--pa-text) hover:text-(--pa-accent)">
						<span className="h-px w-8 bg-(--pa-line-strong)" />
						Click to explore
					</button>
				</div>
			</section>

			{/* IV · The pre-order */}
			<section ref={layer(3)} aria-label="The pre-order" className={chapterClass}>
				<div className="pa-live absolute inset-x-6 bottom-14 flex flex-col items-center text-center sm:bottom-16">
					<p className="pa-caps flex items-center gap-3 text-(--pa-text-muted)">
						<span className="h-px w-8 bg-(--pa-line-strong)" />
						IV · The pre-order
					</p>
					<h2 className="mt-4 text-[40px] leading-[1.02] sm:text-[56px]">
						<Display before="One site. One " em="payment." />
					</h2>
					<p className="mt-4 max-w-md text-[16px] font-light leading-relaxed text-(--pa-text-soft)">
						{`${priceLabel ? `${priceLabel}, once.` : "Once."} If we don't build it, you get a full refund.`}
					</p>
					<button type="button" onClick={() => openPreorder()} className={`${boxedButton} mt-8`}>
						Pre-order
					</button>
				</div>
			</section>

			{/* V · The app */}
			<section ref={layer(4)} aria-label="The app" className={chapterClass}>
				<div className="pa-live absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
					<h2 className="text-[72px] leading-none sm:text-[120px] lg:text-[148px]">
						<Display before="Epoch" em="eye" />
					</h2>
					<p className="pa-caps mt-6 text-[11px] tracking-[0.42em] text-(--pa-text-soft)">Live today · on Android</p>
					<a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Get Epocheye on Google Play" className="mt-8 transition-opacity hover:opacity-80">
						<Image src={googlePlayBadge} alt="Get it on Google Play" className="h-12 w-auto" />
					</a>
					<p className="pa-script mt-10 text-[22px] text-(--pa-text-soft) sm:text-[26px]">see you in the past</p>
				</div>
				<div className="pa-live absolute inset-x-6 bottom-7 flex items-center justify-between sm:inset-x-10">
					<span className="pa-caps hidden text-[8px] text-(--pa-text-muted) sm:block">Epocheye Private Limited</span>
					<span className="pa-caps flex gap-4 text-[8px] text-(--pa-text-muted)">
						<Link href="/privacy" className="hover:text-(--pa-text)">
							Privacy
						</Link>
						<Link href="/terms" className="hover:text-(--pa-text)">
							Terms
						</Link>
					</span>
					<span className="pa-caps text-[8px] text-(--pa-text-muted)">{YEAR}</span>
				</div>
			</section>

			{panel === "board" && (
				<Panel title="The most wanted" onClose={() => setPanel(null)}>
					<Board ranked={ranked} counts={counts} onPick={openPreorder} />
				</Panel>
			)}
			{panel === "preorder" && (
				<Panel title="Pre-order" onClose={() => setPanel(null)}>
					<p className="pa-caps text-(--pa-text-muted)">The pre-order</p>
					<h2 className="mb-12 mt-5 text-[44px] leading-[1.02] sm:text-[60px]">
						<Display before="Choose what comes " em="next." />
					</h2>
					<PreorderForm
						sites={PREORDER_SITES}
						counts={counts}
						price={price}
						selected={selected}
						onSelect={setSelected}
						onDone={() => loadCounts()}
						onSeeBoard={() => setPanel("board")}
					/>
				</Panel>
			)}

			{!entered && <Gate onEnter={() => enter()} onSkip={() => enter(() => openPreorder())} />}
		</main>
	);
}
