"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { animate } from "animejs";
import { ArrowRight, ChevronRight, Moon, Sun, X } from "lucide-react";

import googlePlayBadge from "@/public/google-play-badge.png";
import { formatPrice } from "@/lib/preorder/price";
import { PREORDER_SITES } from "@/lib/preorder/sites";
import { LIVE_MONUMENTS } from "@/lib/monuments/live";
import { PLAY_STORE_URL } from "@/lib/site";
import { THEMES, THEME_KEY, currentTheme } from "./theme";
import { CountUp, Magnet } from "./reactbits";
import PreorderForm from "./PreorderForm";
import { CHAPTERS, chapterWeight } from "./OrbitScene";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

// The temple is client-only and optional: without WebGL the chapters still read.
const OrbitScene = dynamic(() => import("./OrbitScene"), { ssr: false });

// Written by GSAP, read by the scene every frame (outside React state).
const store = () => ({
	value: 0,
	get() {
		return this.value;
	},
});
const progress = store(); // scroll, 0 → 1
const intro = store(); // the temple assembling after the gate, 0 → 1

const CHAPTER_NAMES = ["Pre-order", "In AR", "Most wanted", "How to pre-order", "Get the app"];

const LIVE_LIST = `${LIVE_MONUMENTS.filter((m) => m.city === "Bengaluru")
	.map((m) => m.name)
	.join(" and ")} in Bengaluru, and the ${LIVE_MONUMENTS.filter((m) => m.city === "Kolkata")
	.map((m) => m.name)
	.join(" and the ")} in Kolkata`;

const eyebrow = "text-[13px] font-semibold uppercase tracking-[0.14em] text-(--pa-accent)";
const display = "text-[40px] font-semibold leading-[1.02] tracking-[-0.035em] text-(--pa-text) sm:text-6xl lg:text-7xl";
const lede = "mt-5 max-w-md text-[17px] leading-relaxed text-(--pa-text-soft) sm:text-[19px]";
const pill =
	"group inline-flex h-12 items-center gap-2 rounded-full bg-(--pa-accent) px-6 text-[16px] font-medium text-(--pa-on-accent) transition hover:bg-(--pa-accent-hover)";

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

function PlayBadge({ className = "h-12" }) {
	return (
		<a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Get Epocheye on Google Play" className="inline-block rounded-[10px] transition hover:opacity-85">
			<Image src={googlePlayBadge} alt="Get it on Google Play" className={`${className} w-auto`} />
		</a>
	);
}

function Logo({ size = 26 }) {
	return (
		<>
			<Image src="/logo-white.png" alt="" width={size} height={size} className="pa-logo-light" style={{ width: size, height: size }} />
			<Image src="/logo-black.png" alt="" width={size} height={size} className="pa-logo-dark" style={{ width: size, height: size }} />
		</>
	);
}

/* ───────────────────────── Gate ───────────────────────── */

