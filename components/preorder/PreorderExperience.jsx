"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";

import { OTHER_SITE, PREORDER_SITES, SITE_BY_SLUG } from "@/lib/preorder/sites";
import { THEMES, THEME_KEY, cssVars, initialTheme } from "./theme";
import { STATION_COUNT, createProgress, nearestStation, stationProgress, stationWeight } from "./stations";
import { Boot, Hud } from "./Hud";
import { ClickSpark } from "./reactbits";
import FormPanel from "./FormPanel";
import { IosSheet, ShareSheet } from "./Sheets";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

const World = dynamic(() => import("./World"), { ssr: false, loading: () => null });

const SCROLL_PER_STATION = 130; // vh of scrolling between two stations
const IDLE_HINT_MS = 3500; // still this long, and the pointer says "scroll"

// Shared with the 3D scene outside React state: GSAP writes, useFrame reads.
const progress = createProgress(); // scroll, 0 → 1
const intro = createProgress(); // hologram assembly after the boot sequence, 0 → 1

function hasWebGL() {
	try {
		const c = document.createElement("canvas");
		return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
	} catch {
		return false;
	}
}

/** A shared link (/preorder?site=hampi) opens with that site picked. */
function initialSite() {
	const slug = new URLSearchParams(window.location.search).get("site");
	return SITE_BY_SLUG.has(slug) ? slug : PREORDER_SITES[0].slug;
}

function scrollToStation(i) {
	const y = stationProgress(i) * ScrollTrigger.maxScroll(window);
	const smoother = ScrollSmoother.get();
	if (smoother) smoother.scrollTo(y, true);
	else window.scrollTo({ top: y, behavior: "smooth" });
}

/** Flat page for browsers without WebGL: same content, same form. */
function Fallback({ sites, counts, price, selected, onSelect, onDone }) {
	const ranked = [...sites].sort((a, b) => (counts?.[b.slug] ?? 0) - (counts?.[a.slug] ?? 0));
	return (
		<div className="mx-auto max-w-3xl px-5 py-28 text-(--pa-text)">
			<h1 className="font-(family-name:--font-pre-display) text-5xl font-bold uppercase">
				Pre-order <span className="text-(--pa-ochre-text)">the past.</span>
			</h1>
			<p className="mt-4 text-(--pa-text-soft)">Pick the heritage site you want to see next. The most-wanted goes live for Diwali.</p>
			<ol className="mt-10 space-y-2 font-(family-name:--font-pre-mono)">
				{ranked.map((s, i) => (
					<li key={s.slug}>
						<button type="button" onClick={() => onSelect(s.slug)} className="flex w-full justify-between border-b border-(--pa-line) py-3 text-left">
							<span>
								<span className="mr-3 text-(--pa-ochre-text)">{String(i + 1).padStart(2, "0")}</span>
								{s.name}, {s.place}
							</span>
							<span className="text-sm text-(--pa-accent-text)">{counts?.[s.slug] ?? 0}</span>
						</button>
					</li>
				))}
			</ol>
			<div className="mt-12 flex justify-center">
				<FormPanel sites={sites} price={price} selected={selected} onSelect={onSelect} onDone={onDone} narrow />
			</div>
		</div>
	);
}

