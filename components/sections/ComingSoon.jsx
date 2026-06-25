"use client";

import Image from "next/image";
import KineticText from "@/components/fx/KineticText";
import Coverflow3D from "@/components/fx/Coverflow3D";
import { IMG } from "@/components/fx/heritageImages";

const DESTINATIONS = [
	{ name: "Taj Mahal", place: "India", coord: "27.17°N 78.04°E", img: IMG.taj },
	{ name: "Colosseum", place: "Italy", coord: "41.89°N 12.49°E", img: IMG.colosseum },
	{ name: "Machu Picchu", place: "Peru", coord: "13.16°S 72.54°W", img: IMG.machu },
	{ name: "Great Wall", place: "China", coord: "40.43°N 116.57°E", img: IMG.greatWall },
	{ name: "Pyramids of Giza", place: "Egypt", coord: "29.98°N 31.13°E", img: IMG.pyramids },
	{ name: "Boudhanath Stupa", place: "Nepal", coord: "27.72°N 85.36°E", img: IMG.boudhanath },
	{ name: "Tikal", place: "Guatemala", coord: "17.22°N 89.62°W", img: "/img12.webp" },
	{ name: "Carcassonne", place: "France", coord: "43.21°N 02.36°E", img: "/img8.webp" },
];

function Card({ d, i }) {
	return (
		<article className="group relative shrink-0 w-[80vw] sm:w-[420px] snap-center will-change-transform bface-hidden">
			<div className="relative aspect-[3/4] border border-rule overflow-hidden bg-ink-2">
				<Image
					src={d.img}
					alt={`${d.name}, ${d.place}`}
					fill
					sizes="(max-width: 640px) 80vw, 420px"
					className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-ink/10" />
				<div className="absolute inset-0 border-2 border-signal/0 group-hover:border-signal/70 transition-colors duration-500" />
				<span className="absolute top-4 left-4 mono-label text-[10px] text-signal">
					{String(i + 1).padStart(2, "0")} · Coming 2026
				</span>
				<div className="absolute inset-0 flex items-center justify-center">
					<span className="flex items-center justify-center w-24 h-24 rounded-full bg-signal text-ink mono-label text-[11px] opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-500 box-glow-signal">
						View ↗
					</span>
				</div>
				<div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
					<span className="font-serif text-bone leading-none text-3xl">{d.name}</span>
					<span className="font-mono text-[10px] text-bone-muted text-right shrink-0">
						{d.place}
						<br />
						{d.coord}
					</span>
				</div>
			</div>
		</article>
	);
}

/**
 * Where Epocheye is headed. The old flat map / globe is gone — this is an
 * image-led, horizontally-scrolling roster of real heritage sites we are
 * "coming to", each tagged Coming 2026. Pins + scrubs sideways on desktop,
 * native swipe rail on mobile.
 */
export default function ComingSoon() {
	return (
		<>
			<section id="destinations" className="relative w-full bg-ink-2 px-6 sm:px-10 pt-24 sm:pt-32 pb-12">
				<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-rule pb-6 mb-12">
					<span className="mono-label text-xs text-signal">04 — Where We&apos;re Headed</span>
					<span className="mono-label text-xs text-bone-muted">5 Continents · Launching 2026</span>
				</div>
				<KineticText
					text={"We're coming\nto these."}
					as="h2"
					split="char"
					className="font-serif text-bone leading-[0.96] kin-spaced"
					style={{ fontSize: "clamp(38px, 7.5vw, 112px)" }}
				/>
				<p className="font-mono text-sm text-bone-muted max-w-xl mt-6">
					The world&apos;s monuments, rebuilt and narrated in AR. Here&apos;s where we land first —
					drag to explore the roster.
				</p>
			</section>

			<Coverflow3D className="bg-ink-2 pb-24 sm:pb-32">
				{DESTINATIONS.map((d, i) => (
					<Card key={d.name} d={d} i={i} />
				))}
			</Coverflow3D>
		</>
	);
}