function Gate({ onEnter, onSkip }) {
	const arc = useRef(null);
	const count = useRef(null);
	const [ready, setReady] = useState(false);
	useEffect(() => {
		const c = arc.current;
		if (!c) return;
		const len = c.getTotalLength();
		c.style.strokeDasharray = `${len}`;
		const n = { v: 0 };
		const a = animate(n, {
			v: 100,
			duration: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 10 : 1800,
			ease: "inOutQuad",
			onUpdate: () => {
				c.style.strokeDashoffset = `${len * (1 - n.v / 100)}`;
				if (count.current) count.current.textContent = `${Math.round(n.v)}%`;
			},
			onComplete: () => setReady(true),
		});
		return () => a.pause();
	}, []);
	return (
		<div data-gate className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-(--pa-bg) px-6 text-center">
			<div className="flex items-center gap-3 text-[20px] font-semibold tracking-tight text-(--pa-text)">
				<Logo size={30} />
				Epocheye
			</div>
			<div className="relative mt-12 grid h-36 w-36 place-items-center">
				<svg viewBox="0 0 144 144" className="absolute inset-0 h-full w-full -rotate-90" fill="none" aria-hidden="true">
					<circle cx="72" cy="72" r="68" stroke="var(--pa-line)" strokeWidth="3" />
					<circle ref={arc} cx="72" cy="72" r="68" stroke="var(--pa-accent)" strokeWidth="3" strokeLinecap="round" />
				</svg>
				<span ref={count} className="text-[22px] font-semibold tabular-nums tracking-tight text-(--pa-text)" aria-hidden="true">
					0%
				</span>
			</div>
			<p className="mt-10 text-[17px] text-(--pa-text-soft)">The past, rebuilt. Pick what comes next.</p>
			<div className={`mt-8 transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-40"}`}>
				<Magnet strength={0.25}>
					<button type="button" onClick={onEnter} className={pill}>
						Enter
						<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
					</button>
				</Magnet>
			</div>
			<button type="button" onClick={onSkip} className="mt-5 text-[14px] text-(--pa-text-muted) underline-offset-4 transition hover:text-(--pa-text) hover:underline">
				Skip to the pre-order
			</button>
			<p className="absolute bottom-6 text-[12px] text-(--pa-text-muted)">
				© Epocheye Private Limited ·{" "}
				<Link href="/privacy" className="hover:text-(--pa-text)">
					Privacy
				</Link>{" "}
				·{" "}
				<Link href="/terms" className="hover:text-(--pa-text)">
					Terms
				</Link>
			</p>
		</div>
	);
}

/* ───────────────────────── Sheets ───────────────────────── */

function Sheet({ title, onClose, children }) {
	const close = useRef(null);
	useEffect(() => {
		close.current?.focus();
		const key = (e) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", key);
		return () => window.removeEventListener("keydown", key);
	}, [onClose]);
	return (
		<div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-md" onClick={onClose}>
			<div className="flex min-h-full items-start justify-center px-4 py-10 sm:py-16">
				<div
					className="relative w-full max-w-3xl rounded-[32px] border border-(--pa-line) bg-(--pa-surface) p-6 shadow-(--pa-shadow) sm:p-10"
					onClick={(e) => e.stopPropagation()}>
					<button
						ref={close}
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-(--pa-surface-2) text-(--pa-text-soft) transition hover:text-(--pa-text)">
						<X className="h-5 w-5" aria-hidden="true" />
					</button>
					{children}
				</div>
			</div>
		</div>
	);
}

/** Ranked sites with a bar each; the leader's bar is the only blue one. */
function Ranking({ ranked, max, counts, onPick, limit }) {
	const rows = limit ? ranked.slice(0, limit) : ranked;
	return (
		<ol className="divide-y divide-(--pa-line)">
			{rows.map((r, i) => {
				const leader = i === 0 && r.n > 0;
				const share = max > 0 ? r.n / max : 0;
				return (
					<li key={r.site.slug}>
						<button type="button" onClick={() => onPick(r.site.slug)} className="group flex w-full items-center gap-4 py-3 text-left">
							<span className={`w-6 text-[13px] font-semibold tabular-nums ${leader ? "text-(--pa-accent)" : "text-(--pa-text-muted)"}`}>
								{String(i + 1).padStart(2, "0")}
							</span>
							<span className="min-w-0 flex-1">
								<span className="flex items-baseline justify-between gap-3">
									<span className="truncate text-[16px] font-medium text-(--pa-text) transition group-hover:text-(--pa-accent)">{r.site.name}</span>
									<CountUp value={counts ? r.n : null} className="text-[15px] font-semibold text-(--pa-text)" />
								</span>
								<span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-(--pa-surface-2)">
									<span
										className={`block h-full rounded-full transition-[width] duration-1000 ease-out ${leader ? "bg-(--pa-accent)" : "bg-(--pa-text-muted)"}`}
										style={{ width: `${Math.max(share * 100, counts ? 2 : 0)}%` }}
									/>
								</span>
							</span>
							<ChevronRight className="h-4 w-4 shrink-0 text-(--pa-text-muted) transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
						</button>
					</li>
				);
			})}
		</ol>
	);
}

/* ───────────────────────── Page ───────────────────────── */