export default function PreorderExperience() {
	const [webgl] = useState(hasWebGL);
	const [mode, setMode] = useState(initialTheme);
	const [counts, setCounts] = useState(null);
	const [price, setPrice] = useState(null);
	const [selected, setSelected] = useState(initialSite);
	const [hovered, setHovered] = useState(null);
	const [flash, setFlash] = useState(null);
	const [station, setStation] = useState(0);
	const [formVisible, setFormVisible] = useState(false);
	const [sheet, setSheet] = useState(null); // null | "ios"
	const [idle, setIdle] = useState(false); // not scrolled for a while: show the scroll hint
	const [share, setShare] = useState(null); // the paid pre-order to share
	const wrapper = useRef(null);
	const content = useRef(null);
	const percent = useRef(null);
	const lastScroll = useRef(0);
	const palette = THEMES[mode];

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
		// Per visitor (rupees in India), so it is never cached with the counts.
		fetch("/api/preorder/price", { cache: "no-store" })
			.then((r) => r.json())
			.then((j) => {
				if (j?.success) setPrice(j.data.price);
			})
			.catch(() => {});
	}, [loadCounts]);

	// GSAP owns scrolling: ScrollSmoother on desktop, native on touch, and one
	// ScrollTrigger that feeds scroll progress to the camera and the HUD.
	useEffect(() => {
		if (!webgl) return;
		const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		const touch = window.matchMedia?.("(pointer: coarse)").matches;
		progress.value = 0;
		const smoother =
			reduced || touch
				? null
				: ScrollSmoother.create({ wrapper: wrapper.current, content: content.current, smooth: 1.4, effects: false });
		const st = ScrollTrigger.create({
			trigger: content.current,
			start: "top top",
			end: "bottom bottom",
			onUpdate: (self) => {
				const v = self.progress;
				progress.value = v;
				lastScroll.current = performance.now();
				setIdle(false);
				if (percent.current) percent.current.textContent = String(Math.round(v * 100)).padStart(3, "0");
				const s = nearestStation(v);
				setStation((prev) => (prev === s ? prev : s));
				// Only near the form, so the camera never flies through the DOM panel.
				const show = stationWeight(v, 3) > 0.8;
				setFormVisible((prev) => (prev === show ? prev : show));
			},
		});
		return () => {
			st.kill();
			smoother?.kill();
		};
	}, [webgl]);

	// Anyone who stops short of the end is reminded to keep scrolling.
	useEffect(() => {
		if (!webgl) return;
		lastScroll.current = performance.now();
		const id = setInterval(() => {
			setIdle(performance.now() - lastScroll.current > IDLE_HINT_MS && progress.value < 0.97);
		}, 500);
		return () => clearInterval(id);
	}, [webgl]);

	const startIntro = useCallback(() => {
		gsap.fromTo(intro, { value: 0 }, { value: 1, duration: 3.2, ease: "power2.inOut" });
	}, []);

	const toggleTheme = () => {
		const next = mode === "light" ? "dark" : "light";
		setMode(next);
		try {
			localStorage.setItem(THEME_KEY, next);
		} catch {
			// storage blocked: the choice lasts for this visit only
		}
	};

	const pick = (slug) => {
		setSelected(slug);
		scrollToStation(3);
	};

	const onDone = ({ slug, label, reference, alreadyPaid }) => {
		if (slug !== OTHER_SITE) setFlash({ slug, at: performance.now() });
		loadCounts();
		setSheet(null);
		setShare({ slug, label, reference, alreadyPaid });
	};

	const closeSheet = useCallback(() => setSheet(null), []);
	const closeShare = useCallback(() => setShare(null), []);

	const sheets = (
		<>
			{sheet === "ios" && <IosSheet onClose={closeSheet} />}
			{share && (
				<ShareSheet
					share={share}
					onClose={closeShare}
					onSeeBrick={() => {
						setShare(null);
						if (webgl) scrollToStation(2);
					}}
				/>
			)}
		</>
	);

	if (!webgl) {
		return (
			<main className="min-h-screen bg-(--pa-bg) font-(family-name:--font-pre-display) font-medium" style={cssVars(palette)}>
				<Fallback sites={PREORDER_SITES} counts={counts} price={price} selected={selected} onSelect={setSelected} onDone={onDone} />
				{sheets}
			</main>
		);
	}

	return (
		<main className="bg-(--pa-bg) font-(family-name:--font-pre-display) font-medium" style={cssVars(palette)}>
			<Boot onDone={startIntro} />
			<div className="fixed inset-0 z-10">
				<World
					palette={palette}
					progress={progress}
					intro={intro}
					sites={PREORDER_SITES}
					counts={counts}
					price={price}
					selected={selected}
					hovered={hovered}
					onHover={setHovered}
					onPick={pick}
					onSelect={setSelected}
					onDone={onDone}
					onSeeBrick={() => scrollToStation(2)}
					flash={flash}
					formVisible={formVisible}
					heroActive={station === 0 && !sheet && !share}
					onEnter={() => scrollToStation(1)}
				/>
			</div>
			<Hud
				station={station}
				mode={mode}
				onToggleTheme={toggleTheme}
				onJump={scrollToStation}
				onIos={() => setSheet("ios")}
				scrollHint={idle && !sheet && !share}
				percentRef={percent}
			/>
			{sheets}
			<ClickSpark color={palette.ochre} />
			{/* Scroll track: the page's only job is to give the camera distance to travel. */}
			<div ref={wrapper} id="smooth-wrapper">
				<div ref={content} id="smooth-content">
					<div aria-hidden="true" style={{ height: `${(STATION_COUNT - 1) * SCROLL_PER_STATION + 100}vh` }} />
				</div>
			</div>
		</main>
	);
}
