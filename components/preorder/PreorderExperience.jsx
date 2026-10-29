"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight, ChevronRight, Moon, Sun } from "lucide-react";

import googlePlayBadge from "@/public/google-play-badge.png";
import { formatPrice } from "@/lib/preorder/price";
import { PREORDER_SITES } from "@/lib/preorder/sites";
import { LIVE_MONUMENTS } from "@/lib/monuments/live";
import { PLAY_STORE_URL } from "@/lib/site";
import { THEMES, THEME_KEY, currentTheme } from "./theme";
import { BlurText, CountUp, Magnet } from "./reactbits";
import PreorderForm from "./PreorderForm";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

// 3D is client-only and optional: the page reads and works without it.
const Canvas3D = dynamic(() => import("./Stage3D").then((m) => m.Canvas3D), { ssr: false });
const PhoneStage = dynamic(() => import("./Stage3D").then((m) => m.PhoneStage), { ssr: false });
const BarsStage = dynamic(() => import("./Stage3D").then((m) => m.BarsStage), { ssr: false });
const AppStage = dynamic(() => import("./Stage3D").then((m) => m.AppStage), { ssr: false });

// Written by GSAP, read by the 3D stages every frame (outside React state).
const story = { value: 0 }; // the hero's scroll, 0 → 1
const barsIn = { value: 0 }; // the bar chart rising into view, 0 → 1

function hasWebGL() {
	try {
		const c = document.createElement("canvas");
		return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
	} catch {
		return false;
	}
}

const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

const LIVE_LIST = `${LIVE_MONUMENTS.filter((m) => m.city === "Bengaluru")
	.map((m) => m.name)
	.join(" and ")} in Bengaluru, and the ${LIVE_MONUMENTS.filter((m) => m.city === "Kolkata")
	.map((m) => m.name)
	.join(" and the ")} in Kolkata`;

function PlayBadge({ className = "h-12" }) {
	return (
		<a
			href={PLAY_STORE_URL}
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Get Epocheye on Google Play"
			className="inline-block rounded-[10px] transition hover:opacity-85">
			<Image src={googlePlayBadge} alt="Get it on Google Play" className={`${className} w-auto`} />
		</a>
	);
}

/* ───────────────────────── Header ───────────────────────── */

function Header({ mode, onToggleTheme }) {
	const light = mode === "light";
	return (
		<header className="fixed inset-x-0 top-0 z-40 border-b border-(--pa-line) bg-(--pa-bg)/75 backdrop-blur-xl backdrop-saturate-150">
			<div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-8">
				<Link href="/" className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-(--pa-text)">
					<Image src="/logo-black.png" alt="" width={26} height={26} className="pa-logo-light h-[26px] w-[26px]" />
					<Image src="/logo-white.png" alt="" width={26} height={26} className="pa-logo-dark h-[26px] w-[26px]" />
					Epocheye
				</Link>
				<nav aria-label="Sections" className="hidden items-center gap-8 text-[14px] text-(--pa-text-soft) md:flex">
					<button type="button" onClick={() => scrollToId("how")} className="transition hover:text-(--pa-text)">
						How it works
					</button>
					<button type="button" onClick={() => scrollToId("wanted")} className="transition hover:text-(--pa-text)">
						Most wanted
					</button>
					<button type="button" onClick={() => scrollToId("app")} className="transition hover:text-(--pa-text)">
						Get the app
					</button>
				</nav>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onToggleTheme}
						aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
						className="grid h-9 w-9 place-items-center rounded-full text-(--pa-text-soft) transition hover:bg-(--pa-surface-2) hover:text-(--pa-text)">
						{light ? <Moon className="h-[18px] w-[18px]" aria-hidden="true" /> : <Sun className="h-[18px] w-[18px]" aria-hidden="true" />}
					</button>
					<button
						type="button"
						onClick={() => scrollToId("preorder")}
						className="h-9 rounded-full bg-(--pa-accent) px-4 text-[14px] font-medium text-(--pa-on-accent) transition hover:bg-(--pa-accent-hover)">
						Pre-order
					</button>
				</div>
			</div>
		</header>
	);
}

