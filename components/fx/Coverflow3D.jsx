"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * 3D coverflow rail. The section pins and vertical scroll scrubs the track
 * sideways; every card continuously rotates in 3D toward the viewport centre
 * (rotateY + scale + Z depth) so the row reads as a rotating carousel of slabs.
 * Mobile / reduced-motion → flat native swipe rail, no pin, no tilt.
 */
export default function Coverflow3D({ children, className = "" }) {
	const sectionRef = useRef(null);
	const trackRef = useRef(null);

	useGSAP(
		() => {
			const mm = gsap.matchMedia();
			mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
				const track = trackRef.current;
				const section = sectionRef.current;
				if (!track || !section) return;
				const cards = Array.from(track.children);
				const getDistance = () => track.scrollWidth - window.innerWidth + 80;

				gsap.set(cards, { rotationY: 0, scale: 1, z: 0, transformPerspective: 1000 });
				// quickSetter (not quickTo) — direct per-frame set, no resetTo warning.
				const quick = cards.map((c) => ({
					ry: gsap.quickSetter(c, "rotationY", "deg"),
					sc: gsap.quickSetter(c, "scale"),
					z: gsap.quickSetter(c, "z", "px"),
				}));

				const applyTilt = () => {
					const cx = window.innerWidth / 2;
					cards.forEach((c, i) => {
						const r = c.getBoundingClientRect();
						const d = gsap.utils.clamp(-1, 1, (r.left + r.width / 2 - cx) / cx);
						quick[i].ry(-d * 38);
						quick[i].sc(1 - Math.abs(d) * 0.16);
						quick[i].z(-Math.abs(d) * 220);
					});
				};

				const tween = gsap.to(track, {
					x: () => -getDistance(),
					ease: "none",
					scrollTrigger: {
						trigger: section,
						start: "top top",
						end: () => "+=" + getDistance(),
						pin: true,
						scrub: 1,
						invalidateOnRefresh: true,
						anticipatePin: 1,
					},
				});

				gsap.ticker.add(applyTilt);
				return () => {
					tween.kill();
					gsap.ticker.remove(applyTilt);
				};
			});
		},
		{ scope: sectionRef }
	);

	return (
		<section ref={sectionRef} className={`relative w-full overflow-hidden ${className}`}>
			<div
				ref={trackRef}
				className="persp flex gap-6 sm:gap-10 px-6 sm:px-[12vw] overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none"
				style={{ scrollbarWidth: "none" }}>
				{children}
			</div>
		</section>
	);
}
