"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import KineticText from "@/components/fx/KineticText";
import { IMG } from "@/components/fx/heritageImages";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

const ERAS = [
	{ num: "80", year: "80 AD", label: "Reconstructing · Colosseum, 80 AD", img: IMG.colosseum },
	{ num: "1150", year: "1150", label: "Standing · Angkor Wat, 1150", img: "/img6.webp" },
	{ num: "1450", year: "1450", label: "Built · Machu Picchu, 1450", img: IMG.machu },
	{ num: "NOW", year: "Today", label: "Today · explore it in AR", img: IMG.greatWall },
];

const STEPS = [
	{ n: "01", t: "Point", d: "Aim your phone at any heritage monument in front of you." },
	{ n: "02", t: "Scrub", d: "Drag the timeline to slide through centuries of its history." },
	{ n: "03", t: "Travel", d: "Unlock stories and reconstructions verified by historians." },
];

const STEP_ANGLE = 360 / ERAS.length;
const SWEEP = 360 - STEP_ANGLE; // 270deg across 4 faces

/**
 * Pinned centerpiece — a 3D era carousel. On desktop the viewport pins and
 * vertical scroll rotates a ring of era image-faces in 3D space while driving
 * the era numeral, caption, progress rail and active step. Mobile / reduced
 * motion shows the front face statically (no pin, no rotation).
 */
export default function TimeScrubber() {
	const sectionRef = useRef(null);
	const pinRef = useRef(null);
	const stageRef = useRef(null);
	const ringRef = useRef(null);
	const faceRefs = useRef([]);
	const numRef = useRef(null);
	const labelRef = useRef(null);
	const railRef = useRef(null);
	const stepRefs = useRef([]);
	const radiusRef = useRef(0);

	useGSAP(
		() => {
			const layout = () => {
				const stage = stageRef.current;
				if (!stage) return;
				const w = stage.clientWidth;
				const faceW = Math.min(w * 0.66, 780);
				const radius = faceW / 2 / Math.tan(Math.PI / ERAS.length);
				radiusRef.current = radius;
				faceRefs.current.forEach((f, i) => {
					if (!f) return;
					f.style.width = `${faceW}px`;
					f.style.marginLeft = `${-faceW / 2}px`;
					f.style.transform = `rotateY(${i * STEP_ANGLE}deg) translateZ(${radius}px)`;
				});
			};

			const apply = (p) => {
				if (ringRef.current) {
					ringRef.current.style.transform = `translateZ(${-radiusRef.current}px) rotateY(${-p * SWEEP}deg)`;
				}
				const idx = Math.round(p * (ERAS.length - 1));
				if (numRef.current) numRef.current.textContent = ERAS[idx].num;
				if (labelRef.current) labelRef.current.textContent = ERAS[idx].label;
				if (railRef.current) railRef.current.style.transform = `scaleX(${p})`;
				const sIdx = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
				stepRefs.current.forEach((el, i) => {
					if (el) el.style.opacity = i === sIdx ? "1" : "0.35";
				});
			};

			layout();
			apply(0);
			window.addEventListener("resize", layout);

			const mm = gsap.matchMedia();
			mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
				const st = ScrollTrigger.create({
					trigger: sectionRef.current,
					start: "top top",
					end: "+=3600",
					pin: pinRef.current,
					scrub: 1,
					onRefresh: layout,
					onUpdate: (self) => apply(self.progress),
				});
				return () => st.kill();
			});

			return () => window.removeEventListener("resize", layout);
		},
		{ scope: sectionRef }
	);

	return (
		<section id="how-it-works" ref={sectionRef} className="relative w-full bg-ink">
			<div ref={pinRef} className="px-6 sm:px-10 py-20 sm:py-24">
				<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-rule pb-6 mb-10">
					<span className="mono-label text-xs text-signal">03 — How It Works</span>
					<span className="mono-label text-xs text-bone-muted">Pinned · scroll to rotate time</span>
				</div>

				<KineticText
					text="Point. Scrub. Travel."
					as="h2"
					split="char"
					className="font-serif text-bone mb-10 kin-spaced"
					style={{ fontSize: "clamp(38px, 7.5vw, 112px)", lineHeight: 0.96 }}
				/>

				{/* 3D era carousel */}
				<div
					ref={stageRef}
					className="persp relative w-full border border-rule bg-ink-2 overflow-hidden"
					style={{ height: "min(58vh, 560px)" }}>
					<div
						ref={ringRef}
						className="tw-3d absolute left-1/2 top-0 h-full"
						style={{ width: 1, transformStyle: "preserve-3d" }}>
						{ERAS.map((e, i) => (
							<div
								key={e.num}
								ref={(el) => {
									faceRefs.current[i] = el;
								}}
								className="absolute top-0 left-0 h-full bface-hidden overflow-hidden border border-rule">
								<Image src={e.img} alt={e.label} fill sizes="80vw" className="object-cover" />
								<div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
								<span className="absolute top-3 left-3 mono-label text-[10px] text-signal">{e.year}</span>
							</div>
						))}
					</div>

					{/* watermark numeral */}
					<span
						ref={numRef}
						className="absolute right-6 top-2 z-10 font-serif select-none pointer-events-none leading-none"
						style={{ fontSize: "clamp(110px, 20vw, 280px)", color: "rgba(242,239,230,0.12)" }}>
						80
					</span>

					{/* era label */}
					<span
						ref={labelRef}
						className="absolute left-6 sm:left-10 z-10 mono-label text-[11px] sm:text-xs text-signal"
						style={{ bottom: "70px" }}>
						Reconstructing · Roman Forum, 80 AD
					</span>

					{/* scrub rail */}
					<div className="absolute z-10 h-px bg-rule" style={{ left: "24px", right: "24px", bottom: "48px" }}>
						<div ref={railRef} className="absolute left-0 top-0 h-px w-full bg-signal origin-left" style={{ transform: "scaleX(0)" }} />
					</div>
					<div className="absolute z-10 flex items-center justify-between mono-label text-[10px] sm:text-xs text-bone-muted" style={{ left: "24px", right: "24px", bottom: "22px" }}>
						<span className="text-signal">80 AD</span>
						<span>1150</span>
						<span>1450</span>
						<span>Today</span>
					</div>
				</div>

				{/* steps */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-rule border-x border-b border-rule">
					{STEPS.map((s, i) => (
						<div
							key={s.n}
							ref={(el) => {
								stepRefs.current[i] = el;
							}}
							className="flex flex-col gap-2 p-7 bg-ink transition-opacity duration-300"
							style={{ opacity: i === 0 ? 1 : 0.35 }}>
							<span className="font-serif text-signal text-4xl leading-none">{s.n}</span>
							<span className="font-serif text-bone text-2xl">{s.t}</span>
							<span className="font-mono text-sm text-bone-muted leading-relaxed">{s.d}</span>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
