"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import KineticText from "@/components/fx/KineticText";
import { IMG } from "@/components/fx/heritageImages";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

// Each tile carries a deterministic "scattered" start pose; on scroll they fly
// in to form the grid. (x/y in %, z in px, rotations in deg.)
const TILES = [
	{ img: IMG.taj, name: "Taj Mahal", s: { x: -200, y: -130, z: -1200, rx: 60, ry: -80 } },
	{ img: IMG.colosseum, name: "Colosseum", s: { x: 0, y: -210, z: -1500, rx: 80, ry: 0 } },
	{ img: IMG.machu, name: "Machu Picchu", s: { x: 210, y: -120, z: -1150, rx: 55, ry: 80 } },
	{ img: "/img12.webp", name: "Tikal", s: { x: -240, y: 0, z: -1300, rx: 0, ry: -90 } },
	{ img: IMG.greatWall, name: "Great Wall", s: { x: 0, y: 0, z: -1700, rx: 0, ry: 0 } },
	{ img: IMG.pyramids, name: "Pyramids", s: { x: 240, y: 0, z: -1300, rx: 0, ry: 90 } },
	{ img: "/img8.webp", name: "Carcassonne", s: { x: -200, y: 150, z: -1150, rx: -58, ry: -75 } },
	{ img: IMG.boudhanath, name: "Boudhanath", s: { x: 0, y: 230, z: -1500, rx: -80, ry: 0 } },
	{ img: "/img7.webp", name: "Bagan", s: { x: 210, y: 140, z: -1150, rx: -55, ry: 80 } },
];

/**
 * "The collection" — a 3D wall of monument tiles scattered in space that
 * assemble into a grid as the section scrolls through. Each tile flies in from
 * its own depth/rotation with a stagger. Reduced-motion shows the grid flat.
 */
export default function MonumentWall() {
	const ref = useRef(null);
	const tilesRef = useRef([]);

	useGSAP(
		() => {
			const tiles = tilesRef.current.filter(Boolean);
			if (!tiles.length) return;
			if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

			tiles.forEach((t, i) => {
				const s = TILES[i].s;
				gsap.set(t, {
					xPercent: s.x,
					yPercent: s.y,
					z: s.z,
					rotationX: s.rx,
					rotationY: s.ry,
					opacity: 0,
				});
			});

			gsap.to(tiles, {
				xPercent: 0,
				yPercent: 0,
				z: 0,
				rotationX: 0,
				rotationY: 0,
				opacity: 1,
				ease: "power3.out",
				stagger: { amount: 0.5, from: "center" },
				scrollTrigger: {
					trigger: ref.current,
					start: "top 78%",
					end: "top 18%",
					scrub: 1,
				},
			});
		},
		{ scope: ref }
	);

	return (
		<section ref={ref} className="relative w-full bg-ink px-6 sm:px-10 py-24 sm:py-32 overflow-hidden">
			<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-rule pb-6 mb-12">
				<span className="mono-label text-xs text-signal">{"// The Collection"}</span>
				<span className="mono-label text-xs text-bone-muted">Assembled across the ages</span>
			</div>

			<KineticText
				text="A world, rebuilt."
				as="h2"
				split="char"
				className="font-serif text-bone mb-14 kin-spaced"
				style={{ fontSize: "clamp(38px, 7.5vw, 108px)", lineHeight: 0.94 }}
			/>

			<div className="persp">
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 tw-3d">
					{TILES.map((t, i) => (
						<div
							key={t.name}
							ref={(el) => {
								tilesRef.current[i] = el;
							}}
							className="group relative aspect-square border border-rule overflow-hidden bface-hidden will-change-transform">
							<Image
								src={t.img}
								alt={t.name}
								fill
								sizes="(max-width: 768px) 50vw, 33vw"
								className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
							<span className="absolute bottom-3 left-3 mono-label text-[10px] text-bone">{t.name}</span>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
