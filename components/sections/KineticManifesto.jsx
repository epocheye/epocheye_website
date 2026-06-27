"use client";

import KineticText from "@/components/fx/KineticText";
import Marquee from "@/components/fx/Marquee";
import MouseParallax from "@/components/fx/MouseParallax";
import GridFloor from "@/components/fx/GridFloor";
import Intro3D from "@/components/fx/Intro3D";
import PhotoCube3D from "@/components/fx/PhotoCube3D";
import { IMG } from "@/components/fx/heritageImages";

const CUBE_FACES = [
	{ src: IMG.taj, label: "Taj Mahal" },
	{ src: IMG.colosseum, label: "Colosseum" },
	{ src: IMG.machu, label: "Machu Picchu" },
	{ src: IMG.greatWall, label: "Great Wall" },
	{ src: IMG.pyramids, label: "Pyramids" },
	{ src: IMG.boudhanath, label: "Boudhanath" },
];

const METRICS = ["10,000+ SIGNUPS", "50+ FIELD TESTERS", "BACKED BY STPI · AWS"];

function MarqueeRow() {
	return (
		<span className="inline-flex items-center">
			{METRICS.map((m) => (
				<span key={m} className="inline-flex items-center">
					<span className="px-8 py-5 font-mono text-xs sm:text-sm uppercase tracking-[0.2em] text-ink">
						{m}
					</span>
					<span className="font-mono text-ink/40">/</span>
				</span>
			))}
		</span>
	);
}

/**
 * Opening manifesto below the hero: oversized kinetic SEE / THROUGH / TIME.,
 * a draggable 3D Colosseum relic, editorial corner metadata, and a
 * velocity-reactive metrics marquee as the seam.
 */
export default function KineticManifesto() {
	return (
		<section className="relative w-full bg-ink overflow-hidden">
			{/* animated 3D grid floor */}
			<GridFloor className="z-0" opacity={0.4} />
			<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/30 to-ink z-0" />

			<Intro3D className="relative z-10">
				<MouseParallax className="px-6 sm:px-10 pt-28 pb-16 lg:min-h-[90vh] lg:flex lg:flex-col lg:justify-center tw-3d">
					{/* corner metadata */}
					<div className="hidden lg:flex items-start justify-between absolute top-10 left-10 right-10">
						<span className="mono-label text-xs text-bone-muted" data-depth="14">
							Epocheye — Est. 2026
						</span>
						<span
							className="mono-label text-xs text-bone-muted text-right leading-relaxed"
							data-depth="14">
							Historical intelligence
							<br />
							for the physical world
						</span>
					</div>

					<div className="grid lg:grid-cols-[1.4fr_0.9fr] gap-10 items-center">
						{/* giant kinetic words — mid-depth layer */}
						<div
							className="flex flex-col tw-3d"
							data-depth="26"
							data-ry="6"
							data-rx="4">
							<KineticText
								text="SEE"
								as="h2"
								split="char"
								skew
								className="font-serif text-bone kin-spaced"
								style={{
									fontSize: "clamp(60px, 12vw, 168px)",
									lineHeight: 0.86,
								}}
							/>
							<KineticText
								text="THROUGH"
								as="h2"
								split="char"
								skew
								delay={0.05}
								className="font-serif italic text-bone-muted kin-spaced"
								style={{
									fontSize: "clamp(48px, 10vw, 168px)",
									lineHeight: 0.86,
								}}
							/>
							<KineticText
								text="TIME."
								as="h2"
								split="char"
								skew
								delay={0.1}
								className="font-serif text-signal glow-signal kin-spaced"
								style={{
									fontSize: "clamp(60px, 12vw, 168px)",
									lineHeight: 0.86,
								}}
							/>
						</div>

						{/* rotating 3D photo cube — parallax depth layer */}
						<div data-depth="55" className="flex justify-center float-3d">
							<PhotoCube3D faces={CUBE_FACES} size={300} />
						</div>
					</div>
				</MouseParallax>
			</Intro3D>

			{/* velocity marquee seam */}
			<Marquee
				className="relative z-10 bg-signal border-y border-ink/20"
				baseDuration={22}>
				<MarqueeRow />
			</Marquee>
		</section>
	);
}