/* ───────────────────────── Story (hero) ───────────────────────── */

const eyebrow = "text-[13px] font-semibold uppercase tracking-[0.14em] text-(--pa-accent)";
const display = "text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-(--pa-text) sm:text-6xl lg:text-7xl";
const lede = "mt-5 max-w-lg text-[17px] leading-relaxed text-(--pa-text-soft) sm:text-[19px]";

function Story({ webgl, portrait, priceLabel, sectionRef }) {
	return (
		<section ref={sectionRef} aria-label="Epocheye pre-orders" className="relative h-[280vh]">
			{/* Pinned by ScrollTrigger: the site's overflow-x: hidden on html and body disables CSS sticky. */}
			<div data-pin className="flex h-[100svh] flex-col overflow-hidden pt-14 lg:flex-row lg:items-center">
				{/* The phone */}
				<div className="relative order-1 h-[46svh] w-full shrink-0 lg:order-2 lg:h-full lg:w-1/2">
					{webgl ? (
						<PhoneStage story={story} portrait={portrait} />
					) : (
						<div className="absolute left-1/2 top-1/2 h-[70%] max-h-[520px] w-auto -translate-x-1/2 -translate-y-1/2 rounded-[2.6rem] border-[6px] border-(--pa-text) bg-[#0b1220]" style={{ aspectRatio: "0.49" }} />
					)}
				</div>
				{/* Three captions, one after another as you scroll */}
				<div className="relative order-2 mx-auto w-full max-w-7xl flex-1 px-6 sm:px-8 lg:order-1 lg:w-1/2 lg:flex-none lg:pl-16 xl:pl-24">
					<div data-caption className="absolute inset-x-6 top-0 sm:inset-x-8 lg:static">
						<p className={eyebrow}>Pre-orders are open</p>
						<BlurText as="h1" immediate delay={0.2} text="See history where it happened." className={`mt-4 ${display}`} />
						<p className={lede}>
							Epocheye is an augmented-reality app that shows heritage monuments as the historical record describes them. Pick the one we
							bring to life next.
						</p>
						<div className="mt-8 flex flex-wrap items-center gap-4">
							<Magnet strength={0.25}>
								<button
									type="button"
									onClick={() => scrollToId("preorder")}
									className="group flex h-12 items-center gap-2 rounded-full bg-(--pa-accent) px-6 text-[16px] font-medium text-(--pa-on-accent) transition hover:bg-(--pa-accent-hover)">
									Pre-order{priceLabel ? ` · ${priceLabel}` : ""}
									<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
								</button>
							</Magnet>
							<PlayBadge />
						</div>
					</div>
					<div data-caption className="invisible absolute inset-x-6 top-0 opacity-0 sm:inset-x-8 lg:inset-y-0 lg:left-16 lg:right-0 lg:flex lg:flex-col lg:justify-center xl:left-24">
						<p className={eyebrow}>Augmented reality</p>
						<h2 className={`mt-4 ${display}`}>Point your phone. Watch it rise.</h2>
						<p className={lede}>
							The monument rebuilds in front of you as the record describes it, and the app says plainly where the record runs out.
						</p>
						<p className="mt-4 text-[13px] text-(--pa-text-muted)">Shown: Konark Sun Temple, one of the sites you can pre-order. Not in the app yet.</p>
					</div>
					<div data-caption className="invisible absolute inset-x-6 top-0 opacity-0 sm:inset-x-8 lg:inset-y-0 lg:left-16 lg:right-0 lg:flex lg:flex-col lg:justify-center xl:left-24">
						<p className={eyebrow}>You decide</p>
						<h2 className={`mt-4 ${display}`}>You choose what comes next.</h2>
						<p className={lede}>
							Every pre-order counts toward a site. The most wanted is built first, and if we don&apos;t build yours, you get a full refund.
						</p>
						<button
							type="button"
							onClick={() => scrollToId("wanted")}
							className="group mt-8 flex items-center gap-1 text-[17px] font-medium text-(--pa-accent)">
							See the most wanted
							<ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}

/* ───────────────────────── How it works ───────────────────────── */

function How({ priceLabel }) {
	const steps = [
		["Pick a site.", "Choose from twelve heritage sites that aren't in Epocheye yet, or name your own."],
		["Pre-order it.", `Pay ${priceLabel || "once"}. If we don't build it, you get a full refund.`],
		["See it first.", "The most-wanted site is built first, and you hear the day it goes live."],
	];
	return (
		<section id="how" className="scroll-mt-14 px-6 py-28 sm:px-8 sm:py-36">
			<div className="mx-auto max-w-7xl">
				<p className={eyebrow}>How it works</p>
				<BlurText as="h2" text="Three steps. That's it." className={`mt-4 ${display}`} />
				<ol className="mt-14 grid gap-4 md:grid-cols-3">
					{steps.map(([title, body], i) => (
						<li
							key={title}
							data-reveal
							className="rounded-[28px] border border-(--pa-line) bg-(--pa-surface) p-8 shadow-(--pa-shadow) transition-transform duration-500 hover:-translate-y-1">
							<span className="text-[56px] font-semibold leading-none tracking-tight text-(--pa-accent) tabular-nums">0{i + 1}</span>
							<h3 className="mt-10 text-2xl font-semibold tracking-tight text-(--pa-text)">{title}</h3>
							<p className="mt-3 text-[16px] leading-relaxed text-(--pa-text-soft)">{body}</p>
						</li>
					))}
				</ol>
			</div>
		</section>
	);
}

/* ───────────────────────── Most wanted ───────────────────────── */

function Wanted({ webgl, ranked, max, counts, hovered, onHover, onPick, sectionRef, portrait }) {
	return (
		<section id="wanted" ref={sectionRef} className="scroll-mt-14 bg-(--pa-surface) px-6 py-28 sm:px-8 sm:py-36">
			<div className="mx-auto max-w-7xl">
				<p className={eyebrow}>Live from every pre-order</p>
				<BlurText as="h2" text="The most wanted." className={`mt-4 ${display}`} />
				<p className={lede}>The tallest bar gets built first. Tap a site to pre-order it.</p>
				<div className="mt-14 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
					<div data-reveal className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-(--pa-surface-2)">
						{webgl && (
							<BarsStage ranked={ranked} max={max} hovered={hovered} onHover={onHover} onPick={onPick} grow={barsIn} portrait={portrait} />
						)}
						<p className="absolute bottom-5 left-6 text-[13px] text-(--pa-text-muted)">Ranked by paid pre-orders</p>
					</div>
					<ol data-reveal className="divide-y divide-(--pa-line) rounded-[28px] border border-(--pa-line) bg-(--pa-bg)">
						{ranked.map((r, i) => {
							const leader = i === 0 && r.n > 0;
							return (
								<li key={r.site.slug}>
									<button
										type="button"
										onClick={() => onPick(r.site.slug)}
										onPointerEnter={() => onHover(r.site.slug)}
										onPointerLeave={() => onHover(null)}
										onFocus={() => onHover(r.site.slug)}
										onBlur={() => onHover(null)}
										className={`group flex w-full items-center gap-4 px-5 py-3.5 text-left transition first:rounded-t-[28px] last:rounded-b-[28px] ${
											hovered === r.site.slug ? "bg-(--pa-surface-2)" : ""
										}`}>
										<span className={`w-6 text-[13px] font-semibold tabular-nums ${leader ? "text-(--pa-accent)" : "text-(--pa-text-muted)"}`}>
											{String(i + 1).padStart(2, "0")}
										</span>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-[16px] font-medium text-(--pa-text)">{r.site.name}</span>
											<span className="block text-[13px] text-(--pa-text-muted)">{r.site.place}</span>
										</span>
										<span className="text-right">
											<CountUp value={counts ? r.n : null} className="block text-[17px] font-semibold text-(--pa-text)" />
											<span className="block text-[11px] text-(--pa-text-muted)">pre-orders</span>
										</span>
										<ChevronRight className="h-4 w-4 text-(--pa-text-muted) transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
									</button>
								</li>
							);
						})}
					</ol>
				</div>
			</div>
		</section>
	);
}

/* ───────────────────────── Get the app ───────────────────────── */

function App({ webgl }) {
	return (
		<section id="app" className="scroll-mt-14 px-6 py-28 sm:px-8 sm:py-36">
			<div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
				<div>
					<p className={eyebrow}>Live today</p>
					<BlurText as="h2" text="Already on Android." className={`mt-4 ${display}`} />
					<p className={lede}>Epocheye is live at {LIVE_LIST}. Get it on Google Play and try it at any of them.</p>
					<div className="mt-8">
						<PlayBadge className="h-14" />
					</div>
				</div>
				<div data-reveal className="relative h-[460px] sm:h-[540px]">
					{webgl ? (
						<AppStage />
					) : (
						<div className="absolute left-1/2 top-1/2 h-[80%] -translate-x-1/2 -translate-y-1/2 rounded-[2.6rem] border-[6px] border-(--pa-text) bg-[#0b1220]" style={{ aspectRatio: "0.49" }} />
					)}
				</div>
			</div>
		</section>
	);
}

function Footer() {
	return (
		<footer className="border-t border-(--pa-line) px-6 py-10 text-[13px] text-(--pa-text-muted) sm:px-8">
			<div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<p>© {new Date().getFullYear()} Epocheye Private Limited</p>
				<nav aria-label="Footer" className="flex gap-6">
					<Link href="/" className="hover:text-(--pa-text)">
						Home
					</Link>
					<Link href="/monuments" className="hover:text-(--pa-text)">
						Monuments
					</Link>
					<Link href="/privacy" className="hover:text-(--pa-text)">
						Privacy
					</Link>
					<Link href="/terms" className="hover:text-(--pa-text)">
						Terms
					</Link>
				</nav>
			</div>
		</footer>
	);
}

/* ───────────────────────── Page ───────────────────────── */

export default function PreorderExperience() {
	const [webgl, setWebgl] = useState(false);
	const [mode, setMode] = useState("light");
	const [portrait, setPortrait] = useState(false);
	const [counts, setCounts] = useState(null);
	const [price, setPrice] = useState(null);
	const [selected, setSelected] = useState(PREORDER_SITES[0].slug);
	const [hovered, setHovered] = useState(null);
	const root = useRef(null);
	const storyRef = useRef(null);
	const wantedRef = useRef(null);

	const loadCounts = useCallback(() => {
		fetch("/api/preorder", { cache: "no-store" })
			.then((r) => r.json())
			.then((j) => {
				if (j?.success) setCounts(j.data.counts);
			})
			.catch(() => {});
	}, []);

	useEffect(() => {
		// The theme was set on <html> before paint; WebGL and layout are known only now.
		startTransition(() => {
			setMode(currentTheme());
			setWebgl(hasWebGL());
			setPortrait(window.matchMedia("(max-width: 1023px)").matches);
		});
		loadCounts();
		fetch("/api/preorder/price", { cache: "no-store" })
			.then((r) => r.json())
			.then((j) => {
				if (j?.success) setPrice(j.data.price);
			})
			.catch(() => {});
	}, [loadCounts]);

	// Scroll choreography: the story's captions and phone, section reveals, the bars.
	useGSAP(
		() => {
			const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
			const caps = gsap.utils.toArray("[data-caption]", root.current);
			ScrollTrigger.create({
				trigger: storyRef.current,
				start: "top top",
				end: "bottom bottom",
				pin: storyRef.current.querySelector("[data-pin]"),
				pinSpacing: false,
				onUpdate: (self) => {
					story.value = self.progress;
				},
			});
			const tl = gsap.timeline({ scrollTrigger: { trigger: storyRef.current, start: "top top", end: "bottom bottom", scrub: 0.6 } });
			const out = { autoAlpha: 0, y: reduced ? 0 : -36, duration: 0.12, ease: "power2.in" };
			const inn = { autoAlpha: 1, y: 0, duration: 0.12, ease: "power2.out" };
			tl.to(caps[0], out, 0.24)
				.fromTo(caps[1], { autoAlpha: 0, y: reduced ? 0 : 36 }, inn, 0.34)
				.to(caps[1], out, 0.6)
				.fromTo(caps[2], { autoAlpha: 0, y: reduced ? 0 : 36 }, inn, 0.7)
				.to({}, { duration: 0.18 }, 0.82);
			if (!reduced) {
				ScrollTrigger.batch(gsap.utils.toArray("[data-reveal]", root.current), {
					start: "top 88%",
					once: true,
					onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08 }),
				});
			}
			barsIn.value = 0;
			ScrollTrigger.create({
				trigger: wantedRef.current,
				start: "top 70%",
				once: true,
				onEnter: () => gsap.to(barsIn, { value: 1, duration: reduced ? 0.01 : 1.8, ease: "power2.out" }),
			});
		},
		{ scope: root }
	);

	const toggleTheme = () => {
		const next = mode === "light" ? "dark" : "light";
		document.documentElement.dataset.paTheme = next;
		setMode(next);
		try {
			localStorage.setItem(THEME_KEY, next);
		} catch {
			// storage blocked: the choice lasts for this visit only
		}
	};

	const pick = (slug) => {
		setSelected(slug);
		scrollToId("preorder");
	};

	const ranked = PREORDER_SITES.map((s, i) => ({ site: s, i, n: counts?.[s.slug] ?? 0 })).sort((a, b) => b.n - a.n || a.i - b.i);
	const max = Math.max(0, ...ranked.map((r) => r.n));
	const priceLabel = formatPrice(price);

	return (
		<main ref={root} className="pa-root relative min-h-screen bg-(--pa-bg) font-(family-name:--font-geist-sans) text-(--pa-text) antialiased">
			<Header mode={mode} onToggleTheme={toggleTheme} />
			<Story webgl={webgl} portrait={portrait} priceLabel={priceLabel} sectionRef={storyRef} />
			<How priceLabel={priceLabel} />
			<Wanted
				webgl={webgl}
				ranked={ranked}
				max={max}
				counts={counts}
				hovered={hovered}
				onHover={setHovered}
				onPick={pick}
				sectionRef={wantedRef}
				portrait={portrait}
			/>
			<section id="preorder" className="scroll-mt-14 px-6 py-28 sm:px-8 sm:py-36">
				<div className="mx-auto max-w-3xl">
					<div className="text-center">
						<p className={eyebrow}>Pre-order</p>
						<BlurText as="h2" text="Make yours count." className={`mt-4 ${display}`} />
						<p className={`${lede} mx-auto`}>One payment, one site. Full refund if we don&apos;t build it.</p>
					</div>
					<div data-reveal className="mt-14 rounded-[32px] border border-(--pa-line) bg-(--pa-surface) p-6 shadow-(--pa-shadow) sm:p-10">
						<PreorderForm
							sites={PREORDER_SITES}
							counts={counts}
							price={price}
							selected={selected}
							onSelect={setSelected}
							onDone={() => loadCounts()}
							onSeeBoard={() => scrollToId("wanted")}
						/>
					</div>
				</div>
			</section>
			<App webgl={webgl} />
			<Footer />
			{webgl && <Canvas3D eventSource={root} palette={THEMES[mode]} />}
		</main>
	);
}

