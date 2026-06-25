"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Cursor from "./Cursor";
import ScrollProgress from "./ScrollProgress";
import Spotlight from "./Spotlight";
import Preloader from "./Preloader";
import SectionNav from "./SectionNav";

if (typeof window !== "undefined") {
	gsap.registerPlugin(ScrollTrigger);
}

/**
 * Smooth-scroll spine for the landing page.
 * Wires Lenis to the GSAP ticker and keeps ScrollTrigger in sync so every
 * scroll-driven effect (kinetic type, pinned scrub, parallax) rides one
 * clock. Bails out of Lenis on reduced-motion / touch (native scroll there),
 * but ScrollTrigger still works against the native scroller.
 */
export default function SmoothScroll({ children }) {
	useEffect(() => {
		if (typeof window === "undefined") return;

		const prefersReduced =
			window.matchMedia &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const isTouch = window.matchMedia?.("(pointer: coarse)").matches;

		// On reduced-motion or touch, skip Lenis — native scroll feels better and
		// avoids address-bar resize jank. ScrollTrigger still drives reveals.
		if (prefersReduced || isTouch) {
			ScrollTrigger.refresh();
			return;
		}

		const lenis = new Lenis({
			duration: 1.1,
			easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
			smoothWheel: true,
			touchMultiplier: 1.5,
		});

		lenis.on("scroll", ScrollTrigger.update);

		const raf = (time) => lenis.raf(time * 1000);
		gsap.ticker.add(raf);
		gsap.ticker.lagSmoothing(0);

		// Expose for in-page smooth anchor scrolling (SectionNav / footer links)
		window.__lenis = lenis;

		ScrollTrigger.refresh();

		return () => {
			lenis.off("scroll", ScrollTrigger.update);
			gsap.ticker.remove(raf);
			lenis.destroy();
			if (window.__lenis === lenis) window.__lenis = null;
		};
	}, []);

	return (
		<>
			<Preloader />
			<ScrollProgress />
			<Spotlight />
			<SectionNav />
			<Cursor />
			{children}
			<div className="grain-overlay" aria-hidden="true" />
		</>
	);
}
