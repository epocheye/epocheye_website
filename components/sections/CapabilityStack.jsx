"use client";

import Scroll3D from "@/components/fx/Scroll3D";
import KineticText from "@/components/fx/KineticText";
import RevealImage from "@/components/fx/RevealImage";
import Tilt3D from "@/components/fx/Tilt3D";
import { IMG } from "@/components/fx/heritageImages";

const BLOCKS = [
	{
		n: "01",
		title: "AR Time Travel",
		desc: "Aim your phone at a ruin and watch it rebuild itself across a thousand years — stone by stone, era by era.",
		src: IMG.pyramids,
		caption: "Pyramids of Giza · Egypt",
		align: "left",
	},
	{
		n: "02",
		title: "AI Historian",
		desc: "A historian in your ear, narrating the exact stone you're standing on — verified by experts, tuned to your location.",
		src: IMG.boudhanath,
		caption: "Boudhanath Stupa · Nepal",
		align: "right",
	},
	{
		n: "03",
		title: "Offline-First",
		desc: "The whole engine runs with zero bars. Download any heritage site before you arrive and leave the grid behind.",
		src: "/img7.webp",
		caption: "Bagan · Myanmar",
		align: "left",
	},
];

/**
 * The three capabilities as a broken, offset editorial grid — oversized ghost
 * numerals, kinetic titles, mono copy, and a floating 3D relic per block.
 */
export default function CapabilityStack() {
	return (
		<section id="capabilities" className="relative w-full bg-ink-2 px-6 sm:px-10 py-24 sm:py-32">
			<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-rule pb-6 mb-16">
				<span className="mono-label text-xs text-signal">02 — The Stack</span>
				<span className="font-serif text-bone text-2xl sm:text-4xl leading-none sm:text-right kin-spaced">
					Three systems.
					<br />
					One impossible product.
				</span>
			</div>

			<div className="flex flex-col gap-20 sm:gap-28">
				{BLOCKS.map((b, i) => {
					const reverse = b.align === "right";
					return (
						<Scroll3D
							key={b.n}
							className={`w-full lg:w-[80%] ${
								reverse ? "lg:ml-auto" : i === 2 ? "lg:ml-[10%]" : "lg:mr-auto"
							}`}>
							<div
								className={`flex flex-col gap-8 sm:gap-12 sm:items-center ${
									reverse ? "sm:flex-row-reverse" : "sm:flex-row"
								}`}>
								<Tilt3D className="w-full sm:w-[320px] shrink-0" max={12} scale={1.05}>
									<div className="group relative w-full h-[230px] sm:h-[320px] border border-rule shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]">
										<RevealImage
											src={b.src}
											alt={b.caption}
											className="h-full w-full"
											sizes="(max-width: 640px) 90vw, 320px"
										/>
										<span className="absolute bottom-3 left-3 z-10 mono-label text-[10px] text-bone">
											{b.caption}
										</span>
									</div>
								</Tilt3D>
								<div className={`flex flex-col gap-4 ${reverse ? "sm:items-end sm:text-right" : ""}`}>
									<span
										className="font-serif leading-none text-ghost"
										style={{ fontSize: "clamp(52px, 7vw, 100px)" }}>
										{b.n}
									</span>
									<KineticText
										text={b.title}
										as="h3"
										className="font-serif text-bone kin-spaced"
										style={{ fontSize: "clamp(30px, 4.2vw, 50px)", lineHeight: 1.04 }}
									/>
									<p className="font-mono text-sm leading-relaxed text-bone-muted max-w-md">
										{b.desc}
									</p>
								</div>
							</div>
						</Scroll3D>
					);
				})}
			</div>
		</section>
	);
}
