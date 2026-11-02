"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { LIVE_MONUMENTS } from "@/lib/monuments/live";
import { ScrambleText } from "@/components/preorder/reactbits";
import { STATIONS, STATION_COUNT, createProgress, nearestStation } from "./stations";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const World = dynamic(() => import("./World"), { ssr: false, loading: () => null });

const SCROLL_PER_STATION = 110; // vh of scrolling between two scenes
const IDLE_HINT_MS = 3500;

// Shared with the scene outside React state: GSAP writes, useFrame reads.
const progress = createProgress();
const intro = createProgress();

function hasWebGL() {
	try {
		const c = document.createElement("canvas");
		return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
	} catch {
		return false;
	}
}
const noop = () => () => {};
// Read once on the client; the server assumes WebGL and the client corrects it.
const useWebGL = () => useSyncExternalStore(noop, hasWebGL, () => true);

/** The scenes as plain text, for crawlers and screen readers. */
function SceneText() {
	return (
		<div className="sr-only">
			<h2>See through time</h2>
			<p>Historical intelligence for the physical world. Point your phone at a monument and see what the record says stood there.</p>
			<h2>Where it works</h2>
			<ul>
				{LIVE_MONUMENTS.map((m) => (
					<li key={m.slug}>
						<a href={`/monuments/${m.slug}`}>{m.name}</a>, {m.city}
					</li>
				))}
			</ul>
			<p>Backed by Software Technology Parks of India, Amazon Web Services and Draper Startup House.</p>
			<h2>Three systems. One impossible product.</h2>
			<h3>AR Time Travel</h3>
			<p>Stand at the monument and see what the record says was there: Tipu Sultan&apos;s Summer Palace as it was painted, Bangalore Fort&apos;s lost rampart back on its wall.</p>
			<h3>AI Historian</h3>
			<p>A guided narration at Tipu Sultan&apos;s Summer Palace, in English and Hindi, stop by stop as you walk the rooms.</p>
			<h3>Sourced, every card</h3>
			<p>Point at an exhibit and read what the published record says, with the source named. Where no record exists, the app says so.</p>
			<h2>A world, rebuilt</h2>
			<h2>Heritage, in motion</h2>
			<p>Real footage from the Epocheye AR prototype. Point, and the past renders in place.</p>
			<h2>Point. Scrub. Travel.</h2>
			<p>Aim your phone at any heritage monument in front of you. Drag the timeline to slide through centuries of its history. Unlock stories and reconstructions verified by historians.</p>
			<h2>We&apos;re coming to these</h2>
			<p>Taj Mahal, Colosseum, Machu Picchu, Great Wall, Pyramids of Giza, Boudhanath Stupa, Tikal and Carcassonne.</p>
			<h2>Built with the people who tell these stories</h2>
			<p>
				The <a href="https://creators.epocheye.com">Creators Program</a> is live: apply, get verified, and earn on every booking you drive, with payouts tracked in real time.
			</p>
			<h2>Operators, not tourists</h2>
			<p>Sambit Singha, Founder and CEO. Investor or partner? <a href="mailto:sambit@epocheye.app">Get in touch</a>.</p>
		</div>
	);
}

/**
 * Everything below the hero: one 3D flight through nine scenes. The canvas
 * is pinned to the viewport while a tall track scrolls past; the track's
 * height is the camera's travel. Without WebGL the classic sections render instead.
 */
export default function Journey({ fallback }) {
	const webgl = useWebGL();
	const section = useRef(null);
	const stage = useRef(null);
	const percent = useRef(null);
	const lastScroll = useRef(0);
	const [active, setActive] = useState(false);
	const [station, setStation] = useState(0);
	const [idle, setIdle] = useState(false);
	const [reduced] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

	useEffect(() => {
		if (!webgl) return;
		progress.value = 0;
		intro.value = 0;
		let introStarted = false;
		const drive = ScrollTrigger.create({
			trigger: section.current,
			start: "top top",
			end: "bottom bottom",
			// html and body clip overflow-x, which breaks position: sticky, so GSAP pins the stage instead.
			pin: stage.current,
			pinSpacing: false,
			onUpdate: (self) => {
				const v = self.progress;
				progress.value = v;
				lastScroll.current = performance.now();
				setIdle(false);
				if (percent.current) percent.current.textContent = String(Math.round(v * 100)).padStart(3, "0");
				const s = nearestStation(v);
				setStation((prev) => (prev === s ? prev : s));
			},
		});
		// Render only while any of the section is on screen; assemble the scan the first time it is.
		const view = ScrollTrigger.create({
			trigger: section.current,
			start: "top bottom",
			end: "bottom top",
			onToggle: (self) => {
				setActive(self.isActive);
				if (self.isActive && !introStarted) {
					introStarted = true;
					gsap.to(intro, { value: 1, duration: reduced ? 0.01 : 3, ease: "power2.inOut" });
				}
			},
		});
		ScrollTrigger.refresh();
		return () => {
			drive.kill();
			view.kill();
		};
	}, [webgl, reduced]);

	// Anyone who stops inside the flight is reminded to keep scrolling.
	useEffect(() => {
		if (!webgl) return;
		lastScroll.current = performance.now();
		const id = setInterval(() => {
			setIdle(performance.now() - lastScroll.current > IDLE_HINT_MS && progress.value > 0.001 && progress.value < 0.99);
		}, 500);
		return () => clearInterval(id);
	}, [webgl]);

	if (!webgl) return fallback;

	return (
		<section
			id="main-content"
			ref={section}
			aria-label="Epocheye, scene by scene"
			className="relative bg-ink"
			style={{ height: `${(STATION_COUNT - 1) * SCROLL_PER_STATION + 100}vh` }}>
			{/* One anchor per scene, so #capabilities, #how-it-works … and the section nav land on it. */}
			{STATIONS.map((s, i) => (
				<div
					key={s.id}
					id={s.id === "manifesto" ? undefined : s.id}
					aria-hidden="true"
					className="pointer-events-none absolute inset-x-0"
					style={{ top: `${i * SCROLL_PER_STATION}vh`, height: `${SCROLL_PER_STATION}vh` }}
				/>
			))}
			<SceneText />
			<div ref={stage} className="relative h-svh w-full overflow-hidden">
				<World progress={progress} intro={intro} reduced={reduced} active={active} />

				{/* Where you are in the flight. */}
				<div className="pointer-events-none absolute bottom-6 left-6 z-10 font-mono text-[10px] uppercase tracking-[0.22em] text-bone-muted sm:bottom-8 sm:left-10 sm:text-[11px]">
					<div className="mb-1 text-signal">
						SCENE {String(station + 1).padStart(2, "0")} / {String(STATION_COUNT).padStart(2, "0")}
					</div>
					<ScrambleText text={STATIONS[station].label.toUpperCase()} className="text-bone" />
				</div>
				<div className="pointer-events-none absolute bottom-6 right-6 z-10 font-mono text-[10px] uppercase tracking-[0.22em] text-bone-muted sm:bottom-8 sm:right-10 sm:text-[11px]">
					DEPTH <span ref={percent} className="text-signal">000</span>
				</div>
				<div className="pointer-events-none absolute inset-x-0 bottom-20 z-10 flex justify-center">
					<span
						aria-hidden="true"
						className={`flex items-center gap-1.5 rounded-full border border-rule bg-ink/60 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-bone backdrop-blur-xl transition-all duration-500 ${
							idle ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
						}`}>
						Scroll <span className="animate-bounce">↓</span>
					</span>
				</div>
			</div>
		</section>
	);
}
