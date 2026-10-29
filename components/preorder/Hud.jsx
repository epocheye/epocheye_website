"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { animate, createTimeline, stagger, svg } from "animejs";
import { Moon, Sun } from "lucide-react";

import googlePlayBadge from "@/public/google-play-badge.png";
import { PLAY_STORE_URL } from "@/lib/site";
import { STATIONS, STATION_COUNT } from "./stations";
import { Magnet, ScrambleText } from "./reactbits";

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ───────────────────────── Boot sequence ───────────────────────── */

const BOOT_LINES = [
	"EPOCHEYE // PRE-ORDER TERMINAL",
	"LOADING HERITAGE INDEX ......... 12 SITES",
	"CALIBRATING AR SCANNER ......... OK",
	"PLOTTING THE MOST WANTED ....... OK",
	"READY. STEP IN.",
];

/** Terminal boot: lines type in (anime.js), a counter fills, then the panel wipes away (GSAP). */
export function Boot({ onDone }) {
	const ref = useRef(null);
	const done = useEffectEvent(() => onDone());
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (reduced()) {
			el.style.display = "none";
			done();
			return;
		}
		const counter = el.querySelector("[data-count]");
		const n = { v: 0 };
		const tl = createTimeline({
			onComplete: () => {
				gsap.to(el, {
					clipPath: "inset(0% 0% 100% 0%)",
					duration: 0.9,
					ease: "expo.inOut",
					onComplete: () => {
						el.style.display = "none";
					},
				});
				done();
			},
		});
		tl.add("[data-line]", { opacity: [0, 1], translateX: [-12, 0], duration: 260, delay: stagger(240), ease: "outQuad" }, 0)
			.add(n, { v: 100, duration: 1500, ease: "inOutQuad", onUpdate: () => (counter.textContent = String(Math.round(n.v)).padStart(3, "0")) }, 0)
			.add("[data-bar]", { scaleX: [0, 1], duration: 1500, ease: "inOutQuad" }, 0);
		return () => tl.revert();
	}, []);
	return (
		<div
			ref={ref}
			className="fixed inset-0 z-[90] flex flex-col justify-between bg-(--pa-bg) p-6 font-(family-name:--font-pre-mono) text-(--pa-text) sm:p-10"
			style={{ clipPath: "inset(0% 0% 0% 0%)" }}
			aria-hidden="true">
			<div className="space-y-2 text-[11px] uppercase tracking-[0.18em] sm:text-xs">
				{BOOT_LINES.map((l, i) => (
					<p key={l} data-line className={`opacity-0 ${i === BOOT_LINES.length - 1 ? "text-(--pa-ochre-text)" : "text-(--pa-accent-text)"}`}>
						<span className="mr-3 text-(--pa-text-muted)">{`>`}</span>
						{l}
					</p>
				))}
			</div>
			<div className="flex items-end justify-between">
				<span data-count className="font-(family-name:--font-pre-display) text-[22vw] font-bold leading-none tracking-tight sm:text-[13vw]">
					000
				</span>
				<span className="mb-4 text-[11px] uppercase tracking-[0.2em] text-(--pa-text-muted)">% LOADED</span>
			</div>
			<div className="h-px w-full origin-left scale-x-0 bg-gradient-to-r from-(--pa-accent) to-(--pa-ochre)" data-bar />
		</div>
	);
}

/* ───────────────────────── HUD ───────────────────────── */

function Corners() {
	const ref = useRef(null);
	useEffect(() => {
		const el = ref.current;
		if (!el || reduced()) return;
		const lines = svg.createDrawable(el.querySelectorAll("path"));
		const a = animate(lines, { draw: ["0 0", "0 1"], duration: 1100, delay: stagger(120, { start: 2300 }), ease: "inOutQuart" });
		return () => a.revert();
	}, []);
	const L = 26;
	return (
		<svg ref={ref} className="pointer-events-none fixed inset-3 z-30 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] sm:inset-5 sm:h-[calc(100%-2.5rem)] sm:w-[calc(100%-2.5rem)]" aria-hidden="true">
			<g fill="none" stroke="var(--pa-accent)" strokeWidth="1.5">
				<path d={`M0 ${L} V0 H${L}`} />
				<path d={`M0 0 H${-L} V${L}`} style={{ transform: "translateX(100%)" }} />
				<path d={`M0 ${-L} V0 H${L}`} style={{ transform: "translateY(100%)" }} />
				<path d={`M0 ${-L} V0 H${-L}`} style={{ transform: "translate(100%, 100%)" }} />
			</g>
		</svg>
	);
}

function Waveform() {
	const ref = useRef(null);
	useEffect(() => {
		const el = ref.current;
		if (!el || reduced()) return;
		const a = animate(el.children, {
			scaleY: () => [0.15 + Math.random() * 0.3, 0.5 + Math.random() * 0.5],
			duration: () => 380 + Math.random() * 500,
			delay: stagger(45),
			loop: true,
			alternate: true,
			ease: "inOutSine",
		});
		return () => a.revert();
	}, []);
	return (
		<span ref={ref} className="flex h-4 items-end gap-[3px]" aria-hidden="true">
			{Array.from({ length: 14 }, (_, i) => (
				<span key={i} className="block h-full w-[2px] origin-bottom scale-y-50 bg-(--pa-ochre)" />
			))}
		</span>
	);
}

