"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
	gsap.registerPlugin(ScrollTrigger, useGSAP);
}

/**
 * Editorial image with a trionn-style choreography:
 *  - clip-path wipe reveal as it enters the viewport
 *  - inner scale settle (1.25 → 1) on the same trigger
 *  - continuous inner parallax tied to scroll position
 *  - hover zoom
 * Reduced-motion shows the image flat and still. `className` sizes the frame
 * (give it an aspect ratio or height); fills via next/image.
 */
export default function RevealImage({
	src,
	alt = "",
	className = "",
	sizes = "(max-width: 768px) 100vw, 50vw",
	parallax = true,
	priority = false,
}) {
	const wrapRef = useRef(null);
	const paraRef = useRef(null);
	const scaleRef = useRef(null);

	useGSAP(
		() => {
			const wrap = wrapRef.current;
			const para = paraRef.current;
			const scaleEl = scaleRef.current;
			if (!wrap || !scaleEl) return;
			if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

			gsap.set(wrap, { clipPath: "inset(0% 0% 100% 0%)" });
			gsap.set(scaleEl, { scale: 1.25 });

			const tl = gsap.timeline({ scrollTrigger: { trigger: wrap, start: "top 85%" } });
			tl.to(wrap, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "power4.out" }, 0);
			tl.to(scaleEl, { scale: 1, duration: 1.3, ease: "power4.out" }, 0);

			if (parallax && para) {
				gsap.to(para, {
					yPercent: -14,
					ease: "none",
					scrollTrigger: {
						trigger: wrap,
						start: "top bottom",
						end: "bottom top",
						scrub: true,
					},
				});
			}
		},
		{ scope: wrapRef }
	);

	return (
		<div ref={wrapRef} className={`relative overflow-hidden ${className}`} data-cursor>
			<div ref={paraRef} className="absolute inset-x-0" style={{ top: "-9%", bottom: "-9%" }}>
				<div ref={scaleRef} className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.06]">
					<Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
				</div>
			</div>
		</div>
	);
}
