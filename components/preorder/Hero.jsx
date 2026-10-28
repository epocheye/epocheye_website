"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

import GridFloor from "@/components/fx/GridFloor";
import MagneticButton from "@/components/fx/MagneticButton";
import { DecryptedText, EASE, SplitText } from "./fx";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

// WebGL only on the client; the CSS grid floor underneath covers the load and
// stays as the fallback when WebGL is unavailable.
const GridScene = dynamic(() => import("./GridScene"), { ssr: false, loading: () => null });

const INTRO = 2.1; // seconds the curtain holds before the title lands

function scrollToReserve(e) {
	const target = document.getElementById("reserve");
	if (!target) return;
	e.preventDefault();
	if (window.__lenis) window.__lenis.scrollTo(target, { offset: -20, duration: 1.6 });
	else target.scrollIntoView({ behavior: "smooth" });
}

/** Opening curtain: a counter and a rule fill, then the panel wipes up off the grid. */
function Curtain() {
	const ref = useRef(null);
	useGSAP(
		() => {
			const el = ref.current;
			if (!el) return;
			if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
				gsap.set(el, { display: "none" });
				return;
			}
			const counter = el.querySelector("[data-count]");
			const n = { v: 0 };
			gsap
				.timeline()
				.to(n, {
					v: 100,
					duration: 1.3,
					ease: "power2.inOut",
					onUpdate: () => {
						counter.textContent = String(Math.round(n.v)).padStart(3, "0");
					},
				})
				.to("[data-bar]", { scaleX: 1, duration: 1.3, ease: "power2.inOut" }, 0)
				.to("[data-word]", { yPercent: -110, duration: 0.6, ease: "power3.in" }, 1.25)
				.to(el, { clipPath: "inset(0% 0% 100% 0%)", duration: 1, ease: "expo.inOut" }, 1.4)
				.set(el, { display: "none" });
		},
		{ scope: ref }
	);

	return (
		<div
			ref={ref}
			className="fixed inset-0 z-[90] flex flex-col justify-between bg-ink-3 p-6 sm:p-10"
			style={{ clipPath: "inset(0% 0% 0% 0%)" }}
			aria-hidden="true">
			<div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-bone-muted">
				<span>Epocheye</span>
				<span>Pre-order</span>
			</div>
			<div className="overflow-hidden">
				<div data-word className="font-montserrat text-[18vw] font-semibold leading-none tracking-tight text-bone sm:text-[12vw]">
					<span data-count>000</span>
				</div>
			</div>
			<div className="h-px w-full origin-left scale-x-0 bg-signal" data-bar />
		</div>
	);
}