function Clock() {
	const [now, setNow] = useState("--:--:--");
	useEffect(() => {
		const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit" });
		const id = setInterval(() => setNow(fmt.format(new Date())), 1000);
		return () => clearInterval(id);
	}, []);
	return <span>IST {now}</span>;
}

/** Crosshair that trails the pointer on desktop. */
function Reticle() {
	const ref = useRef(null);
	useGSAP(() => {
		const el = ref.current;
		if (!el || !window.matchMedia?.("(pointer: fine)").matches || reduced()) return;
		gsap.set(el, { opacity: 1 });
		const x = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3" });
		const y = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3" });
		const move = (e) => {
			x(e.clientX);
			y(e.clientY);
		};
		window.addEventListener("pointermove", move);
		return () => window.removeEventListener("pointermove", move);
	});
	return (
		<div ref={ref} className="pointer-events-none fixed left-0 top-0 z-[70] opacity-0" aria-hidden="true">
			<div className="-translate-x-1/2 -translate-y-1/2">
				<svg width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="var(--pa-ochre)" strokeWidth="1.2">
					<circle cx="17" cy="17" r="9" strokeDasharray="4 3" />
					<path d="M17 0v6M17 28v6M0 17h6M28 17h6" />
				</svg>
			</div>
		</div>
	);
}

export function Hud({ station, mode, onToggleTheme, onJump, percentRef }) {
	const light = mode === "light";
	return (
		<>
			<Corners />
			<Reticle />
			<header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-6 sm:px-11 sm:py-8">
				<Link href="/" className="pointer-events-auto font-(family-name:--font-pre-display) text-sm font-bold tracking-[0.2em] text-(--pa-text)">
					EPOCHEYE
				</Link>
				<div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
					<button
						type="button"
						onClick={onToggleTheme}
						aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
						className="grid h-9 w-9 place-items-center border border-(--pa-line) bg-(--pa-panel)/70 text-(--pa-text) backdrop-blur-sm transition-colors hover:border-(--pa-ochre) hover:text-(--pa-ochre-text) sm:h-10 sm:w-10">
						{light ? <Moon className="h-4 w-4" aria-hidden="true" /> : <Sun className="h-4 w-4" aria-hidden="true" />}
					</button>
					<Magnet>
						<a
							href={PLAY_STORE_URL}
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Get Epocheye on Google Play"
							className="block rounded-lg transition-transform hover:scale-[1.04]">
							<Image src={googlePlayBadge} alt="Get it on Google Play" width={130} height={50} priority className="h-9 w-auto sm:h-11" />
						</a>
					</Magnet>
				</div>
			</header>

			<nav aria-label="Sections" className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 sm:right-11 lg:flex">
				{STATIONS.map((s, i) => (
					<button
						key={s.id}
						type="button"
						onClick={() => onJump(i)}
						aria-current={station === i ? "step" : undefined}
						className={`group flex items-center gap-3 font-(family-name:--font-pre-mono) text-[10px] uppercase tracking-[0.22em] transition-colors ${
							station === i ? "text-(--pa-ochre-text)" : "text-(--pa-text-muted) hover:text-(--pa-text)"
						}`}>
						<span className="opacity-0 transition-opacity group-hover:opacity-100">{s.label}</span>
						{String(i).padStart(2, "0")}
						<span className={`h-px transition-all duration-500 ${station === i ? "w-8 bg-(--pa-ochre)" : "w-3 bg-(--pa-text-muted)"}`} />
					</button>
				))}
			</nav>

			<div className="pointer-events-none fixed bottom-6 left-6 z-40 font-(family-name:--font-pre-mono) text-[10px] uppercase tracking-[0.22em] text-(--pa-text-muted) sm:bottom-8 sm:left-11 sm:text-[11px]">
				<div className="mb-1 text-(--pa-accent-text)">
					SECTOR {String(station).padStart(2, "0")} / {String(STATION_COUNT - 1).padStart(2, "0")}
				</div>
				<ScrambleText text={STATIONS[station].label.toUpperCase()} className="text-(--pa-text)" />
			</div>

			<div className="pointer-events-none fixed bottom-6 right-6 z-40 flex items-center gap-4 font-(family-name:--font-pre-mono) text-[10px] uppercase tracking-[0.22em] text-(--pa-text-muted) sm:bottom-8 sm:right-11 sm:text-[11px]">
				<span className="hidden sm:inline">
					<Clock />
				</span>
				<span>
					DEPTH <span ref={percentRef} className="text-(--pa-ochre-text)">000</span>
				</span>
				<Waveform />
			</div>
		</>
	);
}
