"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
	gsap.registerPlugin(ScrollTrigger, useGSAP);
}

/**
 * Infinite marquee whose speed and lean react to scroll velocity. Content is
 * duplicated so the -50% loop is seamless. Reduced-motion falls back to a
 * static, non-animated row (CSS also disables the keyframe fallback).
 */
export default function Marquee({ children, baseDuration = 24, className = "" }) {
	const trackRef = useRef(null);

	useGSAP(
		() => {
			const track = trackRef.current;
			if (!track) return;
			const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
			if (reduced) return;

			const loop = gsap.to(track, {
				xPercent: -50,
				repeat: -1,
				ease: "none",
				duration: baseDuration,
			});

			ScrollTrigger.create({
				start: 0,
				end: "max",
				onUpdate: (self) => {
					loop.timeScale(1 + gsap.utils.clamp(0, 6, Math.abs(self.getVelocity()) / 200));
				},
			});

			return () => loop.kill();
		},
		{ scope: trackRef }
	);

	return (
		<div className={`relative w-full overflow-hidden ${className}`}>
			<div ref={trackRef} className="inline-flex whitespace-nowrap will-change-transform">
				<span className="inline-flex shrink-0">{children}</span>
				<span className="inline-flex shrink-0" aria-hidden="true">
					{children}
				</span>
			</div>
		</div>
	);
}