export default function PreorderExperience() {
	const [webgl, setWebgl] = useState(false);
	const [mode, setMode] = useState("dark");
	const [entered, setEntered] = useState(false);
	const [chapter, setChapter] = useState(0);
	const [sheet, setSheet] = useState(null); // null | "board" | "preorder"
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

	// No scrolling behind the gate or an open sheet.
	useEffect(() => {
		document.documentElement.style.overflow = !entered || sheet ? "hidden" : "";
		return () => {
			document.documentElement.style.overflow = "";
		};
	}, [entered, sheet]);

	// Scroll flies the camera round the temple; each chapter's words fade in
	// with their shot, and the page settles on the nearest chapter.
	useGSAP(
		() => {
			const apply = (p) => {
				progress.value = p;
				layers.current.forEach((el, i) => {
					if (!el) return;
					const w = chapterWeight(p, i);
					el.style.opacity = String(w);
					el.style.visibility = w < 0.01 ? "hidden" : "visible";
					el.style.transform = `translateY(${(1 - w) * (p * (CHAPTERS - 1) > i ? -28 : 28)}px)`;
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
		gsap.to(gate, { autoAlpha: 0, duration: reduced ? 0.01 : 0.9, ease: "power2.inOut", onComplete: () => setEntered(true) });
		gsap.fromTo(intro, { value: 0 }, { value: 1, duration: reduced ? 0.01 : 3.2, ease: "power2.inOut", delay: reduced ? 0 : 0.2 });
		gsap.fromTo("[data-chrome]", { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? 0.01 : 1.2, delay: reduced ? 0 : 0.8, ease: "power2.out" });
		if (!reduced) {
			gsap.fromTo(
				"[data-hero-line]",
				{ autoAlpha: 0, y: 36, filter: "blur(10px)" },
				{ autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.1, ease: "power3.out", stagger: 0.12, delay: 0.9 }
			);
		}
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
		setSheet("preorder");
	};

	const ranked = PREORDER_SITES.map((s, i) => ({ site: s, i, n: counts?.[s.slug] ?? 0 })).sort((a, b) => b.n - a.n || a.i - b.i);
	const max = Math.max(0, ...ranked.map((r) => r.n));
	const priceLabel = formatPrice(price);
	const layer = (i) => (el) => {
		layers.current[i] = el;
	};
	// Fixed full-screen layers; only an active chapter's controls take clicks.
	const chapterClass = "pointer-events-none fixed inset-0 z-20 opacity-0 [&[data-active=true]_.pa-live]:pointer-events-auto";
	// Phones: the temple sits high, the words below it on a fade from the page colour.
	const mobileText =
		"absolute inset-x-0 bottom-0 px-6 pb-10 pt-24 bg-gradient-to-t from-(--pa-bg) via-(--pa-bg)/85 to-transparent lg:inset-y-0 lg:flex lg:flex-col lg:justify-center lg:bg-none lg:p-0";

	return (
		<main
			ref={root}
			className="pa-root relative bg-(--pa-bg) font-(family-name:--font-geist-sans) text-(--pa-text) antialiased"
			style={{ height: `${CHAPTERS * 100}vh` }}>
			{webgl && <OrbitScene palette={THEMES[mode]} progress={progress} intro={intro} />}

			{/* Header */}
			<header data-chrome className="invisible fixed inset-x-0 top-0 z-30 border-b border-(--pa-line) bg-(--pa-bg)/60 opacity-0 backdrop-blur-xl backdrop-saturate-150">
				<div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-8">
					<Link href="/" className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-(--pa-text)">
						<Logo />
						Epocheye
					</Link>
					<nav aria-label="Chapters" className="hidden items-center gap-7 text-[14px] md:flex">
						{CHAPTER_NAMES.slice(1).map((name, j) => (
							<button
								key={name}
								type="button"
								onClick={() => scrollToChapter(j + 1)}
								className={`transition ${chapter === j + 1 ? "text-(--pa-text)" : "text-(--pa-text-muted) hover:text-(--pa-text)"}`}>
								{name}
							</button>
						))}
					</nav>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={toggleTheme}
							aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
							className="grid h-9 w-9 place-items-center rounded-full text-(--pa-text-soft) transition hover:bg-(--pa-surface-2) hover:text-(--pa-text)">
							{mode === "dark" ? <Sun className="h-[18px] w-[18px]" aria-hidden="true" /> : <Moon className="h-[18px] w-[18px]" aria-hidden="true" />}
						</button>
						<button
							type="button"
							onClick={() => openPreorder()}
							className="h-9 rounded-full bg-(--pa-accent) px-4 text-[14px] font-medium text-(--pa-on-accent) transition hover:bg-(--pa-accent-hover)">
							Pre-order
						</button>
					</div>
				</div>
			</header>

			{/* Chapter dots */}
			<nav data-chrome aria-label="Chapter progress" className="invisible fixed right-5 top-1/2 z-30 hidden -translate-y-1/2 opacity-0 lg:block xl:right-8">
				<ol className="flex flex-col items-end gap-3">
					{CHAPTER_NAMES.map((name, i) => (
						<li key={name}>
							<button type="button" onClick={() => scrollToChapter(i)} aria-label={name} aria-current={chapter === i ? "step" : undefined} className="group flex items-center gap-3">
								<span className="text-[12px] text-(--pa-text-muted) opacity-0 transition group-hover:opacity-100">{name}</span>
								<span className={`block rounded-full transition-all duration-500 ${chapter === i ? "h-6 w-1.5 bg-(--pa-accent)" : "h-1.5 w-1.5 bg-(--pa-text-muted)"}`} />
							</button>
						</li>
					))}
				</ol>
			</nav>

			{/* 01 · Hero: words left, temple right */}
			<section ref={layer(0)} aria-label="Pre-order the past" className={chapterClass}>
				<div className="mx-auto flex h-full max-w-7xl items-center lg:px-8">
					<div className={`${mobileText} lg:static lg:max-w-xl`}>
						<p data-hero-line className={eyebrow}>
							Pre-orders are open
						</p>
						<h1 data-hero-line className={`mt-4 ${display}`}>
							See history where it happened.
						</h1>
						<p data-hero-line className={lede}>
							Epocheye is an augmented-reality app that shows heritage monuments as the historical record describes them. Pick the one we bring
							to life next.
						</p>
						<div data-hero-line className="pa-live mt-8 flex flex-wrap items-center gap-4">
							<button type="button" onClick={() => openPreorder()} className={pill}>
								{`Pre-order${priceLabel ? ` · ${priceLabel}` : ""}`}
								<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
							</button>
							<PlayBadge />
						</div>
					</div>
				</div>
				<p className="absolute bottom-6 right-8 hidden text-[12px] text-(--pa-text-muted) lg:block">Konark Sun Temple · a preview, not in the app yet</p>
				<p className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-[12px] text-(--pa-text-muted) lg:block">Scroll to walk around it</p>
			</section>

			{/* 02 · AR: temple left, words right */}
			<section ref={layer(1)} aria-label="In augmented reality" className={chapterClass}>
				<div className="mx-auto flex h-full max-w-7xl items-center justify-end lg:px-8">
					<div className={`${mobileText} lg:static lg:max-w-lg`}>
						<p className={eyebrow}>Augmented reality</p>
						<h2 className={`mt-4 ${display}`}>Point your phone. Watch it rise.</h2>
						<p className={lede}>The monument rebuilds in front of you as the record describes it, and the app says plainly where the record runs out.</p>
						<p className="mt-4 text-[13px] text-(--pa-text-muted)">Shown: Konark Sun Temple, one of the sites you can pre-order. Not in the app yet.</p>
					</div>
				</div>
			</section>

			{/* 03 · Most wanted: temple left, board right */}
			<section ref={layer(2)} aria-label="The most wanted" className={chapterClass}>
				<div className="mx-auto flex h-full max-w-7xl items-center justify-end lg:px-8">
					<div className={`${mobileText} lg:static lg:w-[30rem]`}>
						<p className={eyebrow}>Live from every pre-order</p>
						<h2 className={`mt-4 ${display}`}>The most wanted.</h2>
						<div className="pa-live mt-6 rounded-[28px] border border-(--pa-line) bg-(--pa-glass) p-5 shadow-(--pa-shadow) backdrop-blur-xl sm:p-6">
							{counts && max === 0 && <p className="mb-2 text-[14px] text-(--pa-text-soft)">No pre-orders yet. Be the first to choose.</p>}
							<Ranking ranked={ranked} max={max} counts={counts} onPick={openPreorder} limit={5} />
							<button type="button" onClick={() => setSheet("board")} className="mt-3 flex items-center gap-1 text-[15px] font-medium text-(--pa-accent)">
								See all twelve
								<ChevronRight className="h-4 w-4" aria-hidden="true" />
							</button>
						</div>
					</div>
				</div>
			</section>

			{/* 04 · Pre-order: temple high, words below */}
			<section ref={layer(3)} aria-label="How to pre-order" className={chapterClass}>
				<div className="absolute inset-x-0 bottom-0 flex flex-col items-center bg-gradient-to-t from-(--pa-bg) via-(--pa-bg)/85 to-transparent px-6 pb-14 pt-28 text-center">
					<p className={eyebrow}>Pre-order</p>
					<h2 className={`mt-4 ${display}`}>One site. One payment.</h2>
					<p className={`${lede} mx-auto`}>{`${priceLabel ? `${priceLabel}, once.` : "Once."} If we don't build it, you get a full refund.`}</p>
					<div className="pa-live mt-8">
						<Magnet strength={0.25}>
							<button type="button" onClick={() => openPreorder()} className={pill}>
								Choose your site
								<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
							</button>
						</Magnet>
					</div>
				</div>
			</section>

			{/* 05 · App: words left, temple right */}
			<section ref={layer(4)} aria-label="Get the app" className={chapterClass}>
				<div className="mx-auto flex h-full max-w-7xl items-center lg:px-8">
					<div className={`${mobileText} pb-20 lg:static lg:max-w-lg lg:pb-0`}>
						<p className={eyebrow}>Live today</p>
						<h2 className={`mt-4 ${display}`}>Already on Android.</h2>
						<p className={lede}>Epocheye is live at {LIVE_LIST}. Get it on Google Play and try it at any of them.</p>
						<div className="pa-live mt-8">
							<PlayBadge className="h-14" />
						</div>
					</div>
				</div>
				<div className="pa-live absolute inset-x-0 bottom-0 flex items-center justify-between px-6 py-5 text-[12px] text-(--pa-text-muted) sm:px-8">
					<span>© Epocheye Private Limited</span>
					<span className="flex gap-5">
						<Link href="/" className="hover:text-(--pa-text)">
							Home
						</Link>
						<Link href="/privacy" className="hover:text-(--pa-text)">
							Privacy
						</Link>
						<Link href="/terms" className="hover:text-(--pa-text)">
							Terms
						</Link>
					</span>
				</div>
			</section>

			{sheet === "board" && (
				<Sheet title="The most wanted" onClose={() => setSheet(null)}>
					<p className={eyebrow}>Live from every pre-order</p>
					<h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-(--pa-text) sm:text-5xl">The most wanted.</h2>
					<p className="mt-3 text-[16px] text-(--pa-text-soft)">Ranked by paid pre-orders. The first is built first. Choose a site to pre-order it.</p>
					<div className="mt-8">
						<Ranking ranked={ranked} max={max} counts={counts} onPick={openPreorder} />
					</div>
				</Sheet>
			)}
			{sheet === "preorder" && (
				<Sheet title="Pre-order" onClose={() => setSheet(null)}>
					<p className={eyebrow}>Pre-order</p>
					<h2 className="mb-8 mt-3 text-4xl font-semibold tracking-[-0.03em] text-(--pa-text) sm:text-5xl">Make yours count.</h2>
					<PreorderForm
						sites={PREORDER_SITES}
						counts={counts}
						price={price}
						selected={selected}
						onSelect={setSelected}
						onDone={() => loadCounts()}
						onSeeBoard={() => setSheet("board")}
					/>
				</Sheet>
			)}

			{!entered && <Gate onEnter={() => enter()} onSkip={() => enter(() => openPreorder())} />}
		</main>
	);
}