function Clock() {
	const [now, setNow] = useState("--:--:--");
	useEffect(() => {
		const fmt = new Intl.DateTimeFormat("en-GB", {
			timeZone: "Asia/Kolkata",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
		const id = setInterval(() => setNow(fmt.format(new Date())), 1000);
		return () => clearInterval(id);
	}, []);
	return <span>IST {now}</span>;
}

export default function Hero() {
	const sectionRef = useRef(null);
	const stageRef = useRef(null);
	const reduced = useReducedMotion();
	const [active, setActive] = useState(true);
	const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });

	const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "-55%"]);
	const titleOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
	const titleBlur = useTransform(scrollYProgress, [0, 0.55], ["blur(0px)", "blur(12px)"]);
	const hudOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
	const percent = useTransform(scrollYProgress, (v) => String(Math.round(v * 100)).padStart(3, "0"));

	// Hold the stage in view for the whole section. A GSAP pin rather than CSS
	// sticky: the global overflow-x on html/body stops sticky from engaging.
	useGSAP(
		() => {
			ScrollTrigger.create({
				trigger: sectionRef.current,
				pin: stageRef.current,
				start: "top top",
				end: "bottom bottom",
				pinSpacing: false,
			});
		},
		{ scope: sectionRef }
	);

	// Stop rendering WebGL once the hero is off screen.
	useEffect(() => {
		const el = sectionRef.current;
		if (!el) return;
		const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: "100px" });
		io.observe(el);
		return () => io.disconnect();
	}, []);

	const d = reduced ? 0 : INTRO;

	return (
		<section ref={sectionRef} className="relative h-[230vh] bg-ink-3" aria-label="Pre-order Epocheye">
			<Curtain />
			<div ref={stageRef} className="relative h-[100svh] overflow-hidden">
				<GridFloor opacity={0.45} />
				<GridScene progress={scrollYProgress} eventSource={sectionRef} active={active} reduced={reduced} />

				{/* Readability scrims */}
				<div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink-3/90 to-transparent" />
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-ink-3 via-ink-3/70 to-transparent" />

				{/* Top bar */}
				<motion.div style={{ opacity: hudOpacity }} className="absolute inset-x-0 top-0 z-10">
				<motion.header
					initial={reduced ? false : { opacity: 0, y: -16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1, ease: EASE, delay: d + 0.4 }}
					className="flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7">
					<Link href="/" className="font-montserrat text-sm font-semibold tracking-[0.18em] text-bone" data-cursor>
						EPOCHEYE
					</Link>
					<span className="hidden font-mono text-[11px] uppercase tracking-[0.22em] text-bone-muted md:inline">
						Pre-orders <span className="text-signal">●</span> open
					</span>
					<MagneticButton
						href="#reserve"
						onClick={scrollToReserve}
						className="rounded-full border border-bone/30 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bone transition-colors hover:border-signal hover:text-signal">
						Reserve
					</MagneticButton>
				</motion.header>
				</motion.div>

				{/* Side HUD */}
				<motion.div
					style={{ opacity: hudOpacity }}
					className="pointer-events-none absolute left-5 top-32 z-10 hidden flex-col gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-bone-faint sm:left-10 lg:flex">
					<Clock />
					<span>Grid 46 × 46</span>
					<span>
						Depth <motion.span className="text-bone-muted">{percent}</motion.span>
					</span>
				</motion.div>

				{/* Title block */}
				<motion.div
					style={{ y: titleY, opacity: titleOpacity, filter: titleBlur }}
					className="absolute inset-x-0 bottom-0 z-10 px-5 pb-10 sm:px-10 sm:pb-14">
					<div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
						<h1 className="leading-[0.86] tracking-[-0.04em] text-bone">
							<SplitText
								text="Pre-order"
								delay={d}
								className="block font-montserrat text-[clamp(3.4rem,11vw,11.5rem)] font-semibold"
							/>
							<SplitText
								text="the past."
								delay={d + 0.3}
								className="block pl-[0.6em] font-instrument-serif text-[clamp(3.4rem,11vw,11.5rem)] italic text-signal"
							/>
						</h1>

						<motion.div
							initial={reduced ? false : { opacity: 0, y: 24 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 1.1, ease: EASE, delay: d + 0.9 }}
							className="max-w-sm lg:pb-6">
							<p className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-bone-muted">
								<DecryptedText text="Reserve / pay nothing today" delay={d + 0.9} />
							</p>
							<p className="text-base leading-relaxed text-bone/75 sm:text-lg">
								Epocheye shows heritage monuments as the historical record describes them, in augmented reality.
								Pre-order your monument now and hold your place before you visit.
							</p>
							<div className="mt-7 flex items-center gap-5">
								<MagneticButton
									href="#reserve"
									onClick={scrollToReserve}
									className="group relative overflow-hidden rounded-full border border-signal px-7 py-3.5 text-sm font-medium text-signal">
									<span className="absolute inset-0 origin-bottom scale-y-0 bg-signal transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-y-100" />
									<span className="relative transition-colors duration-500 group-hover:text-ink">Pre-order now →</span>
								</MagneticButton>
								<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-bone-faint">Scroll to dive</span>
							</div>
						</motion.div>
					</div>
				</motion.div>

				{/* Scroll cue */}
				<motion.div
					style={{ opacity: hudOpacity }}
					className="pointer-events-none absolute bottom-0 left-1/2 z-10 hidden h-16 w-px -translate-x-1/2 overflow-hidden bg-bone/10 lg:block">
					<motion.span
						className="absolute inset-x-0 top-0 h-1/2 bg-signal"
						animate={reduced ? undefined : { y: ["-100%", "200%"] }}
						transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
					/>
				</motion.div>
			</div>
		</section>
	);
}
